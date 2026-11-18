-- Orchard Sales System: database, access rules and server functions.
--
-- Security model
--   * A person can use the system only when an admin added their e-mail to public.members
--     and the account is active. Login is "Sign in with Google" (Supabase Auth); the e-mail
--     in the login token is matched to public.members.
--   * Tables are read through row level security (RLS). Nobody writes to a table directly:
--     every change goes through a server function below, which checks the role and the
--     permission switches, and writes the change log.
--   * Agents see only their own clients, deals, requests and dealer-listing owners.
--     Admins see everything.

create schema if not exists app;

-- ---------------------------------------------------------------- tables

create table public.members (
  id               uuid primary key default gen_random_uuid(),
  email            text not null unique check (email = lower(email) and email like '%_@_%._%'),
  full_name        text not null default '' check (length(full_name) <= 80),
  phone            text not null default '' check (length(phone) <= 40),
  role             text not null default 'agent' check (role in ('admin', 'agent')),
  active           boolean not null default true,
  can_edit_price   boolean not null default false,
  can_add_plots    boolean not null default false,
  can_add_listings boolean not null default false,
  can_mark_sold    boolean not null default true,
  can_upload_docs  boolean not null default true,
  can_export       boolean not null default false,
  color            text not null default '#6E8B7B',
  created_at       timestamptz not null default now(),
  created_by       uuid references public.members (id) on delete set null
);

-- Plots that are in our stock (own plots and dealer listings). The geometry of every plot
-- comes from the official layout plan (plotdata.json in the web app), not from this table.
create table public.plots (
  id          text primary key check (id ~ '^[A-H]-[0-9]{1,4}$'),
  block       text not null check (block ~ '^[A-H]$'),
  num         integer not null check (num > 0 and num < 10000),
  size        text not null check (size in ('1K', '14M', '10M', 'X')),
  kind        text not null default 'own' check (kind in ('own', 'listing')),
  status      text not null default 'available'
              check (status in ('available', 'prebooked', 'sold_pending', 'sold')),
  price       numeric(8, 2) check (price > 0 and price < 1000),        -- asking price, crore PKR
  tags        text[] not null default '{}',
  note        text not null default '' check (length(note) <= 400),
  holder_deal uuid,                                                     -- the deal that holds a pre-booking or sale
  added_by    uuid references public.members (id) on delete set null,
  updated_by  uuid references public.members (id) on delete set null,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now(),
  check (id = block || '-' || num)
);

