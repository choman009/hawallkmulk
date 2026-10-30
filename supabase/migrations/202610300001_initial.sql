-- Run once against a new Supabase project. Never place service keys in SQL.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null default '', phone text not null default '',
 role text not null default 'freelancer' check (role in ('owner','admin','staff','freelancer')),
 active boolean not null default false, can_write boolean not null default true,
 locale text not null default 'ckb' check(locale in ('ckb','en')),
 theme text not null default 'light' check(theme in ('light','dark'))
);
create function public.new_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id,name) values(new.id,coalesce(new.raw_user_meta_data->>'name',''));
 return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.new_profile();

create function public.member_role() returns text language sql stable security definer set search_path='' as $$
 select role from public.profiles where id=auth.uid() and active;
$$;
create function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.member_role() in ('owner','admin'), false);
$$;
create function public.is_operator() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce(public.member_role() in ('owner','admin','staff'), false);
$$;
create function public.may_write() returns boolean language sql stable security definer set search_path='' as $$
 select coalesce((select active and can_write from public.profiles where id=auth.uid()),false);
$$;
create table public.office_settings(id int primary key default 1 check(id=1), name text not null default 'Hawall mulk', phone text not null default '', address text not null default '');
insert into public.office_settings(id) values(1);
create table public.partner_offices (
 id uuid primary key default gen_random_uuid(), name text not null check(length(trim(name))>0),
 address text not null default '', contact_name text not null default '', phone text not null,
 notes text not null default '', created_at timestamptz not null default now()
);
create sequence public.property_ref_seq;
create sequence public.request_ref_seq;
create table public.properties (
 id uuid primary key default gen_random_uuid(), ref text not null unique default ('HM-'||lpad(nextval('public.property_ref_seq')::text,5,'0')),
 title text not null check(length(trim(title))>0), type text not null check(type in ('house','apartment','land','commercial','other')),
 purpose text not null check(purpose in ('sale','rent')), city text not null check(length(trim(city))>0),
 neighborhood text not null default '', address text not null default '', price numeric check(price>=0),
 currency text not null default 'USD' check(currency in ('USD','IQD')), area numeric check(area>0), bedrooms int check(bedrooms>=0),
 description text not null default '', status text not null default 'available' check(status in ('available','reserved','sold','rented','withdrawn','archived')),
 contact_name text not null default '', phone text not null,
 source_contributor_id uuid references public.profiles(id), source_office_id uuid references public.partner_offices(id),
 created_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now()
);
create table public.client_requests (
 id uuid primary key default gen_random_uuid(), ref text not null unique default ('RQ-'||lpad(nextval('public.request_ref_seq')::text,5,'0')),
 client_name text not null check(length(trim(client_name))>0), phone text not null,
 kind text not null check(kind in ('buy','rent','sell')), type text not null check(type in ('house','apartment','land','commercial','other')),
 city text not null check(length(trim(city))>0), neighborhood text not null default '', currency text not null default 'USD' check(currency in ('USD','IQD')),
 budget_min numeric check(budget_min>=0), budget_max numeric check(budget_max>=0),
 area_min numeric check(area_min>0), area_max numeric check(area_max>0), bedrooms int check(bedrooms>=0),
 notes text not null default '', status text not null default 'open' check(status in ('open','matched','closed','archived')),
 source_contributor_id uuid references public.profiles(id), source_office_id uuid references public.partner_offices(id),
 property_id uuid references public.properties(id), created_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now(),
 check(budget_max is null or budget_min is null or budget_max>=budget_min), check(area_max is null or area_min is null or area_max>=area_min)
);
create table public.assignments (
 id uuid primary key default gen_random_uuid(), property_id uuid references public.properties(id), request_id uuid references public.client_requests(id),
 assignee_id uuid not null references public.profiles(id), kind text not null check(kind in ('find','sell','follow_up')),
 instructions text not null default '', status text not null default 'assigned' check(status in ('assigned','in_progress','completed','canceled')),
 due_date date, assigned_by uuid not null default auth.uid() references public.profiles(id), created_at timestamptz not null default now(),
 check(num_nonnulls(property_id,request_id)=1)
);
create index on public.assignments(assignee_id,status);
create index on public.assignments(property_id);
create index on public.assignments(request_id);
create index on public.properties(source_contributor_id);
create index on public.client_requests(source_contributor_id);
create table public.assignment_updates (
 id uuid primary key default gen_random_uuid(), assignment_id uuid not null references public.assignments(id),
 author_id uuid not null default auth.uid() references public.profiles(id), note text not null check(length(trim(note)) between 1 and 5000), created_at timestamptz not null default now()
);
create table public.property_images (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id), path text not null unique, created_at timestamptz not null default now()
);
create table public.activity_log (
 id bigint generated always as identity primary key, actor_id uuid, target_id text, target_table text not null, operation text not null, created_at timestamptz not null default now()
);
create function public.can_read_property(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.member_role() is not null and exists(select 1 from public.properties p where p.id=target and (public.is_operator() or p.source_contributor_id=auth.uid()
 or exists(select 1 from public.assignments a where a.property_id=target and a.assignee_id=auth.uid() and a.status<>'canceled')));
$$;
create function public.can_read_request(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.member_role() is not null and exists(select 1 from public.client_requests r where r.id=target and (public.is_operator() or r.source_contributor_id=auth.uid()
 or exists(select 1 from public.assignments a where a.request_id=target and a.assignee_id=auth.uid() and a.status<>'canceled')));
$$;
create function public.can_edit_property(target uuid) returns boolean language sql stable security definer set search_path='' as $$
 select public.may_write() and exists(select 1 from public.properties p where p.id=target and (public.is_admin() or (public.member_role()='staff' and p.status<>'archived') or (p.source_contributor_id=auth.uid() and p.status='available')));
$$;
-- Only names and contact details attached to records the caller can already see.
-- This does not grant access to profile phones or private partner-directory notes.
create function public.visible_record_sources() returns table(record_id uuid,record_type text,contributor_name text,office_name text,office_address text,office_contact text,office_phone text)
 language sql stable security definer set search_path='' as $$
 select p.id,'properties'::text,c.name,o.name,o.address,o.contact_name,o.phone from public.properties p
 left join public.profiles c on c.id=p.source_contributor_id left join public.partner_offices o on o.id=p.source_office_id
 where public.can_read_property(p.id)
 union all
 select r.id,'client_requests'::text,c.name,o.name,o.address,o.contact_name,o.phone from public.client_requests r
 left join public.profiles c on c.id=r.source_contributor_id left join public.partner_offices o on o.id=r.source_office_id
 where public.can_read_request(r.id);
$$;

create function public.guard_profile() returns trigger language plpgsql security definer set search_path='' as $$
begin
 -- Only trusted dashboard/bootstrap/service role may bypass application membership checks.
 if auth.uid() is null then return new; end if;
 if new.id<>old.id then raise exception 'immutable identity'; end if;
 if (new.role,new.active,new.can_write) is distinct from (old.role,old.active,old.can_write) then
   if not public.is_admin() then raise exception 'administrator required'; end if;
   if public.member_role()='admin' and (old.role in ('owner','admin') or new.role in ('owner','admin')) then raise exception 'owner required'; end if;
   if old.role='owner' and (new.role<>'owner' or not new.active) then raise exception 'owner cannot be disabled or demoted'; end if;
 end if;
 return new;
end; $$;
create trigger guard_profile before update on public.profiles for each row execute function public.guard_profile();
create function public.guard_record() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return new; end if;
 if not public.is_admin() then
   if tg_op='INSERT' then
     if new.status='archived' then raise exception 'administrator must archive records'; end if;
   elsif new.status is distinct from old.status and (new.status='archived' or old.status='archived') then
     raise exception 'administrator must archive or restore records';
   end if;
 end if;
 if tg_op='UPDATE' then
   if (new.id,new.created_by,new.created_at,new.ref) is distinct from (old.id,old.created_by,old.created_at,old.ref) then raise exception 'immutable record identity'; end if;
   if not public.is_operator() then
     if (new.source_contributor_id,new.source_office_id) is distinct from (old.source_contributor_id,old.source_office_id) then raise exception 'immutable source'; end if;
     if new.status<>old.status then raise exception 'staff must change record status'; end if;
   end if;
 end if;
 if new.phone !~ '^\+[1-9][0-9]{7,14}$' then raise exception 'international phone required'; end if;
 if tg_table_name='client_requests' then
   if new.property_id is not null then
     if not public.can_read_property(new.property_id) then raise exception 'inaccessible linked property'; end if;
   end if;
 end if;
 return new;
end; $$;
create trigger guard_property before insert or update on public.properties for each row execute function public.guard_record();
create trigger guard_request before insert or update on public.client_requests for each row execute function public.guard_record();
create function public.guard_assignment() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then return new; end if;
 if tg_op='INSERT' or public.is_admin() then
   if not exists(select 1 from public.profiles where id=new.assignee_id and active) then raise exception 'inactive assignee'; end if;
   return new;
 end if;
 if (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then raise exception 'only progress may be changed'; end if;
 if old.status='canceled' or new.status not in ('assigned','in_progress','completed') then raise exception 'assignment revoked'; end if;
 return new;
end; $$;
create trigger guard_assignment before insert or update on public.assignments for each row execute function public.guard_assignment();
create function public.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.activity_log(actor_id,target_id,target_table,operation) values(auth.uid(),new.id::text,tg_table_name,tg_op);
 return new;
end; $$;
create trigger audit_property after insert or update on public.properties for each row execute function public.audit_change();
create trigger audit_request after insert or update on public.client_requests for each row execute function public.audit_change();
create trigger audit_assignment after insert or update on public.assignments for each row execute function public.audit_change();
create trigger audit_profile after update on public.profiles for each row execute function public.audit_change();

alter table public.profiles enable row level security;
alter table public.office_settings enable row level security;
alter table public.partner_offices enable row level security;
alter table public.properties enable row level security;
alter table public.client_requests enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_updates enable row level security;
alter table public.property_images enable row level security;
alter table public.activity_log enable row level security;

create policy profiles_read on public.profiles for select to authenticated using(public.member_role() is not null and (id=auth.uid() or public.is_operator()));
create policy profiles_update on public.profiles for update to authenticated using(public.member_role() is not null and (id=auth.uid() or public.is_admin())) with check(public.member_role() is not null and (id=auth.uid() or public.is_admin()));
create policy settings_read on public.office_settings for select to authenticated using(public.member_role() is not null);
create policy settings_update on public.office_settings for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy partners_read on public.partner_offices for select to authenticated using(public.is_operator());
create policy partners_insert on public.partner_offices for insert to authenticated with check(public.is_operator() and public.may_write());
create policy partners_update on public.partner_offices for update to authenticated using(public.is_operator() and public.may_write()) with check(public.is_operator() and public.may_write());

create policy properties_read on public.properties for select to authenticated using(public.member_role() is not null and (public.is_operator() or source_contributor_id=auth.uid() or exists(select 1 from public.assignments a where a.property_id=properties.id and a.assignee_id=auth.uid() and a.status<>'canceled')));
create policy properties_insert on public.properties for insert to authenticated with check(public.may_write() and created_by=auth.uid() and (public.is_operator() or (source_contributor_id=auth.uid() and source_office_id is null and status='available')));
create policy properties_update on public.properties for update to authenticated using(public.can_edit_property(id)) with check(public.may_write() and (public.is_operator() or source_contributor_id=auth.uid()));
create policy requests_read on public.client_requests for select to authenticated using(public.member_role() is not null and (public.is_operator() or source_contributor_id=auth.uid() or exists(select 1 from public.assignments a where a.request_id=client_requests.id and a.assignee_id=auth.uid() and a.status<>'canceled')));
create policy requests_insert on public.client_requests for insert to authenticated with check(public.may_write() and created_by=auth.uid() and (public.is_operator() or (source_contributor_id=auth.uid() and source_office_id is null and status='open')));
create policy requests_update on public.client_requests for update to authenticated using(public.may_write() and (public.is_admin() or (public.member_role()='staff' and status<>'archived') or (source_contributor_id=auth.uid() and status='open'))) with check(public.may_write() and (public.is_operator() or source_contributor_id=auth.uid()));
create policy assignments_read on public.assignments for select to authenticated using(public.member_role() is not null and (public.is_operator() or assignee_id=auth.uid()));
create policy assignments_insert on public.assignments for insert to authenticated with check(public.is_admin() and assigned_by=auth.uid());
create policy assignments_update on public.assignments for update to authenticated using(public.is_admin() or (public.member_role() is not null and assignee_id=auth.uid() and status<>'canceled')) with check(public.is_admin() or (public.member_role() is not null and assignee_id=auth.uid() and status<>'canceled'));
create policy updates_read on public.assignment_updates for select to authenticated using(exists(select 1 from public.assignments a where a.id=assignment_id and (public.is_operator() or (a.assignee_id=auth.uid() and a.status<>'canceled'))));
create policy updates_insert on public.assignment_updates for insert to authenticated with check(author_id=auth.uid() and public.member_role() is not null and exists(select 1 from public.assignments a where a.id=assignment_id and a.status<>'canceled' and (public.is_admin() or a.assignee_id=auth.uid())));
create policy images_read on public.property_images for select to authenticated using(public.can_read_property(property_id));
create policy images_insert on public.property_images for insert to authenticated with check(public.can_edit_property(property_id) and split_part(path,'/',1)=property_id::text);
create policy images_delete on public.property_images for delete to authenticated using(public.can_edit_property(property_id));
create policy audit_read on public.activity_log for select to authenticated using(public.is_admin());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('property-images','property-images',false,5242880,array['image/jpeg','image/png','image/webp']);
create function public.image_property(path text) returns uuid language plpgsql immutable set search_path='' as $$
begin
 if split_part(path,'/',1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return split_part(path,'/',1)::uuid; end if;
 return null;
end; $$;
create policy photo_read on storage.objects for select to authenticated using(bucket_id='property-images' and public.can_read_property(public.image_property(name)));
create policy photo_insert on storage.objects for insert to authenticated with check(bucket_id='property-images' and public.can_edit_property(public.image_property(name)));
create policy photo_delete on storage.objects for delete to authenticated using(bucket_id='property-images' and public.can_edit_property(public.image_property(name)));

-- Lock down function execution; no application data is available to anon.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke all on function public.new_profile(), public.guard_profile(), public.guard_record(), public.guard_assignment(), public.audit_change() from public, anon, authenticated;
revoke all on function public.member_role(), public.is_admin(), public.is_operator(), public.may_write(), public.can_read_property(uuid), public.can_read_request(uuid), public.can_edit_property(uuid), public.image_property(text) from public, anon;
revoke all on function public.visible_record_sources() from public, anon;
grant execute on function public.visible_record_sources() to authenticated;
grant execute on function public.member_role(), public.is_admin(), public.is_operator(), public.may_write(), public.can_read_property(uuid), public.can_read_request(uuid), public.can_edit_property(uuid), public.image_property(text) to authenticated;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant usage on all sequences in schema public to authenticated;
-- No DELETE policies on core records: archive them to preserve history.
