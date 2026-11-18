-- "Book a call" from the website, and the investor list.
-- A visitor chooses one or more blocks and leaves a phone number (WhatsApp and e-mail are optional).
-- People who agree to receive news (on the form, or in their account) form the investor list for the admins.
-- The ad that brought the visitor (utm_source, utm_campaign ...) is kept with the booking.

alter table public.leads
  add column blocks text[] not null default '{}' check (blocks <@ array['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']),
  add column whatsapp text not null default '' check (length(whatsapp) <= 40),
  add column best_time text not null default '' check (best_time in ('', 'morning', 'afternoon', 'evening')),
  add column marketing_opt_in boolean not null default false,
  add column source text not null default '' check (length(source) <= 200);

alter table public.client_accounts
  add column whatsapp text not null default '' check (length(whatsapp) <= 40),
  add column interests text[] not null default '{}' check (interests <@ array['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']),
  add column marketing_opt_in boolean not null default false,
  add column opt_in_at timestamptz;

create or replace function public.book_call(
  p_name text, p_phone text, p_whatsapp text, p_email text, p_blocks text[], p_best_time text, p_message text,
  p_opt_in boolean, p_source text default '', p_plot_id text default null, p_website text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid; v_user uuid := auth.uid();
  v_phone text := trim(coalesce(p_phone, ''));
  v_email text := lower(trim(coalesce(p_email, '')));
  v_blocks text[] := coalesce((select array_agg(distinct upper(b) order by upper(b)) from unnest(coalesce(p_blocks, '{}')) b where upper(b) ~ '^[A-H]$'), '{}');
begin
  if length(coalesce(p_website, '')) > 0 then return null; end if; -- a robot filled the hidden field
  if length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Write your name.'; end if;
  if regexp_replace(v_phone, '[^0-9]', '', 'g') !~ '^[0-9]{7,15}$' then raise exception 'Write your phone number, so that we can call you.'; end if;
  if v_email <> '' and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'The e-mail address is not valid.'; end if;
  if coalesce(p_best_time, '') not in ('', 'morning', 'afternoon', 'evening') then raise exception 'Choose a time of day.'; end if;
  if p_plot_id is not null and p_plot_id <> '' and p_plot_id !~ '^[A-H]-[0-9]{1,4}$' then raise exception 'Not a plot number.'; end if;
  if (select count(*) from public.leads where created_at > now() - interval '1 day' and phone = v_phone) >= 5 then
    raise exception 'We already have your request. We will call you soon.';
  end if;
  insert into public.leads (name, phone, whatsapp, email, message, plot_id, blocks, best_time, marketing_opt_in, source, client_user)
  values (left(trim(p_name), 80), left(v_phone, 40), left(trim(coalesce(p_whatsapp, '')), 40), left(v_email, 120),
          left(trim(coalesce(p_message, '')), 1000), nullif(p_plot_id, ''), v_blocks, coalesce(p_best_time, ''), coalesce(p_opt_in, false),
          left(coalesce(p_source, ''), 200), case when v_user is not null and not app.is_member() then v_user end)
  returning id into v_id;
  if app.first_admin() is not null then
    insert into public.activity (actor, plot_id, kind, body, private_to)
    values (null, nullif(p_plot_id, ''), 'lead', 'Call booked on the website: ' || left(trim(p_name), 80)
            || case when cardinality(v_blocks) > 0 then ' · Block ' || array_to_string(v_blocks, ', ') else '' end, app.first_admin());
  end if;
  return v_id;
end $$;

drop function public.save_my_account(text, text);
create or replace function public.save_my_account(
  p_full_name text, p_phone text, p_whatsapp text default '', p_interests text[] default '{}', p_opt_in boolean default false
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  perform public.my_account();
  update public.client_accounts set
    full_name = left(trim(coalesce(p_full_name, '')), 80), phone = left(trim(coalesce(p_phone, '')), 40),
    whatsapp = left(trim(coalesce(p_whatsapp, '')), 40),
    interests = coalesce((select array_agg(distinct upper(b) order by upper(b)) from unnest(coalesce(p_interests, '{}')) b where upper(b) ~ '^[A-H]$'), '{}'),
    opt_in_at = case when coalesce(p_opt_in, false) and not marketing_opt_in then now() when not coalesce(p_opt_in, false) then null else opt_in_at end,
    marketing_opt_in = coalesce(p_opt_in, false)
  where user_id = auth.uid();
end $$;

-- The investor list: people who agreed to receive news, from accounts and from booked calls (one row per phone or e-mail).
create or replace function public.investor_list() returns table (
  name text, phone text, whatsapp text, email text, blocks text[], source text, joined timestamptz, origin text
) language plpgsql stable security definer set search_path = '' as $$
begin
  if not (app.is_admin() or app.can('export')) then raise exception 'You do not have permission to see the investor list. Ask an admin.' using errcode = '42501'; end if;
  return query
  with rows as (
    select c.full_name as name, c.phone, c.whatsapp, c.email, c.interests as blocks, ''::text as source, coalesce(c.opt_in_at, c.created_at) as joined, 'account'::text as origin
      from public.client_accounts c where c.marketing_opt_in
    union all
    select l.name, l.phone, l.whatsapp, l.email, l.blocks, l.source, l.created_at, 'booked call'
      from public.leads l where l.marketing_opt_in
  )
  select distinct on (coalesce(nullif(regexp_replace(r.phone, '[^0-9]', '', 'g'), ''), r.email)) r.name, r.phone, r.whatsapp, r.email, r.blocks, r.source, r.joined, r.origin
    from rows r
   order by coalesce(nullif(regexp_replace(r.phone, '[^0-9]', '', 'g'), ''), r.email), r.joined desc;
end $$;

revoke all on all functions in schema public from public, anon;
grant execute on all functions in schema public to authenticated;
grant execute on function public.submit_enquiry(text, text, text, text, text, text) to anon;
grant execute on function public.book_call(text, text, text, text, text[], text, text, boolean, text, text, text) to anon;
