begin;
alter table public.client_requests add column if not exists phone_secondary text;
do $$ begin
 if not exists(select 1 from pg_constraint where conname='requests_secondary_phone_format' and conrelid='public.client_requests'::regclass) then
  alter table public.client_requests add constraint requests_secondary_phone_format check(phone_secondary is null or phone_secondary ~ '^\+[1-9][0-9]{7,14}$');
 end if;
end; $$;
notify pgrst,'reload schema';
commit;
