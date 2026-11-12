-- Access-rule tests. Each block acts as one person (by the e-mail in the login token).
\set QUIET on
create schema t;
create function t.as_user(p_email text) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('email', p_email)::text, false) $$;
-- the statement must fail, with an error that contains p_like
create function t.fails(p_sql text, p_like text) returns void language plpgsql as $$
begin
  begin execute p_sql;
  exception when others then
    if sqlerrm not ilike '%' || p_like || '%' then raise exception 'Wrong error for [%]: %', p_sql, sqlerrm; end if;
    return;
  end;
  raise exception 'Expected an error for [%]', p_sql;
end $$;
create function t.ok(p_cond boolean, p_msg text) returns void language plpgsql as $$
begin if p_cond is not true then raise exception 'FAILED: %', p_msg; end if; end $$;
grant usage on schema t to authenticated;
grant execute on all functions in schema t to authenticated;
create table t.ids (k text primary key, v uuid);
grant all on t.ids to authenticated;

-- the first admin is added by hand in the SQL editor
insert into public.members (email, full_name, role) values ('owner@example.com', 'Owner', 'admin');

set role authenticated;

-- a stranger with a Google login but no account sees nothing and can do nothing
select t.as_user('stranger@example.com');
select t.ok(public.me() is null, 'stranger has no account');
select t.ok((select count(*) from public.plots) = 0, 'stranger sees no plots');
select t.ok((select count(*) from public.people) = 0, 'stranger sees no people');
select t.fails($$select public.save_client(null, 'X', '', '', '')$$, 'not active');
select t.fails($$select public.add_plots('[{"id":"A-1","size":"1K"}]', 4)$$, 'not active');

-- the admin adds the team
select t.as_user('owner@example.com');
select t.ok((select count(*) from public.plots) = 20, 'imported plots visible to admin');
insert into t.ids select 'nadeem', public.save_member(null, 'Nadeem@Example.com', 'Mr. Nadeem', '', 'admin', true);
insert into t.ids select 'ali', public.save_member(null, 'ali@example.com', 'Ali', '0300', 'agent', true);
insert into t.ids select 'sara', public.save_member(null, 'sara@example.com', 'Sara', '', 'agent', true, '{"can_edit_price":true}');
insert into t.ids select 'omar', public.save_member(null, 'omar@example.com', 'Omar', '', 'agent', true, '{"can_mark_sold":false}');
select t.fails($$select public.save_member(null, 'ali@example.com', 'Ali 2', '', 'agent', true)$$, 'already exists');
select t.fails($$select public.save_member(null, 'not-an-email', 'X', '', 'agent', true)$$, 'valid e-mail');
select t.ok((select email from public.members where full_name = 'Mr. Nadeem') = 'nadeem@example.com', 'e-mail stored in lower case');

-- agents cannot manage accounts and see only their own account row
select t.as_user('ali@example.com');
select t.ok((public.me() ->> 'role') = 'agent', 'ali is an agent');
select t.ok((select count(*) from public.members) = 1, 'agent sees only own account');
select t.ok((select count(*) from public.people) = 5, 'agent sees team names');
select t.fails($$select public.save_member(null, 'x@example.com', 'X', '', 'admin', true)$$, 'Only an admin');

-- permissions: adding plots and changing prices
select t.fails($$select public.add_plots('[{"id":"B-10","size":"14M"}]', 3.2)$$, 'permission to add plots');
select t.fails($$select public.set_price(array['A-540'], 4.0)$$, 'permission to change prices');
select t.fails($$select public.save_fix('A-p100_200', 5, null)$$, 'permission to correct');
select t.ok(public.set_tag(array['A-540'], 'Park facing', true) = 1, 'any member can tag');
select public.set_note('A-540', 'Near the park');

select t.as_user('sara@example.com');
select t.ok(public.set_price(array['A-540', 'A-543'], 3.95) = 2, 'agent with price permission can change prices');
select t.ok((select price from public.plots where id = 'A-540') = 3.95, 'price changed');

-- direct table writes are refused for everyone
select t.fails($$update public.plots set price = 1 where id = 'A-540'$$, 'permission denied');
select t.fails($$insert into public.clients (agent_id, name) values ((select id from public.people limit 1), 'X')$$, 'permission denied');
select t.fails($$delete from public.activity$$, 'permission denied');

