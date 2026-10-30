-- Existing projects: run this file only. It preserves all existing records.
begin;

alter table public.properties add column if not exists phone_secondary text;
alter table public.partner_offices add column if not exists phone_secondary text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname='properties_secondary_phone_format' and conrelid='public.properties'::regclass) then
    alter table public.properties add constraint properties_secondary_phone_format
      check (phone_secondary is null or phone_secondary ~ '^\+[1-9][0-9]{7,14}$');
  end if;
  if not exists (select 1 from pg_constraint where conname='partner_offices_secondary_phone_format' and conrelid='public.partner_offices'::regclass) then
    alter table public.partner_offices add constraint partner_offices_secondary_phone_format
      check (phone_secondary is null or phone_secondary ~ '^\+[1-9][0-9]{7,14}$');
  end if;
end;
$$;

-- Extend the scoped projection; never expose the entire partner directory.
drop function if exists public.visible_record_sources();
create function public.visible_record_sources()
returns table (
  record_id uuid, record_type text, contributor_name text,
  office_name text, office_address text, office_contact text,
  office_phone text, office_phone_secondary text
)
language sql stable security definer set search_path='' as $$
  select p.id, 'properties'::text, c.name, o.name, o.address,
    o.contact_name, o.phone, o.phone_secondary
  from public.properties p
  left join public.profiles c on c.id=p.source_contributor_id
  left join public.partner_offices o on o.id=p.source_office_id
  where public.can_read_property(p.id)
  union all
  select r.id, 'client_requests'::text, c.name, o.name, o.address,
    o.contact_name, o.phone, o.phone_secondary
  from public.client_requests r
  left join public.profiles c on c.id=r.source_contributor_id
  left join public.partner_offices o on o.id=r.source_office_id
  where public.can_read_request(r.id);
$$;

revoke all on function public.visible_record_sources() from public, anon;
grant execute on function public.visible_record_sources() to authenticated;
commit;
