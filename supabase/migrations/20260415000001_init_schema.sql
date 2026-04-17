-- Migration: init schema
-- Phase 10 — Foundation
-- Per CONTEXT D-10a / RESEARCH A1: a separate plaintext PIN column is INTENTIONALLY OMITTED.
--   The PIN lives only as a bcrypt hash inside auth.users.encrypted_password.
--   The nullable pin_hint column is a teacher-visible hint (e.g. "Geburtstag
--   deiner Schwester") — NEVER the PIN itself. Default null.

-- gen_random_uuid() is built-in to PostgreSQL 14+ (Supabase default).
-- No extension needed — uuid-ossp is installed in the extensions schema on
-- Supabase Cloud and gen_random_uuid() would require schema-qualification.

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subscription_tier text not null default 'free'
    check (subscription_tier in ('free', 'grundschule', 'foerderung', 'experte')),
  created_at timestamptz not null default now()
);

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('child', 'teacher')),
  display_name text not null,
  grade_level int check (grade_level between 1 and 4),
  class_id uuid references public.classes(id) on delete set null,
  pin_hint text,                                -- nullable; teacher-visible hint only (D-10a). NEVER the PIN.
  created_at timestamptz not null default now(),
  unique (class_id, display_name)
);

create table public.progress_entries (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  operation_type text not null
    check (operation_type in ('addition', 'subtraktion', 'multiplikation', 'division')),
  grade int not null check (grade between 1 and 4),
  correct boolean not null,
  points_earned int not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes for RLS-performance (per RESEARCH Pattern 8)
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_class_id on public.profiles(class_id);
create index if not exists idx_classes_teacher_id on public.classes(teacher_id);
create index if not exists idx_classes_school_id on public.classes(school_id);
create index if not exists idx_progress_entries_child_id on public.progress_entries(child_id);
create index if not exists idx_progress_entries_created_at on public.progress_entries(created_at);