-- clients are private to their agent
select t.as_user('ali@example.com');
insert into t.ids select 'c_ali', public.save_client(null, 'Kamran Shah', '0333 1234567', '', 'Budget 4 crore');
insert into t.ids select 'd_ali', public.add_interest((select v from t.ids where k = 'c_ali'), 'A-540');
select t.as_user('sara@example.com');
insert into t.ids select 'c_sara', public.save_client(null, 'Bilal Ahmed', '0345 7654321', '', '');
insert into t.ids select 'd_sara', public.add_interest((select v from t.ids where k = 'c_sara'), 'A-540');
select t.ok((select count(*) from public.clients) = 1, 'sara sees only her client');
select t.ok((select count(*) from public.deals) = 1, 'sara sees only her deal');
select t.ok((select interested from public.plot_demand where plot_id = 'A-540') = 2, 'demand count shows both clients');
select t.ok(not exists (select 1 from public.activity where body like '%Kamran%'), 'sara cannot read ali''s client name in the feed');
select t.ok(exists (select 1 from public.activity where body = 'New client interest on A-540'), 'public feed has no names');
select t.fails(format('select public.save_client(%L, %L, %L, %L, %L)', (select v from t.ids where k = 'c_ali'), 'Hacked', '', '', ''), 'another agent');
select t.fails(format('select public.add_interest(%L, %L)', (select v from t.ids where k = 'c_ali'), 'A-538'), 'another agent');
select t.fails(format('select public.drop_deal(%L, %L)', (select v from t.ids where k = 'd_ali'), 'x'), 'another agent');
select t.fails(format('select public.request_prebook(%L)', (select v from t.ids where k = 'd_ali')), 'another agent');

-- pre-booking: two agents ask, one admin chooses
select t.as_user('ali@example.com');
insert into t.ids select 'r_ali', public.request_prebook((select v from t.ids where k = 'd_ali'));
select t.fails(format('select public.request_prebook(%L)', (select v from t.ids where k = 'd_ali')), 'already waiting');
select t.fails(format('select public.decide_request(%L, true)', (select v from t.ids where k = 'r_ali')), 'Only an admin');
select t.as_user('sara@example.com');
insert into t.ids select 'r_sara', public.request_prebook((select v from t.ids where k = 'd_sara'));
select t.ok((select count(*) from public.requests) = 1, 'sara sees only her request');

select t.as_user('nadeem@example.com');
select t.ok((select count(*) from public.requests where status = 'pending') = 2, 'admin sees both requests');
select public.decide_request((select v from t.ids where k = 'r_ali'), true);
select t.ok((select status from public.plots where id = 'A-540') = 'prebooked', 'plot pre-booked');
select t.ok((select stage from public.deals where id = (select v from t.ids where k = 'd_ali')) = 'prebooked', 'ali''s deal pre-booked');
select t.ok((select status from public.requests where id = (select v from t.ids where k = 'r_sara')) = 'closed', 'other request closed');
select t.fails(format('select public.decide_request(%L, true)', (select v from t.ids where k = 'r_ali')), 'already closed');

-- sale: only the holder can sell a pre-booked plot; the map shows it at once
select t.as_user('sara@example.com');
select t.fails(format('select public.request_sale(%L, 4.2, 500000, %L, null)', (select v from t.ids where k = 'd_sara'), 'cash'), 'pre-booked for another client');
select t.as_user('omar@example.com');
select t.fails($$select public.request_sale(gen_random_uuid(), 4.2, 0, 'cash', null)$$, 'permission to mark plots sold');

select t.as_user('ali@example.com');
insert into t.ids select 's1', public.request_sale((select v from t.ids where k = 'd_ali'), 4.40, 1000000, 'bank_transfer', date '2026-12-15');
select t.as_user('sara@example.com');
select t.ok((select status from public.plots where id = 'A-540') = 'sold_pending', 'everyone sees sold, waiting for approval');
select t.ok(exists (select 1 from public.activity where body = 'A-540 marked sold, waiting for approval'), 'public notice for the sale request');

-- an admin rejects: the plot goes back to pre-booked for ali's client
select t.as_user('nadeem@example.com');
select public.decide_request((select v from t.ids where k = 's1'), false, 'Token not received yet');
select t.ok((select status from public.plots where id = 'A-540') = 'prebooked', 'rejected sale restores pre-booking');
select t.ok((select holder_deal from public.plots where id = 'A-540') = (select v from t.ids where k = 'd_ali'), 'holder kept');

