-- Website: the admins can list nearby places with travel times (one per line: "Place | time").

alter table public.site_settings drop constraint site_settings_key_check;
alter table public.site_settings add constraint site_settings_key_check
  check (key in ('company', 'phone', 'whatsapp', 'email', 'address', 'hours', 'about', 'nearby'));
alter table public.site_settings drop constraint site_settings_value_check;
alter table public.site_settings add constraint site_settings_value_check check (length(value) <= 2000);

create or replace function public.save_site_settings(p_values jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := app.require_admin(); k text;
begin
  for k in select jsonb_object_keys(p_values) loop
    if k not in ('company', 'phone', 'whatsapp', 'email', 'address', 'hours', 'about', 'nearby') then raise exception 'Unknown setting %.', k; end if;
    insert into public.site_settings (key, value) values (k, left(coalesce(p_values ->> k, ''), 2000))
    on conflict (key) do update set value = excluded.value;
  end loop;
end $$;
revoke all on function public.save_site_settings(jsonb) from public, anon;
grant execute on function public.save_site_settings(jsonb) to authenticated;
