-- Migration: RLS policies with SECURITY DEFINER helpers
-- Phase 10 — Foundation

-- 1. Helper schema + functions
create schema if not exists private;

create or replace function private.user_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function private.user_class_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select class_id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function private.is_teacher_of_class(target_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes
    where id = target_class_id and teacher_id = auth.uid()
  );
$$;

-- 2. Enable RLS on all public tables
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.schools enable row level security;
alter table public.progress_entries enable row level security;

-- 3. profiles policies
create policy "child_reads_own_profile"
on public.profiles for select
to authenticated
using ( (select auth.uid()) = user_id );

create policy "teacher_reads_class_profiles"
on public.profiles for select
to authenticated
using (
  (select private.user_role()) = 'teacher'
  and class_id in (
    select id from public.classes where teacher_id = (select auth.uid())
  )
);

create policy "user_updates_own_profile"
on public.profiles for update
to authenticated
using ( (select auth.uid()) = user_id )
with check ( (select auth.uid()) = user_id );

-- 4. progress_entries policies
create policy "child_inserts_own_progress"
on public.progress_entries for insert
to authenticated
with check ( child_id = (select auth.uid()) );

create policy "child_reads_own_progress"
on public.progress_entries for select
to authenticated
using ( child_id = (select auth.uid()) );

create policy "teacher_reads_class_progress"
on public.progress_entries for select
to authenticated
using (
  (select private.user_role()) = 'teacher'
  and child_id in (
    select user_id from public.profiles
    where class_id in (
      select id from public.classes where teacher_id = (select auth.uid())
    )
  )
);

-- 5. classes policies
create policy "teacher_reads_own_classes"
on public.classes for select
to authenticated
using ( teacher_id = (select auth.uid()) );

create policy "teacher_manages_own_classes"
on public.classes for all
to authenticated
using ( teacher_id = (select auth.uid()) )
with check ( teacher_id = (select auth.uid()) );

-- 6. schools policies (Phase 10: teacher reads schools they have classes in)
create policy "teacher_reads_own_schools"
on public.schools for select
to authenticated
using (
  id in (
    select school_id from public.classes where teacher_id = (select auth.uid())
  )
);

-- 7. schools INSERT policy (Phase 10: teacher creates their own school during signup).
-- Without this, the teacherSignup server action's school INSERT would be blocked by RLS
-- when using a user-context client. The admin client (service-role) bypasses RLS, but we
-- also want the row-level guard to be explicit. Constrain INSERT to authenticated users:
create policy "teacher_inserts_own_schools"
on public.schools for insert
to authenticated
with check ( true );
