-- ════════════════════════════════════════════════════════════════════════════
--  OdontoApp — sincronización segura por registros
--  Pega TODO este archivo en Supabase → SQL Editor → Run.  Es seguro ejecutarlo más de una vez.
--
--  Qué crea:
--   • clinics / clinic_members : tu clínica y quién puede entrar (cuentas de Supabase Auth)
--   • sync_records             : un registro por paciente, cita, pago, receta… (en vez de un solo JSON gigante)
--   • RLS                      : solo los miembros de la clínica ven o escriben sus datos. Sin sesión = sin acceso.
--   • create_clinic()          : crea la clínica de tu cuenta la primera vez que te conectas
--   • trigger de versiones     : el servidor RECHAZA una escritura hecha sobre una versión vieja (no se pisan datos)
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.clinics (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Mi clínica',
  created_at timestamptz not null default now()
);

create table if not exists public.clinic_members (
  clinic_id  uuid not null references public.clinics(id) on delete cascade,
  user_id    uuid not null references auth.users(id)    on delete cascade,
  role       text not null default 'owner' check (role in ('owner','staff')),
  created_at timestamptz not null default now(),
  primary key (clinic_id, user_id)
);

create table if not exists public.sync_records (
  clinic_id  uuid    not null references public.clinics(id) on delete cascade,
  kind       text    not null,                 -- patient, pay, appt, tx, diary, img, consent, receta, presup, odo, egreso, ...
  id         text    not null,                 -- id del registro (en hijos: "idPaciente/idElemento")
  rev        integer not null default 1,       -- versión: sube de 1 en 1 en cada cambio
  data       jsonb,                            -- contenido (null si fue eliminado)
  deleted    boolean not null default false,   -- "lápida": así se propagan los borrados a los demás dispositivos
  updated_at timestamptz not null default clock_timestamp(),
  updated_by uuid,
  primary key (clinic_id, kind, id)
);
create index if not exists sync_records_pull_idx on public.sync_records (clinic_id, updated_at);

-- ── Versiones: el servidor fija la hora y exige rev = rev anterior + 1 ──────────────
create or replace function public.sync_records_guard() returns trigger
language plpgsql as $$
begin
  if tg_op = 'UPDATE' then
    if new.rev <> old.rev + 1 then
      raise exception 'Conflicto de versión: se esperaba rev % y llegó %', old.rev + 1, new.rev using errcode = '40001';
    end if;
    new.clinic_id := old.clinic_id;  new.kind := old.kind;  new.id := old.id;   -- la clave no se puede cambiar
  else
    new.rev := 1;
  end if;
  new.updated_at := clock_timestamp();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists sync_records_guard on public.sync_records;
create trigger sync_records_guard before insert or update on public.sync_records
  for each row execute function public.sync_records_guard();

-- ── Seguridad (RLS) ─────────────────────────────────────────────────────────────────
alter table public.clinics        enable row level security;
alter table public.clinic_members enable row level security;
alter table public.sync_records   enable row level security;

create or replace function public.is_clinic_member(c uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.clinic_members m where m.clinic_id = c and m.user_id = auth.uid());
$$;

drop policy if exists clinics_select on public.clinics;
create policy clinics_select on public.clinics for select to authenticated using (public.is_clinic_member(id));

drop policy if exists members_select on public.clinic_members;
create policy members_select on public.clinic_members for select to authenticated using (user_id = auth.uid());

drop policy if exists sync_select on public.sync_records;
create policy sync_select on public.sync_records for select to authenticated using (public.is_clinic_member(clinic_id));
drop policy if exists sync_insert on public.sync_records;
create policy sync_insert on public.sync_records for insert to authenticated with check (public.is_clinic_member(clinic_id));
drop policy if exists sync_update on public.sync_records;
create policy sync_update on public.sync_records for update to authenticated
  using (public.is_clinic_member(clinic_id)) with check (public.is_clinic_member(clinic_id));
-- (No hay política de DELETE a propósito: los borrados son "lápidas", nadie puede vaciar la tabla por accidente.)

revoke all on public.clinics, public.clinic_members, public.sync_records from anon;
grant  select on public.clinics, public.clinic_members to authenticated;
grant  select, insert, update on public.sync_records to authenticated;

-- ── Crear la clínica de tu cuenta (la app lo llama una sola vez) ────────────────────
create or replace function public.create_clinic(p_name text default 'Mi clínica') returns uuid
language plpgsql security definer set search_path = public as $$
declare c uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado' using errcode = '28000'; end if;
  insert into public.clinics(name) values (coalesce(nullif(trim(p_name), ''), 'Mi clínica')) returning id into c;
  insert into public.clinic_members(clinic_id, user_id, role) values (c, auth.uid(), 'owner');
  return c;
end $$;
revoke all on function public.create_clinic(text) from public, anon;
grant execute on function public.create_clinic(text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
--  DESPUÉS de comprobar que todo sincroniza bien (no antes): cierra las tablas antiguas.
--  La política "public_access" dejaba los datos abiertos a cualquiera que tuviera la clave pública.
--  Quita los comentarios (--) de las líneas que correspondan y ejecútalas:
--
--  drop policy if exists "public_access" on public.clinica_data;
--  create policy "solo_con_sesion" on public.clinica_data for all to authenticated using (true) with check (true);
--  drop policy if exists "public_access" on public.clinica_backups;
--  create policy "solo_con_sesion" on public.clinica_backups for all to authenticated using (true) with check (true);
-- ════════════════════════════════════════════════════════════════════════════
