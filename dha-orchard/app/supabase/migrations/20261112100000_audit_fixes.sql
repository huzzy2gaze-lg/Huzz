-- Fixes from the website audit (12 November 2026).

-- ---------------------------------------------------------------- 1. table rights
-- The first migration removed all table rights from anonymous visitors and signed-in users, then gave back only
-- the reads that the access rules (row level security) control. Tables made later (documents, events,
-- download_requests, site_settings, client_accounts, saved_plots, leads) kept Supabase's default rights, which
-- include insert, update, delete and truncate. The access rules blocked the writes, but the rights must not be
-- there. All writes go through the server functions (security definer), which do not need them.
revoke all on all tables in schema public from public, anon, authenticated;
grant select on public.members, public.plots, public.plot_fixes, public.listing_owners, public.clients,
                public.deals, public.requests, public.activity, public.audit_log, public.people, public.plot_demand,
                public.documents, public.events, public.download_requests,
                public.client_accounts, public.saved_plots, public.leads to authenticated;
grant select on public.site_settings to anon, authenticated;
-- tables made in the future start with no rights for visitors
alter default privileges in schema public revoke all on tables from public, anon, authenticated;

-- ---------------------------------------------------------------- 2. spam guard on website bookings
-- book_call and submit_enquiry already stop 5 requests a day for the same phone text. A bot can write the same
-- number in different ways ("0331 5223726", "+92 331 5223726"), or use many numbers. This check runs for every
-- new lead: it compares only the last 10 digits of the phone number, and it limits all website leads together.
create or replace function app.leads_guard() returns trigger language plpgsql security definer set search_path = '' as $$
declare v_digits text := right(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), 10);
begin
  if v_digits <> '' and (select count(*) from public.leads
       where created_at > now() - interval '1 day'
         and right(regexp_replace(phone, '[^0-9]', '', 'g'), 10) = v_digits) >= 5 then
    raise exception 'We already have your request. We will call you soon.';
  end if;
  if (select count(*) from public.leads where created_at > now() - interval '1 hour') >= 60 then
    raise exception 'We have many requests now. Please send us a WhatsApp message, or try again in one hour.';
  end if;
  return new;
end $$;
revoke all on function app.leads_guard() from public, anon, authenticated;

drop trigger if exists leads_guard on public.leads;
create trigger leads_guard before insert on public.leads for each row execute function app.leads_guard();
