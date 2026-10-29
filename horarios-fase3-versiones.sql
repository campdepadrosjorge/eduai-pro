-- ============================================================
-- AulaXpro · Horarios Fase 3 — versiones guardadas del horario
-- Permite guardar un horario con nombre/año y cargarlo como base
-- al empezar un ciclo nuevo (reusa los mismos cursos/docentes/materias).
-- Idempotente. Aplicar en Supabase → SQL Editor.
-- ============================================================

-- Cabecera de cada versión guardada
create table if not exists public.hor_horario_versiones (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  nombre text not null,                 -- ej: "Ciclo 2025"
  anio int,                             -- ej: 2025
  cantidad_clases int default 0,        -- resumen para la lista
  created_at timestamptz default now()
);

-- Clases de cada versión (copia de hor_horario al momento de guardar)
create table if not exists public.hor_horario_version_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  version_id uuid references public.hor_horario_versiones(id) on delete cascade,
  asignacion_id uuid,
  curso_id uuid,
  docente_id uuid,
  materia_id uuid,
  espacio_id uuid,
  dia text not null,
  modulo_orden int not null,
  turno text not null default 'manana'
);

create index if not exists idx_hor_versiones_owner on public.hor_horario_versiones(owner_id);
create index if not exists idx_hor_version_items_version on public.hor_horario_version_items(version_id);
create index if not exists idx_hor_version_items_owner on public.hor_horario_version_items(owner_id);

-- RLS: cada directivo ve y gestiona solo lo suyo
do $$
declare t text;
begin
  foreach t in array array['hor_horario_versiones','hor_horario_version_items']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "owner_all_%s" on public.%I;', t, t);
    execute format(
      'create policy "owner_all_%s" on public.%I for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());',
      t, t
    );
  end loop;
end $$;
