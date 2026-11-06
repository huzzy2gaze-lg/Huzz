-- The website: enquiries from the public, client accounts, assignment to an agent. Runs after phase3_test.sql.

-- the public (not signed in) reads the settings and sends an enquiry, and reads nothing else
grant usage on schema t to anon; grant execute on all functions in schema t to anon; grant all on t.ids to anon;
set role anon;
select set_config('request.jwt.claims', '{}', false);
select t.ok((select value from public.site_settings where key = 'company') = 'WH Ventures', 'public reads the company name');
select t.ok(public.submit_enquiry('Asad Raza', '0300 1112233', '', 'Interested in Block A', 'A-538') is not null, 'public sends an enquiry');
select t.ok(public.submit_enquiry('Robot', '0300 0000000', '', 'spam', null, 'http://spam') is null, 'hidden field stops robots');
select t.fails($$select public.submit_enquiry('Xyz', '12', 'not-mail', '')$$, 'phone number or an e-mail');
select t.fails($$select count(*) from public.leads$$, 'permission denied');
select t.fails($$select count(*) from public.plots$$, 'permission denied');
select t.fails($$select public.assign_lead(gen_random_uuid(), gen_random_uuid())$$, 'permission denied');
reset role;

-- a client with a login: own account, saved plots, own enquiries only, no sales data
set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","email":"buyer@gmail.com"}', false);
select t.ok((public.my_account() ->> 'email') = 'buyer@gmail.com', 'client account made at first sign-in');
select public.save_my_account('Buyer One', '0333 9998887');
select public.save_plot_for_later('A-540', true);
select t.ok((public.my_account() -> 'saved') ? 'A-540', 'client saves a plot');
insert into t.ids select 'lead2', public.submit_enquiry('Buyer One', '0333 9998887', 'buyer@gmail.com', 'Please call me', 'A-540');
select t.ok((select count(*) from public.leads) = 1, 'client sees only their own enquiry');
select t.ok((select count(*) from public.plots) = 0 and (select count(*) from public.clients) = 0 and (select count(*) from public.people) = 0, 'client sees no sales data');
select t.fails($$select public.save_site_settings('{"phone":"1"}')$$, 'not active');

-- the admins see every enquiry and assign it; only that agent sees it
select t.as_user('owner@example.com');
select t.ok((select count(*) from public.leads) = 2, 'admin sees all enquiries');
select t.ok(exists (select 1 from public.activity where kind = 'lead' and body like 'New website enquiry: Asad Raza%'), 'admins get a notice');
select public.assign_lead((select id from public.leads where name = 'Asad Raza'), (select v from t.ids where k = 'ali'));
select public.save_site_settings('{"phone":"051 1234567","address":"Islamabad"}');
select t.as_user('omar@example.com');
select t.ok((select count(*) from public.leads) = 0, 'other agents do not see the enquiry');
select t.fails(format('select public.update_lead(%L, %L)', (select v from t.ids where k = 'lead2'), 'contacted'), 'not assigned to you');
select t.fails($$select public.save_site_settings('{"phone":"1"}')$$, 'Only an admin');
select t.as_user('ali@example.com');
select t.ok((select count(*) from public.leads) = 1, 'the agent sees the enquiry assigned to them');
select public.update_lead((select id from public.leads limit 1), 'contacted', 'Called, visit on Sunday');
select t.ok(public.convert_lead((select id from public.leads limit 1)) is not null, 'enquiry becomes a client');
select t.ok(exists (select 1 from public.clients where name = 'Asad Raza') and exists (select 1 from public.deals d join public.clients c on c.id = d.client_id where c.name = 'Asad Raza' and d.plot_id = 'A-538'), 'client and plot interest made');
reset role;
set role anon;
select set_config('request.jwt.claims', '{}', false);
select t.ok((select value from public.site_settings where key = 'phone') = '051 1234567', 'public reads the new phone number');
reset role;
\echo phase 4 tests: all checks passed
