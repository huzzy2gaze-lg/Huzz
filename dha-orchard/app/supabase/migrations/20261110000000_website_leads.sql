-- The public website (WH Ventures): settings that admins edit, client accounts, saved plots and enquiries.
-- The public and clients never read any sales data. An enquiry goes to the admins; an admin assigns it to an agent.

create table public.site_settings (
  key   text primary key check (key in ('company', 'phone', 'whatsapp', 'email', 'address', 'hours', 'about')),
  value text not null default '' check (length(value) <= 600)
);
insert into public.site_settings (key, value) values ('company', 'WH Ventures') on conflict do nothing;

-- A person from the public with a login (Google or e-mail link). Not a team member.
create table public.client_accounts (
  user_id    uuid primary key,
  email      text not null default '',
  full_name  text not null default '' check (length(full_name) <= 80),
  phone      text not null default '' check (length(phone) <= 40),
  created_at timestamptz not null default now()
);
create table public.saved_plots (
  user_id    uuid not null references public.client_accounts (user_id) on delete cascade,
  plot_id    text not null check (plot_id ~ '^[A-H]-[0-9]{1,4}$'),
  created_at timestamptz not null default now(),
  primary key (user_id, plot_id)
);

create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(name) between 2 and 80),
  phone       text not null default '' check (length(phone) <= 40),
  email       text not null default '' check (length(email) <= 120),
  message     text not null default '' check (length(message) <= 1000),
  plot_id     text check (plot_id is null or plot_id ~ '^[A-H]-[0-9]{1,4}$'),
  client_user uuid,
  status      text not null default 'new' check (status in ('new', 'assigned', 'contacted', 'converted', 'closed')),
  assigned_to uuid references public.members (id) on delete set null,
  assigned_by uuid references public.members (id) on delete set null,
  assigned_at timestamptz,
  client_id   uuid references public.clients (id) on delete set null,
  note        text not null default '' check (length(note) <= 400),
  created_at  timestamptz not null default now()
);
create index leads_created on public.leads (created_at desc);

create trigger audit after insert or update or delete on public.leads for each row execute function app.audit();

alter table public.site_settings   enable row level security;
alter table public.client_accounts enable row level security;
alter table public.saved_plots     enable row level security;
alter table public.leads           enable row level security;
create policy site_settings_read on public.site_settings for select to anon, authenticated using (true);
create policy client_accounts_read on public.client_accounts for select to authenticated using (user_id = auth.uid() or app.is_admin());
create policy saved_plots_read on public.saved_plots for select to authenticated using (user_id = auth.uid());
-- admins see every enquiry, the assigned agent sees theirs, a client sees their own
create policy leads_read on public.leads for select to authenticated
  using (app.is_admin() or (assigned_to is not null and assigned_to = app.uid()) or (client_user is not null and client_user = auth.uid() and not app.is_member()));

-- the admins get private notices about new enquiries (admins read every private notice)
create or replace function app.first_admin() returns uuid
language sql stable security definer set search_path = '' as $$
  select id from public.members where role = 'admin' and active order by created_at limit 1
$$;