-- ali asks again; any one admin approves
select t.as_user('ali@example.com');
insert into t.ids select 's2', public.request_sale((select v from t.ids where k = 'd_ali'), 4.40, 1000000, 'bank_transfer', date '2026-12-15');
select t.as_user('owner@example.com');
select public.decide_request((select v from t.ids where k = 's2'), true);
select t.ok((select status from public.plots where id = 'A-540') = 'sold', 'plot sold');
select t.ok((select sold and stage = 'token' and sale_price = 4.40 from public.deals where id = (select v from t.ids where k = 'd_ali')), 'deal sold, token stage');

-- the buyer, the price and the token are hidden from other agents
select t.as_user('sara@example.com');
select t.ok(not exists (select 1 from public.deals where sold), 'sara cannot see the sold deal');
select t.ok(not exists (select 1 from public.clients where name = 'Kamran Shah'), 'sara cannot see the buyer');
select t.ok(exists (select 1 from public.activity where body = 'A-540 sold'), 'sara sees that the plot is sold');
select t.ok(not exists (select 1 from public.activity where body like '%4.40%'), 'sara cannot see the sale price');
select t.as_user('ali@example.com');
select t.ok(exists (select 1 from public.activity where body like 'Sale approved: A-540 to Kamran Shah for 4.40 Cr%'), 'ali gets the approval notice');
select t.fails(format('select public.drop_deal(%L, %L)', (select v from t.ids where k = 'd_ali'), 'x'), 'Only an admin can stop a sold deal');
select t.fails(format('select public.delete_client(%L)', (select v from t.ids where k = 'c_ali')), 'Stop the deal first');

-- sold plots stay; they can become dealer listings later
select t.fails($$select public.relist_plot('A-540', 4.9)$$, 'permission to add dealer listings');
select t.as_user('owner@example.com');
select t.fails($$select public.remove_plots(array['A-540'])$$, 'sold plot keeps its records');
select public.relist_plot('A-540', 4.90);
select t.ok((select kind = 'listing' and status = 'available' from public.plots where id = 'A-540'), 'relisted as dealer listing');
select public.save_listing_owner('A-540', 'Kamran Shah', '0333 1234567', 4.80, '1%', '');
select t.as_user('sara@example.com');
select t.ok(not exists (select 1 from public.listing_owners), 'listing owner hidden from other agents');

-- a dropped deal frees the plot
select t.as_user('owner@example.com');
select public.add_plots('[{"id":"B-10","size":"14M"}]', 3.2);
select t.as_user('sara@example.com');
insert into t.ids select 'd_b10', public.add_interest((select v from t.ids where k = 'c_sara'), 'B-10');
select public.request_prebook((select v from t.ids where k = 'd_b10'));
select t.as_user('owner@example.com');
select public.decide_request((select id from public.requests where deal_id = (select v from t.ids where k = 'd_b10')), true);
select t.as_user('sara@example.com');
select public.drop_deal((select v from t.ids where k = 'd_b10'), 'Client bought elsewhere');
select t.ok((select status from public.plots where id = 'B-10') = 'available', 'plot available after the deal stopped');

-- the change log is for admins only, and it records every change
select t.ok((select count(*) from public.audit_log) = 0, 'agent cannot read the change log');
select t.as_user('owner@example.com');
select t.ok((select count(*) from public.audit_log where tbl = 'plots') > 5, 'admin reads the change log');
select t.ok((select actor_email from public.audit_log where tbl = 'clients' order by id limit 1) = 'ali@example.com', 'log names the person');

-- the team keeps an admin; a closed account loses access at once
select public.save_member((select v from t.ids where k = 'nadeem'), 'nadeem@example.com', 'Mr. Nadeem', '', 'admin', false);
select t.fails(format('select public.save_member(%L, %L, %L, %L, %L, true)', (select id from public.members where email = 'owner@example.com'), 'owner@example.com', 'Owner', '', 'agent'), 'at least one active admin');
select public.save_member((select v from t.ids where k = 'sara'), 'sara@example.com', 'Sara', '', 'agent', false);
select t.as_user('sara@example.com');
select t.ok(public.me() is null, 'closed account has no access');
select t.ok((select count(*) from public.plots) = 0, 'closed account sees no plots');
select t.ok((select count(*) from public.clients) = 0, 'closed account sees no clients');

reset role;
\echo access tests: all checks passed
