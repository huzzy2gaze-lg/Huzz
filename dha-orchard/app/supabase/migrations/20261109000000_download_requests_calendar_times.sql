-- Protected documents: agents view documents inside the app only. To download a file, an agent asks,
-- and an admin approves. Each approval allows one download. Screenshot attempts that the app detects
-- are reported to the admins. Calendar entries get an end time.

alter table public.events add column end_time time;

create table public.download_requests (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents (id) on delete cascade,
  requested_by uuid not null references public.members (id),
  reason       text not null default '' check (length(reason) <= 200),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'used')),
  decided_by   uuid references public.members (id) on delete set null,
  decided_at   timestamptz,
  used_at      timestamptz,
  created_at   timestamptz not null default now()
);
create unique index download_requests_one_open on public.download_requests (document_id, requested_by) where status in ('pending', 'approved');

create trigger audit after insert or update or delete on public.download_requests for each row execute function app.audit();
alter table public.download_requests enable row level security;
create policy download_requests_read on public.download_requests for select to authenticated
  using (app.is_admin() or requested_by = app.uid());

create or replace function app.doc_label(p_id uuid) returns text
language sql stable security definer set search_path = '' as $$
  select case d.kind when 'lp_letter' then 'LP letter' when 'agreement' then 'Agreement' when 'token_receipt' then 'Token payment proof'
    when 'cnic' then 'CNIC copy' when 'ndc_application' then 'NDC application' when 'ndc' then 'NDC' when 'transfer_letter' then 'Transfer date letter'
    when 'pay_order' then 'Pay order' when 'transfer_receipt' then 'Authority receipt' when 'allotment_letter' then 'Allotment letter' else 'Document' end
    || ' of ' || d.plot_id
  from public.documents d where d.id = p_id
$$;

create or replace function app.can_see_document(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.documents d where d.id = p_id and (app.is_admin() or d.owner_agent = app.uid() or d.uploaded_by = app.uid()))
$$;

create or replace function public.request_download(p_document_id uuid, p_reason text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); v_id uuid;
begin
  if not app.can_see_document(p_document_id) then raise exception 'This document does not exist.'; end if;
  if app.is_admin() then raise exception 'Admins can download without a request.'; end if;
  if exists (select 1 from public.download_requests where document_id = p_document_id and requested_by = me and status = 'pending') then
    raise exception 'Your request for this document is already waiting.';
  end if;
  if exists (select 1 from public.download_requests where document_id = p_document_id and requested_by = me and status = 'approved') then
    raise exception 'Your request is already approved. Download the file.';
  end if;
  insert into public.download_requests (document_id, requested_by, reason) values (p_document_id, me, left(trim(coalesce(p_reason, '')), 200))
  returning id into v_id;
  perform app.log((select plot_id from public.documents where id = p_document_id), 'download_request',
                  'Download request: ' || app.doc_label(p_document_id) || ' · by ' || app.name_of(me), me);
  return v_id;
end $$;

create or replace function public.decide_download(p_id uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_admin(); r public.download_requests;
begin
  select * into r from public.download_requests where id = p_id for update;
  if r.id is null or r.status <> 'pending' then raise exception 'This request is already closed.'; end if;
  update public.download_requests set status = case when p_approve then 'approved' else 'rejected' end,
         decided_by = me, decided_at = now(), reason = coalesce(nullif(trim(p_reason), ''), reason)
   where id = p_id;
  perform app.log((select plot_id from public.documents where id = r.document_id), 'download_decision',
                  case when p_approve then 'Download approved: ' else 'Download not approved: ' end || app.doc_label(r.document_id)
                  || ' · by ' || app.name_of(me), r.requested_by);
end $$;

-- Uses an approved request (one download) and gives the file's storage path.
create or replace function public.use_download(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); r public.download_requests; v_path text;
begin
  select * into r from public.download_requests where id = p_id for update;
  if r.id is null or r.requested_by <> me then raise exception 'This request does not exist.'; end if;
  if r.status <> 'approved' then raise exception 'An admin must approve the download first.'; end if;
  update public.download_requests set status = 'used', used_at = now() where id = p_id;
  select path into v_path from public.documents where id = r.document_id;
  perform app.log((select plot_id from public.documents where id = r.document_id), 'download',
                  'Downloaded: ' || app.doc_label(r.document_id) || ' · by ' || app.name_of(me), me);
  return v_path;
end $$;

-- Events the app reports while a document is open: a download by an admin, or a screenshot key.
create or replace function public.report_document_event(p_document_id uuid, p_event text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member();
begin
  if not app.can_see_document(p_document_id) then return; end if;
  if p_event not in ('screenshot_key', 'download', 'print') then raise exception 'Unknown event.'; end if;
  perform app.log((select plot_id from public.documents where id = p_document_id), 'doc_' || p_event,
    case p_event when 'screenshot_key' then 'Screenshot key pressed on ' when 'print' then 'Print tried on ' else 'Downloaded: ' end
    || app.doc_label(p_document_id) || ' · by ' || app.name_of(me), me);
end $$;

drop function public.save_event(uuid, uuid, text, text, date, time, text, boolean);
create or replace function public.save_event(
  p_id uuid, p_deal_id uuid, p_plot_id text, p_title text, p_on_date date, p_at_time time, p_note text,
  p_done boolean default false, p_end_time time default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); v_agent uuid; v_id uuid; d public.deals;
begin
  if length(trim(coalesce(p_title, ''))) = 0 then raise exception 'Add a title.'; end if;
  if p_on_date is null then raise exception 'Choose a date.'; end if;
  if p_end_time is not null and (p_at_time is null or p_end_time <= p_at_time) then raise exception 'The end time must be after the start time.'; end if;
  if p_deal_id is not null then
    select * into d from public.deals where id = p_deal_id;
    perform app.own_or_admin(d.agent_id);
  end if;
  if p_id is null then
    insert into public.events (agent_id, deal_id, plot_id, title, on_date, at_time, end_time, note, done, created_by)
    values (coalesce(d.agent_id, me), p_deal_id, coalesce(d.plot_id, nullif(p_plot_id, '')), left(trim(p_title), 120), p_on_date,
            p_at_time, p_end_time, left(trim(coalesce(p_note, '')), 400), coalesce(p_done, false), me)
    returning id into v_id;
  else
    select agent_id into v_agent from public.events where id = p_id;
    perform app.own_or_admin(v_agent);
    update public.events set deal_id = p_deal_id, plot_id = coalesce(d.plot_id, nullif(p_plot_id, '')), title = left(trim(p_title), 120),
           on_date = p_on_date, at_time = p_at_time, end_time = p_end_time, note = left(trim(coalesce(p_note, '')), 400), done = coalesce(p_done, false)
     where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

grant select on public.download_requests to authenticated;
revoke all on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.download_requests;
  end if;
end $$;
