-- Book a call and the investor list. Runs after phase4_test.sql.
set role anon;
select set_config('request.jwt.claims', '{}', false);
select t.ok(public.book_call('Hamza Ali', '0301 2223344', '0301 2223344', '', array['c', 'A', 'Z'], 'evening', 'Interested in 1 Kanal', true, 'utm_source=facebook&utm_campaign=nov') is not null, 'the public books a call');
select t.fails($$select public.book_call('No Phone', '', '0301', 'x@y.com', array['A'], '', '', false)$$, 'phone number');
select t.fails($$select public.book_call('Bad Mail', '0301 9998887', '', 'not-an-email', array['A'], '', '', false)$$, 'e-mail address is not valid');
select t.ok(public.book_call('Usman', '0302 5556667', '', '', array['B'], 'morning', '', false) is not null, 'a call without news');
select t.fails($$select public.investor_list()$$, 'permission denied');
reset role;

set role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","email":"buyer@gmail.com"}', false);
select public.save_my_account('Buyer One', '0333 9998887', '0333 9998887', array['C', 'G'], true);
select t.ok((select marketing_opt_in and interests = array['C', 'G'] and opt_in_at is not null from public.client_accounts), 'client joins the investor list');
select t.fails($$select * from public.investor_list()$$, 'permission');

select t.as_user('owner@example.com');
select t.ok((select blocks = array['A', 'C'] and best_time = 'evening' and source like 'utm_source=facebook%' from public.leads where name = 'Hamza Ali'), 'blocks, time and ad source saved');
select t.ok(exists (select 1 from public.activity where body = 'Call booked on the website: Hamza Ali · Block A, C'), 'admins get a notice with the blocks');
select t.ok((select count(*) from public.investor_list()) = 2, 'investor list: one account and one booked call');
select t.ok(not exists (select 1 from public.investor_list() where name = 'Usman'), 'people without consent are not on the list');
select t.as_user('ali@example.com');
select t.fails($$select * from public.investor_list()$$, 'permission to see the investor list');
select t.as_user('owner@example.com');
select public.save_member((select v from t.ids where k = 'ali'), 'ali@example.com', 'Ali', '0300', 'agent', true, '{"can_export":true}');
select t.as_user('ali@example.com');
select t.ok((select count(*) from public.investor_list()) = 2, 'an agent with the export permission sees the list');
reset role;
\echo phase 5 tests: all checks passed
