-- Migration: auto-create teacher profile on signup
-- Phase 10 — Foundation
-- Per RESEARCH A3 (accepted): when a user is created with app_metadata.role='teacher',
-- automatically create the corresponding public.profiles row. Child accounts are
-- created via admin.auth.admin.createUser() in a Server Action (Plan 06), which
-- inserts the profiles row directly. Because teacher signup in Plan 06 (per D-13a)
-- uses admin.createUser(..., app_metadata: { role: 'teacher' }), app_metadata IS set
-- at INSERT time and this trigger fires correctly — no need for a follow-up upsert.

create or replace function public.handle_new_teacher_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text;
  v_name text;
begin
  v_role := new.raw_app_meta_data ->> 'role';

  -- Only create a profile row for teacher signups.
  -- Child profile rows are created by the admin-client Server Action directly,
  -- so app_metadata.role='child' does NOT trigger a duplicate row here (the Plan 06
  -- action inserts the child profile explicitly and tolerates no_data).
  if v_role = 'teacher' then
    v_name := coalesce(
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    );

    insert into public.profiles (user_id, role, display_name, grade_level, class_id)
    values (new.id, 'teacher', v_name, null, null)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created_create_teacher_profile
after insert on auth.users
for each row execute function public.handle_new_teacher_user();