-- Corrections to the plan: a plot number that the plan reading missed or got wrong, or a size.
-- key = "<block>-p<x*10>_<y*10>", the plot's centre on the plan.
create table public.plot_fixes (
  key        text primary key check (key ~ '^[A-H]-p[0-9]+_[0-9]+$'),
  n          integer check (n > 0 and n < 10000),
  size       text check (size in ('1K', '14M', '10M', 'X')),
  updated_by uuid references public.members (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Private details of a dealer listing (a plot that a client owns and we help to sell).
create table public.listing_owners (
  plot_id      text primary key references public.plots (id) on delete cascade,
  agent_id     uuid not null references public.members (id),
  owner_name   text not null default '' check (length(owner_name) <= 80),
  owner_phone  text not null default '' check (length(owner_phone) <= 40),
  owner_demand numeric(8, 2) check (owner_demand > 0 and owner_demand < 1000),
  commission   text not null default '' check (length(commission) <= 80),
  note         text not null default '' check (length(note) <= 400),
  updated_at   timestamptz not null default now()
);

create table public.clients (
  id         uuid primary key default gen_random_uuid(),
  agent_id   uuid not null references public.members (id),
  name       text not null check (length(name) between 1 and 80),
  phone      text not null default '' check (length(phone) <= 40),
  cnic       text not null default '' check (length(cnic) <= 20),
  note       text not null default '' check (length(note) <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One client's interest in one plot, and the deal that follows.
create table public.deals (
  id                 uuid primary key default gen_random_uuid(),
  plot_id            text not null references public.plots (id) on delete cascade,
  client_id          uuid not null references public.clients (id) on delete cascade,
  agent_id           uuid not null references public.members (id),
  stage              text not null default 'interested' check (stage in (
                       'interested', 'prebooked', 'token', 'ndc_submitted', 'ndc_approved',
                       'transfer_date', 'transfer_done', 'closed', 'dropped')),
  sold               boolean not null default false,               -- an admin approved the sale
  sale_price         numeric(8, 2) check (sale_price > 0 and sale_price < 1000),   -- crore PKR
  token_amount       bigint check (token_amount >= 0),             -- PKR
  payment_mode       text check (payment_mode in ('cash', 'bank_transfer', 'pay_order', 'cheque', 'other')),
  transfer_deadline  date,
  authority          text check (authority in ('FGEHA', 'CDA', 'Housing Foundation', 'DHA', 'Other')),
  ndc_submitted_on   date,
  ndc_approved_on    date,
  transfer_on        date,
  transfer_mode      text check (transfer_mode in ('pay_order', 'bank_transfer', 'cash', 'other')),
  receipt_no         text check (length(receipt_no) <= 60),
  allotment_expected date,
  allotment_received date,
  drop_reason        text check (length(drop_reason) <= 200),
  note               text not null default '' check (length(note) <= 400),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (plot_id, client_id)
);

alter table public.plots
  add constraint plots_holder_deal_fkey foreign key (holder_deal) references public.deals (id) on delete set null;

-- Requests that an admin approves: a pre-booking or a sale.
create table public.requests (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null check (kind in ('prebook', 'sale')),
  deal_id           uuid not null references public.deals (id) on delete cascade,
  plot_id           text not null references public.plots (id) on delete cascade,
  agent_id          uuid not null references public.members (id),
  sale_price        numeric(8, 2) check (sale_price > 0 and sale_price < 1000),
  token_amount      bigint check (token_amount >= 0),
  payment_mode      text check (payment_mode in ('cash', 'bank_transfer', 'pay_order', 'cheque', 'other')),
  transfer_deadline date,
  note              text not null default '' check (length(note) <= 400),
  prev_status       text,
  prev_holder       uuid,
  status            text not null default 'pending'
                    check (status in ('pending', 'approved', 'rejected', 'cancelled', 'closed')),
  decided_by        uuid references public.members (id) on delete set null,
  decided_at        timestamptz,
  reason            text check (length(reason) <= 200),
  created_at        timestamptz not null default now()
);
create unique index requests_one_pending_per_deal on public.requests (deal_id, kind) where status = 'pending';

-- Change feed for the notices at the top of the screen.
-- private_to = null: everyone sees it. Otherwise only that agent and the admins see it.
create table public.activity (
  id         bigserial primary key,
  at         timestamptz not null default now(),
  actor      uuid references public.members (id) on delete set null,
  plot_id    text,
  kind       text not null,
  body       text not null,
  private_to uuid references public.members (id) on delete cascade
);
create index activity_at on public.activity (at desc);

-- Full change log for the admins. Every insert, update and delete on the main tables.
create table public.audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor       uuid,
  actor_email text,
  tbl         text not null,
  op          text not null,
  row_id      text,
  old_row     jsonb,
  new_row     jsonb
);
create index audit_log_at on public.audit_log (at desc);

create index deals_plot on public.deals (plot_id);
create index deals_agent on public.deals (agent_id);
create index clients_agent on public.clients (agent_id);
create index requests_status on public.requests (status);

-- ---------------------------------------------------------------- helpers

create or replace function app.email() returns text
language sql stable set search_path = '' as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function app.member() returns public.members
language sql stable security definer set search_path = '' as $$
  select m.* from public.members m where m.email = app.email() and m.active limit 1
$$;

create or replace function app.uid() returns uuid
language sql stable security definer set search_path = '' as $$
  select (app.member()).id
$$;

create or replace function app.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select app.uid() is not null
$$;

create or replace function app.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((app.member()).role = 'admin', false)
$$;

-- A permission switch. Admins have every permission.
create or replace function app.can(p_perm text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare m public.members := app.member();
begin
  if m.id is null then return false; end if;
  if m.role = 'admin' then return true; end if;
  return case p_perm
    when 'edit_price'   then m.can_edit_price
    when 'add_plots'    then m.can_add_plots
    when 'add_listings' then m.can_add_listings
    when 'mark_sold'    then m.can_mark_sold
    when 'upload_docs'  then m.can_upload_docs
    when 'export'       then m.can_export
    else false end;
end $$;

create or replace function app.require_member() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := app.uid();
begin
  if v is null then
    raise exception 'Your account is not active. Ask an admin to add your e-mail.' using errcode = '42501';
  end if;
  return v;
end $$;

create or replace function app.require(p_perm text, p_what text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := app.require_member();
begin
  if not app.can(p_perm) then
    raise exception 'You do not have permission to %. Ask an admin.', p_what using errcode = '42501';
  end if;
  return v;
end $$;

create or replace function app.require_admin() returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid := app.require_member();
begin
  if not app.is_admin() then
    raise exception 'Only an admin can do this.' using errcode = '42501';
  end if;
  return v;
end $$;

create or replace function app.log(p_plot text, p_kind text, p_body text, p_private_to uuid default null)
returns void language sql security definer set search_path = '' as $$
  insert into public.activity (actor, plot_id, kind, body, private_to)
  values (app.uid(), p_plot, p_kind, p_body, p_private_to)
$$;

create or replace function app.cr(p numeric) returns text
language sql immutable set search_path = '' as $$
  select to_char(p, 'FM9990.00') || ' Cr'
$$;

create or replace function app.size_label(p text) returns text
language sql immutable set search_path = '' as $$
  select case p when '1K' then '1 Kanal' when '14M' then '14 Marla' when '10M' then '10 Marla'
                when 'X' then 'corner or irregular' else p end
$$;

create or replace function app.status_label(p text) returns text
language sql immutable set search_path = '' as $$
  select case p when 'available' then 'available' when 'prebooked' then 'pre-booked'
                when 'sold_pending' then 'sold, waiting for approval' when 'sold' then 'sold' else p end
$$;

create or replace function app.name_of(p uuid) returns text
language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(m.full_name, ''), split_part(m.email, '@', 1)) from public.members m where m.id = p
$$;

create or replace function app.audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare r jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
begin
  insert into public.audit_log (actor, actor_email, tbl, op, row_id, old_row, new_row)
  values (app.uid(), nullif(app.email(), ''), tg_table_name, tg_op,
          coalesce(r ->> 'id', r ->> 'key', r ->> 'plot_id'),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

create trigger audit after insert or update or delete on public.members        for each row execute function app.audit();
create trigger audit after insert or update or delete on public.plots          for each row execute function app.audit();
create trigger audit after insert or update or delete on public.plot_fixes     for each row execute function app.audit();
create trigger audit after insert or update or delete on public.listing_owners for each row execute function app.audit();
create trigger audit after insert or update or delete on public.clients        for each row execute function app.audit();
create trigger audit after insert or update or delete on public.deals          for each row execute function app.audit();
create trigger audit after insert or update or delete on public.requests       for each row execute function app.audit();

-- ---------------------------------------------------------------- read access (RLS)

alter table public.members        enable row level security;
alter table public.plots          enable row level security;
alter table public.plot_fixes     enable row level security;
alter table public.listing_owners enable row level security;
alter table public.clients        enable row level security;
alter table public.deals          enable row level security;
alter table public.requests       enable row level security;
alter table public.activity       enable row level security;
alter table public.audit_log      enable row level security;

create policy members_read   on public.members        for select to authenticated using (app.is_admin() or id = app.uid());
create policy plots_read     on public.plots          for select to authenticated using (app.is_member());
create policy fixes_read     on public.plot_fixes     for select to authenticated using (app.is_member());
create policy owners_read    on public.listing_owners for select to authenticated using (app.is_admin() or agent_id = app.uid());
create policy clients_read   on public.clients        for select to authenticated using (app.is_admin() or agent_id = app.uid());
create policy deals_read     on public.deals          for select to authenticated using (app.is_admin() or agent_id = app.uid());
create policy requests_read  on public.requests       for select to authenticated using (app.is_admin() or agent_id = app.uid());
create policy activity_read  on public.activity       for select to authenticated
  using (app.is_member() and (private_to is null or private_to = app.uid() or app.is_admin()));
create policy audit_read     on public.audit_log      for select to authenticated using (app.is_admin());

-- Names and colours of the team, for "updated by" lines. No e-mail, phone or permissions.
create view public.people as
  select id, coalesce(nullif(full_name, ''), split_part(email, '@', 1)) as name, role, color, active
  from public.members where app.is_member();

-- How many clients are interested in each plot. Counts only, no names.
create view public.plot_demand as
  select plot_id, count(*)::int as interested
  from public.deals where stage <> 'dropped' and app.is_member()
  group by plot_id;

-- ---------------------------------------------------------------- functions: account

-- The signed-in member, or null when the e-mail is not active in the team list.
create or replace function public.me() returns jsonb
language sql stable security definer set search_path = '' as $$
  select to_jsonb(m) - 'created_by' from public.members m where m.id = app.uid()
$$;

create or replace function public.save_member(
  p_id uuid, p_email text, p_full_name text, p_phone text, p_role text, p_active boolean, p_perms jsonb default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  me uuid := app.require_admin();
  v_id uuid;
  v_email text := lower(trim(coalesce(p_email, '')));
  palette text[] := array['#2F6F8F','#8F4A2F','#5B7F2F','#7A3F8F','#2F8F7A','#8F7A2F','#3F4F8F','#8F2F5B'];
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Enter a valid e-mail address.'; end if;
  if p_role not in ('admin', 'agent') then raise exception 'The role must be admin or agent.'; end if;
  if p_id is null then
    insert into public.members (email, full_name, phone, role, active, can_edit_price, can_add_plots,
                                can_add_listings, can_mark_sold, can_upload_docs, can_export, color, created_by)
    values (v_email, trim(coalesce(p_full_name, '')), trim(coalesce(p_phone, '')), p_role, coalesce(p_active, true),
            coalesce((p_perms ->> 'can_edit_price')::boolean, false),
            coalesce((p_perms ->> 'can_add_plots')::boolean, false),
            coalesce((p_perms ->> 'can_add_listings')::boolean, false),
            coalesce((p_perms ->> 'can_mark_sold')::boolean, true),
            coalesce((p_perms ->> 'can_upload_docs')::boolean, true),
            coalesce((p_perms ->> 'can_export')::boolean, false),
            palette[1 + (select count(*) from public.members) % array_length(palette, 1)], me)
    returning id into v_id;
  else
    update public.members set
      email = v_email, full_name = trim(coalesce(p_full_name, '')), phone = trim(coalesce(p_phone, '')),
      role = p_role, active = coalesce(p_active, true),
      can_edit_price   = coalesce((p_perms ->> 'can_edit_price')::boolean, can_edit_price),
      can_add_plots    = coalesce((p_perms ->> 'can_add_plots')::boolean, can_add_plots),
      can_add_listings = coalesce((p_perms ->> 'can_add_listings')::boolean, can_add_listings),
      can_mark_sold    = coalesce((p_perms ->> 'can_mark_sold')::boolean, can_mark_sold),
      can_upload_docs  = coalesce((p_perms ->> 'can_upload_docs')::boolean, can_upload_docs),
      can_export       = coalesce((p_perms ->> 'can_export')::boolean, can_export)
    where id = p_id returning id into v_id;
    if v_id is null then raise exception 'This account does not exist.'; end if;
  end if;
  if not exists (select 1 from public.members where role = 'admin' and active) then
    raise exception 'The team must keep at least one active admin.';
  end if;
  return v_id;
exception when unique_violation then
  raise exception 'An account with this e-mail already exists.';
end $$;

-- ---------------------------------------------------------------- functions: plots

-- Add plots to our stock. p_items = [{"id":"A-540","size":"1K"}, ...]
create or replace function public.add_plots(
  p_items jsonb, p_price numeric, p_kind text default 'own', p_tags text[] default '{}', p_note text default ''
) returns integer language plpgsql security definer set search_path = '' as $$
declare
  me uuid;
  it jsonb;
  v_id text;
  n integer := 0;
begin
  if p_kind = 'listing' then me := app.require('add_listings', 'add dealer listings');
  elsif p_kind = 'own' then me := app.require('add_plots', 'add plots');
  else raise exception 'Unknown plot type.'; end if;
  if p_price is null or p_price <= 0 or p_price >= 1000 then raise exception 'Enter a price in crore, for example 4.10.'; end if;
  for it in select * from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) loop
    v_id := it ->> 'id';
    if v_id is null or v_id !~ '^[A-H]-[0-9]{1,4}$' then raise exception 'Not a plot number: %', coalesce(v_id, ''); end if;
    insert into public.plots (id, block, num, size, kind, price, tags, note, added_by, updated_by)
    values (v_id, split_part(v_id, '-', 1), split_part(v_id, '-', 2)::int, coalesce(it ->> 'size', '10M'), p_kind,
            round(p_price, 2), coalesce(p_tags, '{}'), left(trim(coalesce(p_note, '')), 400), me, me)
    on conflict (id) do nothing;
    if found then
      n := n + 1;
      perform app.log(v_id, 'added', v_id || case when p_kind = 'listing' then ' added as a dealer listing · ' else ' added to our plots · ' end || app.cr(round(p_price, 2)));
    end if;
  end loop;
  return n;
end $$;

create or replace function public.set_price(p_ids text[], p_price numeric) returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require('edit_price', 'change prices'); r record; n integer := 0;
begin
  if p_price is null or p_price <= 0 or p_price >= 1000 then raise exception 'Enter a price in crore, for example 4.10.'; end if;
  for r in select id, price from public.plots where id = any (p_ids) and price is distinct from round(p_price, 2) for update loop
    update public.plots set price = round(p_price, 2), updated_by = me, updated_at = now() where id = r.id;
    perform app.log(r.id, 'price', r.id || ' price ' || coalesce(app.cr(r.price), '—') || ' → ' || app.cr(round(p_price, 2)));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.set_size(p_ids text[], p_size text) returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require('add_plots', 'change plot sizes'); r record; n integer := 0;
begin
  if p_size not in ('1K', '14M', '10M', 'X') then raise exception 'Unknown plot size.'; end if;
  for r in select id from public.plots where id = any (p_ids) and size <> p_size for update loop
    update public.plots set size = p_size, updated_by = me, updated_at = now() where id = r.id;
    perform app.log(r.id, 'size', r.id || ' size set to ' || app.size_label(p_size));
    n := n + 1;
  end loop;
  return n;
end $$;

-- Correct a plot number or a size on the plan. A null value keeps the value that is there.
create or replace function public.save_fix(p_key text, p_n integer, p_size text, p_plot_label text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require('add_plots', 'correct the plan');
begin
  if p_n is not null and (p_n <= 0 or p_n >= 10000) then raise exception 'Enter a plot number, for example 142.'; end if;
  if p_size is not null and p_size not in ('1K', '14M', '10M', 'X') then raise exception 'Unknown plot size.'; end if;
  insert into public.plot_fixes (key, n, size, updated_by)
  values (p_key, p_n, p_size, me)
  on conflict (key) do update set n = coalesce(excluded.n, public.plot_fixes.n),
                                  size = coalesce(excluded.size, public.plot_fixes.size),
                                  updated_by = me, updated_at = now();
  if p_n is not null then
    perform app.log(split_part(p_key, '-', 1) || '-' || p_n, 'fix', 'Plot number set: ' || split_part(p_key, '-', 1) || '-' || p_n);
  end if;
end $$;

-- Tags and notes on a plot: every active member can change them.
create or replace function public.set_tag(p_ids text[], p_tag text, p_on boolean) returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); r record; n integer := 0;
begin
  if p_tag is null or length(trim(p_tag)) = 0 or length(p_tag) > 40 then raise exception 'Not a valid tag.'; end if;
  for r in select id, tags from public.plots where id = any (p_ids) for update loop
    if p_on and not (p_tag = any (r.tags)) then
      update public.plots set tags = r.tags || p_tag, updated_by = me, updated_at = now() where id = r.id;
    elsif not p_on and p_tag = any (r.tags) then
      update public.plots set tags = array_remove(r.tags, p_tag), updated_by = me, updated_at = now() where id = r.id;
    else continue; end if;
    perform app.log(r.id, 'notes', r.id || ' notes updated');
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.set_note(p_id text, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member();
begin
  update public.plots set note = left(trim(coalesce(p_note, '')), 400), updated_by = me, updated_at = now() where id = p_id;
  if not found then raise exception 'This plot is not in our stock.'; end if;
  perform app.log(p_id, 'notes', p_id || ' notes updated');
end $$;

-- Close the pending requests of a plot, and give back a held deal its earlier stage.
create or replace function app.release_plot(p_id text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_holder uuid;
begin
  select holder_deal into v_holder from public.plots where id = p_id;
  update public.requests set status = 'closed', reason = p_reason, decided_by = app.uid(), decided_at = now()
   where plot_id = p_id and status = 'pending';
  if v_holder is not null then
    update public.deals set stage = 'interested', updated_at = now()
     where id = v_holder and stage = 'prebooked' and not sold;
  end if;
end $$;

-- Direct status change by an admin, for example a plot sold outside the system.
create or replace function public.set_status(p_ids text[], p_status text) returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_admin(); r record; n integer := 0;
begin
  if p_status not in ('available', 'prebooked', 'sold') then raise exception 'Unknown status.'; end if;
  for r in select id, status from public.plots where id = any (p_ids) and status <> p_status for update loop
    if p_status = 'available' or r.status = 'sold_pending' then
      perform app.release_plot(r.id, 'The admin changed the plot status.');
      update public.plots set holder_deal = null where id = r.id;
    end if;
    update public.plots set status = p_status, updated_by = me, updated_at = now() where id = r.id;
    perform app.log(r.id, 'status', r.id || ' marked ' || app.status_label(p_status));
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.remove_plots(p_ids text[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_admin(); r record; n integer := 0;
begin
  if exists (select 1 from public.plots where id = any (p_ids) and status in ('sold', 'sold_pending')) then
    raise exception 'A sold plot keeps its records. You cannot remove it.';
  end if;
  for r in select id from public.plots where id = any (p_ids) loop
    delete from public.plots where id = r.id;
    perform app.log(r.id, 'removed', r.id || ' removed from our plots');
    n := n + 1;
  end loop;
  return n;
end $$;

-- A plot that we sold becomes a dealer listing for its new owner.
create or replace function public.relist_plot(p_id text, p_price numeric) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require('add_listings', 'add dealer listings');
begin
  if p_price is null or p_price <= 0 or p_price >= 1000 then raise exception 'Enter a price in crore, for example 4.10.'; end if;
  update public.plots set kind = 'listing', status = 'available', holder_deal = null, price = round(p_price, 2),
                          updated_by = me, updated_at = now()
   where id = p_id and status = 'sold';
  if not found then raise exception 'Only a sold plot can become a dealer listing.'; end if;
  perform app.log(p_id, 'relisted', p_id || ' listed again for its owner · ' || app.cr(round(p_price, 2)));
end $$;

create or replace function public.save_listing_owner(
  p_plot_id text, p_owner_name text, p_owner_phone text, p_owner_demand numeric, p_commission text, p_note text
) returns void language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require('add_listings', 'add dealer listings'); v_agent uuid;
begin
  if not exists (select 1 from public.plots where id = p_plot_id and kind = 'listing') then
    raise exception 'This plot is not a dealer listing.';
  end if;
  select agent_id into v_agent from public.listing_owners where plot_id = p_plot_id;
  if v_agent is not null and v_agent <> me and not app.is_admin() then
    raise exception 'Another agent manages this listing.' using errcode = '42501';
  end if;
  insert into public.listing_owners (plot_id, agent_id, owner_name, owner_phone, owner_demand, commission, note)
  values (p_plot_id, coalesce(v_agent, me), left(trim(coalesce(p_owner_name, '')), 80), left(trim(coalesce(p_owner_phone, '')), 40),
          p_owner_demand, left(trim(coalesce(p_commission, '')), 80), left(trim(coalesce(p_note, '')), 400))
  on conflict (plot_id) do update set owner_name = excluded.owner_name, owner_phone = excluded.owner_phone,
    owner_demand = excluded.owner_demand, commission = excluded.commission, note = excluded.note, updated_at = now();
end $$;

-- ---------------------------------------------------------------- functions: clients and deals

create or replace function app.own_or_admin(p_agent uuid) returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if p_agent is null or (p_agent <> app.uid() and not app.is_admin()) then
    raise exception 'This record belongs to another agent.' using errcode = '42501';
  end if;
end $$;

create or replace function public.save_client(p_id uuid, p_name text, p_phone text, p_cnic text, p_note text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); v_id uuid; v_agent uuid;
begin
  if length(trim(coalesce(p_name, ''))) = 0 then raise exception 'Add the client''s name.'; end if;
  if p_id is null then
    insert into public.clients (agent_id, name, phone, cnic, note)
    values (me, left(trim(p_name), 80), left(trim(coalesce(p_phone, '')), 40), left(trim(coalesce(p_cnic, '')), 20),
            left(trim(coalesce(p_note, '')), 400))
    returning id into v_id;
  else
    select agent_id into v_agent from public.clients where id = p_id;
    perform app.own_or_admin(v_agent);
    update public.clients set name = left(trim(p_name), 80), phone = left(trim(coalesce(p_phone, '')), 40),
      cnic = left(trim(coalesce(p_cnic, '')), 20), note = left(trim(coalesce(p_note, '')), 400), updated_at = now()
     where id = p_id returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public.delete_client(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); v_agent uuid;
begin
  select agent_id into v_agent from public.clients where id = p_id;
  perform app.own_or_admin(v_agent);
  if exists (select 1 from public.deals d where d.client_id = p_id and (d.sold or d.stage not in ('interested', 'dropped')))
     or exists (select 1 from public.requests r join public.deals d on d.id = r.deal_id where d.client_id = p_id and r.status = 'pending') then
    raise exception 'This client has a pre-booking, a sale or a request. Stop the deal first.';
  end if;
  delete from public.clients where id = p_id;
end $$;

-- A client is interested in a plot.
create or replace function public.add_interest(p_client_id uuid, p_plot_id text, p_note text default '')
returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); v_agent uuid; v_name text; v_id uuid; v_stage text;
begin
  select agent_id, name into v_agent, v_name from public.clients where id = p_client_id;
  perform app.own_or_admin(v_agent);
  if not exists (select 1 from public.plots where id = p_plot_id) then raise exception 'This plot is not in our stock.'; end if;
  select id, stage into v_id, v_stage from public.deals where client_id = p_client_id and plot_id = p_plot_id;
  if v_id is not null and v_stage <> 'dropped' then raise exception 'This client is already on this plot.'; end if;
  if v_id is not null then
    update public.deals set stage = 'interested', drop_reason = null, note = left(trim(coalesce(p_note, '')), 400), updated_at = now() where id = v_id;
  else
    insert into public.deals (plot_id, client_id, agent_id, note)
    values (p_plot_id, p_client_id, v_agent, left(trim(coalesce(p_note, '')), 400)) returning id into v_id;
  end if;
  perform app.log(p_plot_id, 'interest', 'New client interest on ' || p_plot_id);
  perform app.log(p_plot_id, 'interest_private', v_name || ' is interested in ' || p_plot_id, v_agent);
  return v_id;
end $$;

-- Stop a deal. The plot becomes available again when this deal held it.
create or replace function public.drop_deal(p_deal_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); d public.deals; v_plot public.plots; v_name text;
begin
  select * into d from public.deals where id = p_deal_id for update;
  perform app.own_or_admin(d.agent_id);
  if d.stage = 'dropped' then return; end if;
  if d.sold and not app.is_admin() then raise exception 'Only an admin can stop a sold deal.' using errcode = '42501'; end if;
  select * into v_plot from public.plots where id = d.plot_id for update;
  update public.requests set status = 'cancelled', decided_by = me, decided_at = now(), reason = 'The deal stopped.'
   where deal_id = d.id and status = 'pending';
  if v_plot.holder_deal = d.id then
    update public.plots set status = 'available', holder_deal = null, updated_by = me, updated_at = now() where id = d.plot_id;
    perform app.log(d.plot_id, 'status', d.plot_id || ' is available again');
  end if;
  update public.deals set stage = 'dropped', sold = false, drop_reason = left(trim(coalesce(p_reason, '')), 200), updated_at = now()
   where id = d.id;
  select name into v_name from public.clients where id = d.client_id;
  perform app.log(d.plot_id, 'dropped', v_name || ' is no longer on ' || d.plot_id, d.agent_id);
end $$;

-- ---------------------------------------------------------------- functions: approvals

create or replace function app.decide(p_req uuid, p_approve boolean, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  me uuid := app.uid();
  r public.requests;
  p public.plots;
  v_name text;
  v_by text := app.name_of(app.uid());
begin
  perform app.require_admin();
  select * into r from public.requests where id = p_req for update;
  if r.id is null or r.status <> 'pending' then raise exception 'This request is already closed.'; end if;
  select * into p from public.plots where id = r.plot_id for update;
  select c.name into v_name from public.deals d join public.clients c on c.id = d.client_id where d.id = r.deal_id;

  if r.kind = 'prebook' then
    if p_approve then
      if p.status <> 'available' then raise exception '% is not available any more.', r.plot_id; end if;
      update public.plots set status = 'prebooked', holder_deal = r.deal_id, updated_by = me, updated_at = now() where id = r.plot_id;
      update public.deals set stage = 'prebooked', updated_at = now() where id = r.deal_id;
      update public.requests set status = 'approved', decided_by = me, decided_at = now(), reason = nullif(trim(coalesce(p_reason, '')), '')
       where id = r.id;
      update public.requests set status = 'closed', decided_by = me, decided_at = now(), reason = 'Another client was pre-booked.'
       where plot_id = r.plot_id and kind = 'prebook' and status = 'pending' and id <> r.id;
      perform app.log(r.plot_id, 'status', r.plot_id || ' pre-booked');
      perform app.log(r.plot_id, 'approved', 'Pre-booking approved: ' || r.plot_id || ' for ' || v_name || ' · by ' || v_by, r.agent_id);
    else
      update public.requests set status = 'rejected', decided_by = me, decided_at = now(), reason = nullif(trim(coalesce(p_reason, '')), '')
       where id = r.id;
      perform app.log(r.plot_id, 'rejected', 'Pre-booking not approved: ' || r.plot_id || ' for ' || v_name
                      || coalesce(' · ' || nullif(trim(p_reason), ''), '') || ' · by ' || v_by, r.agent_id);
    end if;
  else -- sale
    if p_approve then
      update public.plots set status = 'sold', holder_deal = r.deal_id, updated_by = me, updated_at = now() where id = r.plot_id;
      update public.deals set sold = true, sale_price = r.sale_price, token_amount = r.token_amount, payment_mode = r.payment_mode,
             transfer_deadline = r.transfer_deadline,
             stage = case when stage in ('interested', 'prebooked') then 'token' else stage end, updated_at = now()
       where id = r.deal_id;
      update public.requests set status = 'approved', decided_by = me, decided_at = now(), reason = nullif(trim(coalesce(p_reason, '')), '')
       where id = r.id;
      update public.requests set status = 'closed', decided_by = me, decided_at = now(), reason = 'The plot was sold.'
       where plot_id = r.plot_id and status = 'pending' and id <> r.id;
      update public.deals set stage = 'interested', updated_at = now()
       where plot_id = r.plot_id and id <> r.deal_id and stage = 'prebooked';
      perform app.log(r.plot_id, 'status', r.plot_id || ' sold');
      perform app.log(r.plot_id, 'approved', 'Sale approved: ' || r.plot_id || ' to ' || v_name || ' for ' || app.cr(r.sale_price) || ' · by ' || v_by, r.agent_id);
    else
      update public.plots set status = coalesce(r.prev_status, 'available'), holder_deal = r.prev_holder, updated_by = me, updated_at = now()
       where id = r.plot_id;
      update public.requests set status = 'rejected', decided_by = me, decided_at = now(), reason = nullif(trim(coalesce(p_reason, '')), '')
       where id = r.id;
      perform app.log(r.plot_id, 'status', r.plot_id || ' is ' || app.status_label(coalesce(r.prev_status, 'available')) || ' again');
      perform app.log(r.plot_id, 'rejected', 'Sale not approved: ' || r.plot_id || ' to ' || v_name
                      || coalesce(' · ' || nullif(trim(p_reason), ''), '') || ' · by ' || v_by, r.agent_id);
    end if;
  end if;
end $$;

create or replace function public.request_prebook(p_deal_id uuid, p_note text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); d public.deals; v_status text; v_id uuid; v_name text;
begin
  select * into d from public.deals where id = p_deal_id;
  perform app.own_or_admin(d.agent_id);
  if d.stage <> 'interested' then raise exception 'Only an interested client can get a pre-booking.'; end if;
  select status into v_status from public.plots where id = d.plot_id;
  if v_status <> 'available' then raise exception '% is not available.', d.plot_id; end if;
  if exists (select 1 from public.requests where deal_id = d.id and kind = 'prebook' and status = 'pending') then
    raise exception 'A pre-booking request for this client is already waiting.';
  end if;
  insert into public.requests (kind, deal_id, plot_id, agent_id, note)
  values ('prebook', d.id, d.plot_id, d.agent_id, left(trim(coalesce(p_note, '')), 400)) returning id into v_id;
  select name into v_name from public.clients where id = d.client_id;
  perform app.log(d.plot_id, 'request', 'Pre-booking request: ' || d.plot_id || ' for ' || v_name || ' · by ' || app.name_of(me), d.agent_id);
  if app.is_admin() then perform app.decide(v_id, true, null); end if;
  return v_id;
end $$;

-- Mark a plot sold. The map shows "sold, waiting for approval" at once. An admin approves.
create or replace function public.request_sale(
  p_deal_id uuid, p_sale_price numeric, p_token_amount bigint, p_payment_mode text, p_transfer_deadline date, p_note text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require('mark_sold', 'mark plots sold'); d public.deals; p public.plots; v_id uuid; v_name text;
begin
  select * into d from public.deals where id = p_deal_id for update;
  perform app.own_or_admin(d.agent_id);
  if d.stage = 'dropped' then raise exception 'This deal stopped. Add the client to the plot again first.'; end if;
  if d.sold then raise exception 'This sale is already approved.'; end if;
  if p_sale_price is null or p_sale_price <= 0 or p_sale_price >= 1000 then raise exception 'Enter the sale price in crore, for example 4.40.'; end if;
  select * into p from public.plots where id = d.plot_id for update;
  if not (p.status = 'available' or (p.status = 'prebooked' and p.holder_deal = d.id)) then
    raise exception '% is % for another client.', d.plot_id, app.status_label(p.status);
  end if;
  insert into public.requests (kind, deal_id, plot_id, agent_id, sale_price, token_amount, payment_mode, transfer_deadline,
                               note, prev_status, prev_holder)
  values ('sale', d.id, d.plot_id, d.agent_id, round(p_sale_price, 2), p_token_amount, p_payment_mode, p_transfer_deadline,
          left(trim(coalesce(p_note, '')), 400), p.status, p.holder_deal)
  returning id into v_id;
  update public.plots set status = 'sold_pending', holder_deal = d.id, updated_by = me, updated_at = now() where id = d.plot_id;
  select name into v_name from public.clients where id = d.client_id;
  perform app.log(d.plot_id, 'status', d.plot_id || ' marked sold, waiting for approval');
  perform app.log(d.plot_id, 'request', 'Sale request: ' || d.plot_id || ' to ' || v_name || ' for ' || app.cr(round(p_sale_price, 2))
                  || ' · by ' || app.name_of(me), d.agent_id);
  if app.is_admin() then perform app.decide(v_id, true, null); end if;
  return v_id;
end $$;

create or replace function public.decide_request(p_id uuid, p_approve boolean, p_reason text default null) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform app.require_admin();
  perform app.decide(p_id, p_approve, p_reason);
end $$;

create or replace function public.cancel_request(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_member(); r public.requests;
begin
  select * into r from public.requests where id = p_id for update;
  perform app.own_or_admin(r.agent_id);
  if r.status <> 'pending' then raise exception 'This request is already closed.'; end if;
  update public.requests set status = 'cancelled', decided_by = me, decided_at = now() where id = r.id;
  if r.kind = 'sale' then
    update public.plots set status = coalesce(r.prev_status, 'available'), holder_deal = r.prev_holder, updated_by = me, updated_at = now()
     where id = r.plot_id and status = 'sold_pending' and holder_deal = r.deal_id;
    perform app.log(r.plot_id, 'status', r.plot_id || ' is ' || app.status_label(coalesce(r.prev_status, 'available')) || ' again');
  end if;
end $$;

-- ---------------------------------------------------------------- privileges

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
grant select on public.members, public.plots, public.plot_fixes, public.listing_owners, public.clients,
                public.deals, public.requests, public.activity, public.audit_log,
                public.people, public.plot_demand to authenticated;

revoke all on all functions in schema public from public, anon;
revoke all on all functions in schema app from public, anon;
grant usage on schema app to authenticated;
grant execute on all functions in schema public to authenticated;
-- Only the helpers that the read rules call. The other app.* functions run inside the public functions.
grant execute on function app.email(), app.member(), app.uid(), app.is_member(), app.is_admin() to authenticated;

-- Live updates (Supabase Realtime). The publication exists only on Supabase.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.plots, public.plot_fixes, public.activity, public.requests,
      public.clients, public.deals, public.listing_owners, public.members;
  end if;
end $$;
