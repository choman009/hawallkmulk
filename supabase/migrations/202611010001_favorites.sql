begin;
create table if not exists public.favorites (
 user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 record_table text not null check(record_table in ('properties','client_requests','partner_offices','assignments')),
 record_id uuid not null,
 created_at timestamptz not null default now(),
 primary key(user_id,record_table,record_id)
);
alter table public.favorites enable row level security;
revoke all on public.favorites from public,anon,authenticated;
grant select,insert,delete on public.favorites to authenticated;
drop policy if exists favorites_read on public.favorites;
create policy favorites_read on public.favorites for select to authenticated using(user_id=auth.uid() and public.member_role() is not null);
drop policy if exists favorites_remove on public.favorites;
create policy favorites_remove on public.favorites for delete to authenticated using(user_id=auth.uid() and public.member_role() is not null);
drop policy if exists favorites_add on public.favorites;
create policy favorites_add on public.favorites for insert to authenticated with check(
 user_id=auth.uid() and public.member_role() is not null and case record_table
 when 'properties' then public.can_read_property(record_id)
 when 'client_requests' then public.can_read_request(record_id)
 when 'partner_offices' then exists(select 1 from public.partner_offices o where o.id=record_id)
 when 'assignments' then exists(select 1 from public.assignments a where a.id=record_id)
 else false end
);
notify pgrst,'reload schema';
commit;