create or replace function public.submit_enquiry(
  p_name text, p_phone text, p_email text, p_message text, p_plot_id text default null, p_website text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_phone text := trim(coalesce(p_phone, '')); v_email text := lower(trim(coalesce(p_email, ''))); v_user uuid := auth.uid();
begin
  -- a robot fills the hidden "website" field; a person never sees it
  if length(coalesce(p_website, '')) > 0 then return null; end if;
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Write your name.'; end if;
  if regexp_replace(v_phone, '[^0-9]', '', 'g') !~ '^[0-9]{7,15}$' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Write a phone number or an e-mail address, so that we can answer you.';
  end if;
  if p_plot_id is not null and p_plot_id <> '' and p_plot_id !~ '^[A-H]-[0-9]{1,4}$' then raise exception 'Not a plot number.'; end if;
  if (select count(*) from public.leads where created_at > now() - interval '1 day'
        and ((v_phone <> '' and phone = v_phone) or (v_email <> '' and email = v_email))) >= 5 then
    raise exception 'We already have your enquiries. We will contact you soon.';
  end if;
  insert into public.leads (name, phone, email, message, plot_id, client_user)
  values (left(trim(p_name), 80), left(v_phone, 40), left(v_email, 120), left(trim(coalesce(p_message, '')), 1000),
          nullif(p_plot_id, ''), case when v_user is not null and not app.is_member() then v_user end)
  returning id into v_id;
  if app.first_admin() is not null then
    insert into public.activity (actor, plot_id, kind, body, private_to)
    values (null, nullif(p_plot_id, ''), 'lead', 'New website enquiry: ' || left(trim(p_name), 80) || coalesce(' · ' || nullif(p_plot_id, ''), ''), app.first_admin());
  end if;
  return v_id;
end $$;

create or replace function public.assign_lead(p_id uuid, p_agent uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_admin(); l public.leads;
begin
  select * into l from public.leads where id = p_id for update;
  if l.id is null then raise exception 'This enquiry does not exist.'; end if;
  if not exists (select 1 from public.members where id = p_agent and active) then raise exception 'Choose an active team member.'; end if;
  update public.leads set assigned_to = p_agent, assigned_by = me, assigned_at = now(),
         status = case when status = 'new' then 'assigned' else status end where id = p_id;
  perform app.log(l.plot_id, 'lead_assigned', 'Website enquiry for you: ' || l.name || coalesce(' · ' || l.plot_id, '') || ' · from ' || app.name_of(me), p_agent);
end $$;

create or replace function public.update_lead(p_id uuid, p_status text, p_note text default null) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); l public.leads;
begin
  select * into l from public.leads where id = p_id for update;
  if l.id is null or not (app.is_admin() or coalesce(l.assigned_to = me, false)) then raise exception 'This enquiry is not assigned to you.'; end if;
  if p_status not in ('assigned', 'contacted', 'closed') then raise exception 'Unknown status.'; end if;
  update public.leads set status = p_status, note = coalesce(left(trim(p_note), 400), note) where id = p_id;
end $$;

-- Makes the enquiry a client of the assigned agent, and adds the interest in the plot when the plot is in our stock.
create or replace function public.convert_lead(p_id uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); l public.leads; v_client uuid;
begin
  select * into l from public.leads where id = p_id for update;
  if l.id is null or not (app.is_admin() or coalesce(l.assigned_to = me, false)) then raise exception 'This enquiry is not assigned to you.'; end if;
  if l.assigned_to is null then raise exception 'Assign the enquiry to an agent first.'; end if;
  if l.client_id is not null then return l.client_id; end if;
  insert into public.clients (agent_id, name, phone, note)
  values (l.assigned_to, l.name, coalesce(nullif(l.phone, ''), l.email), left('Website enquiry. ' || l.message, 400))
  returning id into v_client;
  if l.plot_id is not null and exists (select 1 from public.plots where id = l.plot_id) then
    insert into public.deals (plot_id, client_id, agent_id, note) values (l.plot_id, v_client, l.assigned_to, 'From a website enquiry');
  end if;
  update public.leads set status = 'converted', client_id = v_client where id = p_id;
  return v_client;
end $$;

-- A null uploader (a removed account) must not let any member delete a document.
create or replace function public.delete_document(p_id uuid) returns text
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); r public.documents;
begin
  select * into r from public.documents where id = p_id;
  if r.id is null then raise exception 'This document does not exist.'; end if;
  if not (app.is_admin() or r.owner_agent = me or coalesce(r.uploaded_by = me, false)) then
    raise exception 'This record belongs to another agent.' using errcode = '42501';
  end if;
  delete from public.documents where id = p_id;
  return r.path;
end $$;

-- ---------------------------------------------------------------- client accounts

create or replace function public.my_account() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then return null; end if;
  insert into public.client_accounts (user_id, email, full_name)
  values (v_user, lower(coalesce(auth.jwt() ->> 'email', '')), coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', ''))
  on conflict (user_id) do nothing;
  return (select to_jsonb(c) || jsonb_build_object('saved', coalesce((select jsonb_agg(plot_id order by created_at) from public.saved_plots where user_id = v_user), '[]'::jsonb))
          from public.client_accounts c where c.user_id = v_user);
end $$;

create or replace function public.save_my_account(p_full_name text, p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.my_account();
  update public.client_accounts set full_name = left(trim(coalesce(p_full_name, '')), 80), phone = left(trim(coalesce(p_phone, '')), 40)
   where user_id = auth.uid();
end $$;

create or replace function public.save_plot_for_later(p_plot_id text, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to save plots.'; end if;
  perform public.my_account();
  if p_on then insert into public.saved_plots (user_id, plot_id) values (auth.uid(), p_plot_id) on conflict do nothing;
  else delete from public.saved_plots where user_id = auth.uid() and plot_id = p_plot_id; end if;
end $$;

create or replace function public.save_site_settings(p_values jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_admin(); k text;
begin
  for k in select jsonb_object_keys(p_values) loop
    if k not in ('company', 'phone', 'whatsapp', 'email', 'address', 'hours', 'about') then raise exception 'Unknown setting %.', k; end if;
    insert into public.site_settings (key, value) values (k, left(coalesce(p_values ->> k, ''), 600))
    on conflict (key) do update set value = excluded.value;
  end loop;
end $$;

grant select on public.site_settings to anon, authenticated;
grant select on public.client_accounts, public.saved_plots, public.leads to authenticated;
revoke all on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.submit_enquiry(text, text, text, text, text, text) to anon;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.leads;
  end if;
end $$;
