-- Phase 2: deal stages after the token, documents (photos and PDFs) for each stage, and the calendar.

alter table public.deals
  add column agreement_on date,   -- the day the token (Bayana) agreement is signed
  add column ndc_expected date;   -- the day the authority should approve the NDC

-- ---------------------------------------------------------------- documents

-- A file (photo or PDF) kept for a deal stage, or for a plot (for example ownership papers).
-- The file itself is in Supabase Storage, bucket "documents", at <owner_agent>/<...>.
-- Only the admins and owner_agent (the agent of the deal, or the uploader of a plot document) can see it.
create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  deal_id     uuid references public.deals (id) on delete cascade,
  plot_id     text not null,
  owner_agent uuid not null references public.members (id),
  stage       text check (stage in ('interested', 'prebooked', 'token', 'ndc_submitted', 'ndc_approved',
                                    'transfer_date', 'transfer_done', 'closed', 'plot')),
  kind        text not null check (kind in ('ownership', 'agreement', 'token_receipt', 'cnic', 'ndc', 'transfer_letter',
                                            'pay_order', 'transfer_receipt', 'allotment_letter', 'other')),
  file_name   text not null check (length(file_name) between 1 and 160),
  mime        text not null check (mime in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes  integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  path        text not null unique check (length(path) <= 300),
  note        text not null default '' check (length(note) <= 200),
  uploaded_by uuid references public.members (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index documents_deal on public.documents (deal_id);
create index documents_plot on public.documents (plot_id);

-- ---------------------------------------------------------------- calendar

-- Own calendar entries (a site visit, a meeting). Deal dates (token agreement, NDC, transfer,
-- allotment letter) come from the deals table and show in the calendar too.
create table public.events (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.members (id),
  deal_id    uuid references public.deals (id) on delete cascade,
  plot_id    text,
  title      text not null check (length(title) between 1 and 120),
  on_date    date not null,
  at_time    time,
  note       text not null default '' check (length(note) <= 400),
  done       boolean not null default false,
  created_by uuid references public.members (id) on delete set null,
  created_at timestamptz not null default now()
);
create index events_date on public.events (on_date);

create trigger audit after insert or update or delete on public.documents for each row execute function app.audit();
create trigger audit after insert or update or delete on public.events    for each row execute function app.audit();

alter table public.documents enable row level security;
alter table public.events    enable row level security;
create policy documents_read on public.documents for select to authenticated using (app.is_admin() or owner_agent = app.uid());
create policy events_read    on public.events    for select to authenticated using (app.is_admin() or agent_id = app.uid());

-- ---------------------------------------------------------------- functions

-- Move a deal to a stage and save its details. p_stage null keeps the stage.
-- p_fields may hold: agreement_on, transfer_deadline, token_amount, payment_mode, authority, ndc_submitted_on,
-- ndc_expected, ndc_approved_on, transfer_on, transfer_mode, receipt_no, allotment_expected, allotment_received, note.
create or replace function public.update_deal(p_deal_id uuid, p_stage text, p_fields jsonb default '{}')
returns void language plpgsql security definer set search_path = '' as $$
declare
  me uuid := app.require_member();
  d public.deals;
  f jsonb := coalesce(p_fields, '{}');
  v_name text;
  stages text[] := array['token', 'ndc_submitted', 'ndc_approved', 'transfer_date', 'transfer_done', 'closed'];
  labels text[] := array['Token (Bayana)', 'NDC submitted', 'NDC approved', 'Transfer date set', 'Transfer done', 'Allotment letter received, deal closed'];
begin
  select * into d from public.deals where id = p_deal_id for update;
  perform app.own_or_admin(d.agent_id);
  if d.stage = 'dropped' then raise exception 'This deal stopped.'; end if;
  if p_stage is not null and p_stage <> d.stage then
    if not (p_stage = any (stages)) then raise exception 'Unknown stage.'; end if;
    if not d.sold then raise exception 'An admin must approve the sale before the deal moves to the next stages.'; end if;
  end if;
  update public.deals set
    stage              = coalesce(p_stage, stage),
    agreement_on       = case when f ? 'agreement_on'       then nullif(f ->> 'agreement_on', '')::date       else agreement_on end,
    transfer_deadline  = case when f ? 'transfer_deadline'  then nullif(f ->> 'transfer_deadline', '')::date  else transfer_deadline end,
    token_amount       = case when f ? 'token_amount'       then nullif(f ->> 'token_amount', '')::bigint     else token_amount end,
    payment_mode       = case when f ? 'payment_mode'       then nullif(f ->> 'payment_mode', '')             else payment_mode end,
    authority          = case when f ? 'authority'          then nullif(f ->> 'authority', '')                else authority end,
    ndc_submitted_on   = case when f ? 'ndc_submitted_on'   then nullif(f ->> 'ndc_submitted_on', '')::date   else ndc_submitted_on end,
    ndc_expected       = case when f ? 'ndc_expected'       then nullif(f ->> 'ndc_expected', '')::date       else ndc_expected end,
    ndc_approved_on    = case when f ? 'ndc_approved_on'    then nullif(f ->> 'ndc_approved_on', '')::date    else ndc_approved_on end,
    transfer_on        = case when f ? 'transfer_on'        then nullif(f ->> 'transfer_on', '')::date        else transfer_on end,
    transfer_mode      = case when f ? 'transfer_mode'      then nullif(f ->> 'transfer_mode', '')            else transfer_mode end,
    receipt_no         = case when f ? 'receipt_no'         then nullif(left(f ->> 'receipt_no', 60), '')     else receipt_no end,
    allotment_expected = case when f ? 'allotment_expected' then nullif(f ->> 'allotment_expected', '')::date else allotment_expected end,
    allotment_received = case when f ? 'allotment_received' then nullif(f ->> 'allotment_received', '')::date else allotment_received end,
    note               = case when f ? 'note'               then left(coalesce(f ->> 'note', ''), 400)        else note end,
    updated_at = now()
  where id = d.id;
  if p_stage is not null and p_stage <> d.stage then
    select name into v_name from public.clients where id = d.client_id;
    perform app.log(d.plot_id, 'stage', d.plot_id || ' · ' || v_name || ': ' || labels[array_position(stages, p_stage)], d.agent_id);
    if p_stage = 'closed' then perform app.log(d.plot_id, 'closed', d.plot_id || ' deal closed'); end if;
  end if;
exception when invalid_datetime_format or datetime_field_overflow then
  raise exception 'A date is not valid.';
end $$;

-- Record a file after the app uploaded it to storage. p_deal_id null: a document of the plot.
create or replace function public.add_document(
  p_deal_id uuid, p_plot_id text, p_stage text, p_kind text, p_file_name text, p_mime text, p_size integer,
  p_path text, p_note text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require('upload_docs', 'upload documents'); d public.deals; v_owner uuid; v_plot text; v_id uuid;
begin
  if p_deal_id is not null then
    select * into d from public.deals where id = p_deal_id;
    perform app.own_or_admin(d.agent_id);
    v_owner := d.agent_id; v_plot := d.plot_id;
  else
    if not exists (select 1 from public.plots where id = p_plot_id) then raise exception 'This plot is not in our stock.'; end if;
    v_owner := me; v_plot := p_plot_id;
  end if;
  if p_path is null or split_part(p_path, '/', 1) <> v_owner::text then raise exception 'The file is in the wrong folder.'; end if;
  insert into public.documents (deal_id, plot_id, owner_agent, stage, kind, file_name, mime, size_bytes, path, note, uploaded_by)
  values (p_deal_id, v_plot, v_owner, coalesce(p_stage, case when p_deal_id is null then 'plot' end), p_kind,
          left(p_file_name, 160), p_mime, p_size, p_path, left(trim(coalesce(p_note, '')), 200), me)
  returning id into v_id;
  return v_id;
exception when check_violation then
  raise exception 'Use a photo (JPG, PNG, WebP) or a PDF of at most 10 MB.';
end $$;

-- Returns the storage path, so that the app can delete the file too.
create or replace function public.delete_document(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); r public.documents;
begin
  select * into r from public.documents where id = p_id;
  if r.id is null then raise exception 'This document does not exist.'; end if;
  if not (app.is_admin() or r.owner_agent = me or r.uploaded_by = me) then
    raise exception 'This record belongs to another agent.' using errcode = '42501';
  end if;
  delete from public.documents where id = p_id;
  return r.path;
end $$;

create or replace function public.save_event(
  p_id uuid, p_deal_id uuid, p_plot_id text, p_title text, p_on_date date, p_at_time time, p_note text, p_done boolean default false
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); v_agent uuid; v_id uuid; d public.deals;
begin
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'Add a title.'; end if;
  if p_on_date is null then raise exception 'Choose a date.'; end if;
  if p_deal_id is not null then
    select * into d from public.deals where id = p_deal_id;
    perform app.own_or_admin(d.agent_id);
  end if;
  if p_id is null then
    insert into public.events (agent_id, deal_id, plot_id, title, on_date, at_time, note, done, created_by)
    values (coalesce(d.agent_id, me), p_deal_id, coalesce(d.plot_id, nullif(p_plot_id, '')), left(trim(p_title), 120), p_on_date,
            p_at_time, left(trim(coalesce(p_note, '')), 400), coalesce(p_done, false), me)
    returning id into v_id;
  else
    select agent_id into v_agent from public.events where id = p_id;
    perform app.own_or_admin(v_agent);
    update public.events set deal_id = p_deal_id, plot_id = coalesce(d.plot_id, nullif(p_plot_id, '')), title = left(trim(p_title), 120),
           on_date = p_on_date, at_time = p_at_time, note = left(trim(coalesce(p_note, '')), 400), done = coalesce(p_done, false)
     where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public.delete_event(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); v_agent uuid;
begin
  select agent_id into v_agent from public.events where id = p_id;
  perform app.own_or_admin(v_agent);
  delete from public.events where id = p_id;
end $$;

-- ---------------------------------------------------------------- privileges

grant select on public.documents, public.events to authenticated;
revoke all on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function app.can(text) to authenticated;

-- ---------------------------------------------------------------- storage (only on Supabase)

do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') and to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('documents', 'documents', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
    on conflict (id) do nothing;
    -- the first folder of each file is the agent who owns it
    execute $p$create policy documents_files_read on storage.objects for select to authenticated
      using (bucket_id = 'documents' and (app.is_admin() or (storage.foldername(name))[1] = app.uid()::text))$p$;
    execute $p$create policy documents_files_insert on storage.objects for insert to authenticated
      with check (bucket_id = 'documents' and app.can('upload_docs') and (app.is_admin() or (storage.foldername(name))[1] = app.uid()::text))$p$;
    execute $p$create policy documents_files_delete on storage.objects for delete to authenticated
      using (bucket_id = 'documents' and (app.is_admin() or (storage.foldername(name))[1] = app.uid()::text))$p$;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.documents, public.events;
  end if;
end $$;
