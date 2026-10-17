-- Prueba de clinic_backups: aislamiento entre clínicas, anon sin acceso, borrado solo propio. Se ejecuta con psql -v ON_ERROR_STOP=0 y se revisan los NOTICE.
\set QUIET on
insert into auth.users(id,email) values ('00000000-0000-0000-0000-00000000000a','a@x.com'),('00000000-0000-0000-0000-00000000000b','b@x.com') on conflict do nothing;
set role authenticated; select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000a"}',false);
select public.create_clinic('A') as ca \gset
set role postgres; set role authenticated; select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b"}',false);
select public.create_clinic('B') as cb \gset
set role postgres;
\echo === A guarda en su clínica (debe funcionar)
set role authenticated; select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000a"}',false);
insert into public.clinic_backups(clinic_id,version,nota,size_bytes,backup_data) values (:'ca','v1','n',10,'{"patients":[]}') returning created_by is not null as con_autor;
\echo === A intenta guardar en la clínica de B (debe FALLAR)
insert into public.clinic_backups(clinic_id,version,backup_data) values (:'cb','x','{}');
\echo === B intenta leer lo de A (debe ser 0 filas)
set role postgres; set role authenticated; select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000b"}',false);
select count(*) as filas_vistas_por_B from public.clinic_backups;
\echo === B intenta borrar lo de A (0 filas borradas)
with d as (delete from public.clinic_backups returning 1) select count(*) as borradas_por_B from d;
\echo === anon (sin sesión) intenta leer (debe FALLAR)
set role postgres; set role anon;
select count(*) from public.clinic_backups;
\echo === A lee y borra lo suyo (1 y 1)
set role postgres; set role authenticated; select set_config('request.jwt.claims','{"sub":"00000000-0000-0000-0000-00000000000a"}',false);
select count(*) as filas_vistas_por_A from public.clinic_backups;
with d as (delete from public.clinic_backups returning 1) select count(*) as borradas_por_A from d;
\echo === A no puede editar un respaldo (UPDATE sin permiso: debe FALLAR)
update public.clinic_backups set nota='x';
