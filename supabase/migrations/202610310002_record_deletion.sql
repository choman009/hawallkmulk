-- Apply after 202610310001_secondary_phones.sql. Safe to repeat.
-- Deletion removes access, retaining history/files for database maintenance recovery.
begin;
create table if not exists public.deleted_records (
 target_table text not null check(target_table in ('properties','client_requests','partner_offices','assignments')),
 target_id uuid not null,
 deleted_by uuid not null references public.profiles(id),
 deleted_at timestamptz not null default now(),
 primary key(target_table,target_id)
);
alter table public.deleted_records enable row level security;
revoke all on public.deleted_records from public,anon,authenticated;

create or replace function public.record_is_deleted(record_table text, record_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.deleted_records d where d.target_table=record_table and d.target_id=record_id);
$$;
revoke all on function public.record_is_deleted(text,uuid) from public,anon;
grant execute on function public.record_is_deleted(text,uuid) to authenticated;

create or replace function public.guard_deleted_links() returns trigger language plpgsql security definer set search_path='' as $$
declare field text; linked_table text; new_id uuid;
begin
 foreach field in array array['source_office_id','property_id','request_id','assignment_id'] loop
  new_id := nullif(to_jsonb(new)->>field,'')::uuid;
  if new_id is not null and (tg_op='INSERT' or (to_jsonb(new)->>field) is distinct from (to_jsonb(old)->>field)) then
   linked_table := case field when 'source_office_id' then 'partner_offices' when 'property_id' then 'properties' when 'request_id' then 'client_requests' else 'assignments' end;
   if public.record_is_deleted(linked_table,new_id) then
    raise exception 'linked record deleted' using errcode='23503';
   end if;
  end if;
 end loop;
 return new;
end; $$;
revoke all on function public.guard_deleted_links() from public,anon,authenticated;
do $$
declare tab text;
begin
 foreach tab in array array['properties','client_requests','assignments','assignment_updates','property_images'] loop
  execute format('drop trigger if exists guard_deleted_links on public.%I',tab);
  execute format('create trigger guard_deleted_links before insert or update on public.%I for each row execute function public.guard_deleted_links()',tab);
 end loop;
end; $$;

-- Restrictive policies intersect existing permissions for every operation.
do $$
declare tab text;
begin
 foreach tab in array array['properties','client_requests','partner_offices','assignments'] loop
  execute format('drop policy if exists live_records_only on public.%I',tab);
  execute format('create policy live_records_only on public.%I as restrictive for all to authenticated using(not public.record_is_deleted(%L,id)) with check(not public.record_is_deleted(%L,id))',tab,tab,tab);
 end loop;
end; $$;

create or replace function public.can_read_property(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.member_role() is not null and not public.record_is_deleted('properties',target)
 and exists(select 1 from public.properties p where p.id=target and (public.is_operator() or p.source_contributor_id=auth.uid()
 or exists(select 1 from public.assignments a where a.property_id=target and a.assignee_id=auth.uid() and a.status<>'canceled' and not public.record_is_deleted('assignments',a.id))));
$$;
create or replace function public.can_read_request(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.member_role() is not null and not public.record_is_deleted('client_requests',target)
 and exists(select 1 from public.client_requests r where r.id=target and (public.is_operator() or r.source_contributor_id=auth.uid()
 or exists(select 1 from public.assignments a where a.request_id=target and a.assignee_id=auth.uid() and a.status<>'canceled' and not public.record_is_deleted('assignments',a.id))));
$$;
create or replace function public.can_edit_property(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.may_write() and not public.record_is_deleted('properties',target)
 and exists(select 1 from public.properties p where p.id=target and (public.is_admin() or (public.member_role()='staff' and p.status<>'archived') or (p.source_contributor_id=auth.uid() and p.status='available')));
$$;

create or replace function public.visible_record_sources()
returns table(record_id uuid,record_type text,contributor_name text,office_name text,office_address text,office_contact text,office_phone text,office_phone_secondary text)
language sql stable security definer set search_path='' as $$
 select p.id,'properties'::text,c.name,o.name,o.address,o.contact_name,o.phone,o.phone_secondary from public.properties p
 left join public.profiles c on c.id=p.source_contributor_id
 left join public.partner_offices o on o.id=p.source_office_id and not public.record_is_deleted('partner_offices',o.id)
 where public.can_read_property(p.id)
 union all
 select r.id,'client_requests'::text,c.name,o.name,o.address,o.contact_name,o.phone,o.phone_secondary from public.client_requests r
 left join public.profiles c on c.id=r.source_contributor_id
 left join public.partner_offices o on o.id=r.source_office_id and not public.record_is_deleted('partner_offices',o.id)
 where public.can_read_request(r.id);
$$;

create or replace function public.delete_record(target_table text,target_id uuid)
returns void language plpgsql security definer set search_path='' as $$
declare found_id uuid;
begin
 if not public.is_admin() or not public.may_write() then
  raise exception 'permissionDenied' using errcode='42501';
 end if;
 if target_table not in ('properties','client_requests','partner_offices','assignments') or target_table is null then
  raise exception 'invalid deletion target' using errcode='22023';
 end if;
 -- Lock the target while checking it and removing access.
 execute format('select id from public.%I where id=$1 for update',target_table) into found_id using target_id;
 if found_id is null then raise exception 'record not found' using errcode='P0002'; end if;
 -- Surviving requests must remain editable after removing their matched property.
 if target_table='properties' then
  update public.client_requests set property_id=null where property_id=target_id;
 end if;
 insert into public.deleted_records(target_table,target_id,deleted_by)
 values(target_table,target_id,auth.uid()) on conflict do nothing;
 if target_table in ('properties','client_requests') then
  insert into public.deleted_records(target_table,target_id,deleted_by)
  select 'assignments',a.id,auth.uid() from public.assignments a
  where (target_table='properties' and a.property_id=target_id)
     or (target_table='client_requests' and a.request_id=target_id)
  on conflict do nothing;
 end if;
 insert into public.activity_log(actor_id,target_id,target_table,operation)
 values(auth.uid(),target_id::text,target_table,'DELETE');
end; $$;
revoke all on function public.delete_record(text,uuid) from public,anon;
grant execute on function public.delete_record(text,uuid) to authenticated;
-- Notify PostgREST to discover the new function promptly.
notify pgrst, 'reload schema';
commit;
