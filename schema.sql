-- ═══════════════════════════════════════════════════════════
-- EduAI Pro — Schema de base de datos para Supabase
-- Ejecutar en: Supabase → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- ── PROFILES ──────────────────────────────────────────────────
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null default '',
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Perfil propio" on profiles for all using (auth.uid() = id);

-- Trigger: crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── SUBJECTS ──────────────────────────────────────────────────
create table if not exists subjects (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  name text not null,
  level text not null default 'Secundario (4°-6°)',
  materials text default '',
  created_at timestamptz default now()
);
alter table subjects enable row level security;
create policy "Materias propias" on subjects for all using (auth.uid() = user_id);
create index subjects_user_idx on subjects (user_id);

-- ── LIBRARY ITEMS ─────────────────────────────────────────────
create table if not exists library_items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  type text not null,
  type_name text not null,
  topic text not null,
  subject_name text default '',
  content text not null,
  created_at timestamptz default now()
);
alter table library_items enable row level security;
create policy "Biblioteca propia" on library_items for all using (auth.uid() = user_id);
create index library_user_idx on library_items (user_id);

-- ── QUESTION BANK ─────────────────────────────────────────────
create table if not exists question_bank (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  topic text not null,
  subject_name text default '',
  content text not null,
  created_at timestamptz default now()
);
alter table question_bank enable row level security;
create policy "Banco propio" on question_bank for all using (auth.uid() = user_id);
create index bank_user_idx on question_bank (user_id);
