-- Download requests and calendar end times. Runs after phase2_test.sql.
set role authenticated;

-- Ali asks to download his token receipt; Omar cannot see it; an admin approves; one download only
select t.as_user('ali@example.com');
insert into t.ids select 'doc1', (select id from public.documents where kind = 'token_receipt' limit 1);
select t.fails($$select public.use_download(gen_random_uuid())$$, 'does not exist');
insert into t.ids select 'dl1', public.request_download((select v from t.ids where k = 'doc1'), 'Client wants a copy');
select t.fails(format('select public.request_download(%L)', (select v from t.ids where k = 'doc1')), 'already waiting');
select t.fails(format('select public.use_download(%L)', (select v from t.ids where k = 'dl1')), 'must approve');
select t.as_user('omar@example.com');
select t.fails(format('select public.request_download(%L)', (select v from t.ids where k = 'doc1')), 'does not exist');
select t.ok((select count(*) from public.download_requests) = 0, 'other agent cannot see the request');
select t.fails(format('select public.decide_download(%L, true)', (select v from t.ids where k = 'dl1')), 'Only an admin');
select t.as_user('owner@example.com');
select t.fails(format('select public.request_download(%L)', (select v from t.ids where k = 'doc1')), 'without a request');
select public.decide_download((select v from t.ids where k = 'dl1'), true);
select t.ok(exists (select 1 from public.activity where kind = 'download_request' and body like 'Download request: Token payment proof of A-540%'), 'admins see the request');
select t.as_user('ali@example.com');
select t.ok(public.use_download((select v from t.ids where k = 'dl1')) like '%/deal/token.jpg', 'approved download gives the file');
select t.fails(format('select public.use_download(%L)', (select v from t.ids where k = 'dl1')), 'must approve');
select public.report_document_event((select v from t.ids where k = 'doc1'), 'screenshot_key');
select t.as_user('owner@example.com');
select t.ok(exists (select 1 from public.activity where kind = 'doc_screenshot_key' and body like 'Screenshot key pressed on Token payment proof of A-540 · by Ali'), 'screenshot key reported to admins');

-- a rejected request, then a new request is possible
select t.as_user('ali@example.com');
insert into t.ids select 'dl2', public.request_download((select v from t.ids where k = 'doc1'));
select t.as_user('owner@example.com');
select public.decide_download((select v from t.ids where k = 'dl2'), false, 'Not needed');
select t.as_user('ali@example.com');
select t.ok((select status from public.download_requests where id = (select v from t.ids where k = 'dl2')) = 'rejected', 'request not approved');
select t.ok(public.request_download((select v from t.ids where k = 'doc1')) is not null, 'ask again after a rejection');

-- calendar end time
select t.fails($$select public.save_event(null, null, null, 'Meeting', date '2026-11-20', time '10:00', '', false, time '09:00')$$, 'end time must be after');
select t.ok(public.save_event(null, null, null, 'Meeting', date '2026-11-20', time '10:00', '', false, time '11:30') is not null, 'event with an end time');

reset role;
\echo phase 3 tests: all checks passed
