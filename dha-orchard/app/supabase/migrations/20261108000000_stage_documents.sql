-- Documents follow the stage: each stage accepts only its own types of document, and a deal accepts
-- documents only for the stage it is on and the stages before it. A plot with no deal takes the LP letter
-- (land provider letter).

alter table public.documents drop constraint documents_kind_check;
alter table public.documents add constraint documents_kind_check check (kind in (
  'lp_letter', 'ownership', 'agreement', 'token_receipt', 'cnic', 'ndc_application', 'ndc', 'transfer_letter',
  'pay_order', 'transfer_receipt', 'allotment_letter', 'other'));

-- The types of document for each stage. 'plot' = the plot itself, before or without a client.
create or replace function app.stage_kinds(p_stage text) returns text[]
language sql immutable set search_path = '' as $$
  select case p_stage
    when 'plot'          then array['lp_letter']
    when 'interested'    then array['cnic']
    when 'prebooked'     then array['cnic']
    when 'token'         then array['agreement', 'token_receipt']
    when 'ndc_submitted' then array['ndc_application']
    when 'ndc_approved'  then array['ndc']
    when 'transfer_date' then array['transfer_letter']
    when 'transfer_done' then array['pay_order', 'transfer_receipt']
    when 'closed'        then array['allotment_letter']
  end
$$;

create or replace function app.stage_order(p_stage text) returns integer
language sql immutable set search_path = '' as $$
  select array_position(array['interested', 'prebooked', 'token', 'ndc_submitted', 'ndc_approved',
                              'transfer_date', 'transfer_done', 'closed'], p_stage)
$$;

create or replace function public.add_document(
  p_deal_id uuid, p_plot_id text, p_stage text, p_kind text, p_file_name text, p_mime text, p_size integer,
  p_path text, p_note text default ''
) returns uuid language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require('upload_docs', 'upload documents'); d public.deals; v_owner uuid; v_plot text; v_stage text; v_id uuid;
begin
  if p_deal_id is not null then
    select * into d from public.deals where id = p_deal_id;
    perform app.own_or_admin(d.agent_id);
    if d.stage = 'dropped' then raise exception 'This deal stopped.'; end if;
    v_owner := d.agent_id; v_plot := d.plot_id; v_stage := p_stage;
    if app.stage_order(v_stage) is null then raise exception 'Unknown stage.'; end if;
    if app.stage_order(v_stage) > app.stage_order(d.stage) then
      raise exception 'Add documents to this stage when the deal reaches it.';
    end if;
  else
    if not exists (select 1 from public.plots where id = p_plot_id) then raise exception 'This plot is not in our stock.'; end if;
    v_owner := me; v_plot := p_plot_id; v_stage := 'plot';
  end if;
  if not (p_kind = any (app.stage_kinds(v_stage))) then raise exception 'This type of document is not for this stage.'; end if;
  if p_path is null or split_part(p_path, '/', 1) <> v_owner::text then raise exception 'The file is in the wrong folder.'; end if;
  insert into public.documents (deal_id, plot_id, owner_agent, stage, kind, file_name, mime, size_bytes, path, note, uploaded_by)
  values (p_deal_id, v_plot, v_owner, v_stage, p_kind, left(p_file_name, 160), p_mime, p_size, p_path, left(trim(coalesce(p_note, '')), 200), me)
  returning id into v_id;
  return v_id;
exception when check_violation then
  raise exception 'Use a photo (JPG, PNG, WebP) or a PDF of at most 10 MB.';
end $$;

revoke all on function public.add_document(uuid, text, text, text, text, text, integer, text, text) from public, anon;
grant execute on function public.add_document(uuid, text, text, text, text, text, integer, text, text) to authenticated;
