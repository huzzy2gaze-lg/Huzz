-- Phase 2 tests: deal stages, documents and calendar. Runs after access_test.sql (uses its people and deals).
set role authenticated;

-- stages: only after the sale is approved; dates are saved
select t.as_user('ali@example.com');
select public.update_deal((select v from t.ids where k = 'd_ali'), 'ndc_submitted',
  '{"authority":"FGEHA","ndc_submitted_on":"2026-11-10","ndc_expected":"2026-11-13","agreement_on":"2026-11-08"}');
select t.ok((select stage = 'ndc_submitted' and authority = 'FGEHA' and ndc_expected = date '2026-11-13'
             from public.deals where id = (select v from t.ids where k = 'd_ali')), 'stage and dates saved');
select t.fails(format('select public.update_deal(%L, %L, %L)', (select v from t.ids where k = 'd_ali'), 'flying', '{}'), 'Unknown stage');
select t.fails(format('select public.update_deal(%L, null, %L)', (select v from t.ids where k = 'd_ali'), '{"transfer_on":"2026-13-45"}'), 'date is not valid');
insert into t.ids select 'c_ali2', public.save_client(null, 'Zahid Iqbal', '', '', '');
insert into t.ids select 'd_ali2', public.add_interest((select v from t.ids where k = 'c_ali2'), 'A-538');
select t.fails(format('select public.update_deal(%L, %L, %L)', (select v from t.ids where k = 'd_ali2'), 'token', '{}'), 'must approve the sale');
select public.update_deal((select v from t.ids where k = 'd_ali2'), null, '{"agreement_on":"2026-11-20"}');
select t.ok(exists (select 1 from public.activity where body like 'A-540 · Kamran Shah: NDC submitted%'), 'stage change in the feed');

-- documents: the file must be in the owner's folder, and only photos or PDFs
select t.ok(public.add_document((select v from t.ids where k = 'd_ali'), null, 'token', 'token_receipt', 'token.jpg', 'image/jpeg', 120000,
            (select v from t.ids where k = 'ali')::text || '/deal/token.jpg') is not null, 'agent adds a token receipt');
select t.fails(format('select public.add_document(%L, null, %L, %L, %L, %L, 1000, %L)', (select v from t.ids where k = 'd_ali'),
               'token', 'agreement', 'a.jpg', 'image/jpeg', 'someone-else/a.jpg'), 'wrong folder');
select t.fails(format('select public.add_document(%L, null, %L, %L, %L, %L, 1000, %L)', (select v from t.ids where k = 'd_ali'),
               'token', 'agreement', 'a.exe', 'application/x-msdownload', (select v from t.ids where k = 'ali')::text || '/a.exe'), 'photo');
select t.as_user('owner@example.com');
select public.save_member((select v from t.ids where k = 'omar'), 'omar@example.com', 'Omar', '', 'agent', true, '{"can_upload_docs":false}');
select t.ok((select count(*) from public.documents) = 1, 'admin sees the document');
select t.as_user('omar@example.com');
select t.ok((select count(*) from public.documents) = 0, 'other agent cannot see the document');
select t.fails($$select public.add_document(null, 'A-538', null, 'ownership', 'o.pdf', 'application/pdf', 5000, 'x/o.pdf')$$, 'permission to upload');
select t.fails(format('select public.delete_document(%L)', (select id from public.documents limit 1)), 'does not exist');

-- calendar: own entries, private to the agent and the admins
select t.as_user('ali@example.com');
insert into t.ids select 'e1', public.save_event(null, (select v from t.ids where k = 'd_ali'), null, 'Transfer at FGEHA office', date '2026-11-25', time '11:00', 'Bring CNIC', false);
select t.ok((select plot_id from public.events where id = (select v from t.ids where k = 'e1')) = 'A-540', 'event takes the plot of the deal');
select t.as_user('omar@example.com');
select t.ok((select count(*) from public.events) = 0, 'other agent cannot see the event');
select t.fails(format('select public.delete_event(%L)', (select v from t.ids where k = 'e1')), 'another agent');
select t.as_user('owner@example.com');
select t.ok((select count(*) from public.events) = 1, 'admin sees the event');
select public.save_event((select v from t.ids where k = 'e1'), (select v from t.ids where k = 'd_ali'), null, 'Transfer at FGEHA office', date '2026-11-25', time '11:00', 'Bring CNIC', true);
select t.ok((select done from public.events where id = (select v from t.ids where k = 'e1')), 'admin marks the event done');
select t.ok((select count(*) from public.audit_log where tbl = 'documents') = 1, 'change log records the document');

reset role;
\echo phase 2 tests: all checks passed
