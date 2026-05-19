-- Migration: Paket C — Korrektur & Kommentare durch den Lehrer
-- Lehrer koennen pro Antwort einen Kommentar und pro Abgabe ein Gesamt-Feedback
-- hinterlegen sowie den Korrektur-Zeitpunkt festhalten.
-- Bestehende Migrationen werden NICHT editiert; hier nur additive Aenderungen.

-- ============================================================
-- 1. Neue Spalten
-- ============================================================

-- Kommentar des Lehrers pro einzelner Antwort.
alter table public.submission_answers
  add column if not exists teacher_comment text;

-- Gesamt-Feedback des Lehrers fuer die komplette Abgabe.
alter table public.assignment_submissions
  add column if not exists teacher_feedback text;

-- Zeitpunkt der Korrektur.
alter table public.assignment_submissions
  add column if not exists graded_at timestamptz;

-- ============================================================
-- 2. Guard-Trigger erweitern: teacher_comment fuer Schueler sperren
-- ============================================================
-- private.guard_answer_is_correct (aus 20260518000001) schuetzt bereits
-- is_correct vor Schueler-Aenderungen. teacher_comment ist ebenfalls ein
-- reines Lehrer-Feld und muss analog gesperrt werden. Der Trigger ist bereits
-- per BEFORE UPDATE auf submission_answers registriert — wir aktualisieren nur
-- die Funktion per "create or replace".
create or replace function private.guard_answer_is_correct()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if current_setting('request.jwt.claims', true) is not null
     and coalesce(
           (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
           ''
         ) = 'authenticated'
     and (select role from public.profiles where user_id = auth.uid() limit 1) = 'child'
  then
    if new.is_correct is distinct from old.is_correct then
      raise exception 'Die Bewertung darf nicht veraendert werden.'
        using errcode = '42501';
    end if;
    if new.teacher_comment is distinct from old.teacher_comment then
      raise exception 'Der Lehrer-Kommentar darf nicht veraendert werden.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- ============================================================
-- 3. SECURITY-DEFINER-Helfer fuer Lehrer-UPDATE-Policies
-- ============================================================
-- Analog zu 20260518000001/3: die tabellen-uebergreifenden Subqueries werden
-- in SECURITY-DEFINER-Funktionen gekapselt, damit keine RLS-Rekursion
-- entsteht (assignment_submissions <-> submission_answers <-> assignments).

-- Gehoert die Abgabe zu einer Aufgabe des aktuellen Lehrers?
create or replace function private.submission_belongs_to_teacher(target_submission uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignment_submissions s
    join public.assignments a on a.id = s.assignment_id
    where s.id = target_submission
      and a.teacher_id = auth.uid()
  );
$$;

-- Gehoert die Antwort (via Submission) zu einer Aufgabe des aktuellen Lehrers?
create or replace function private.answer_belongs_to_teacher(target_answer uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.submission_answers sa
    join public.assignment_submissions s on s.id = sa.submission_id
    join public.assignments a on a.id = s.assignment_id
    where sa.id = target_answer
      and a.teacher_id = auth.uid()
  );
$$;

-- ============================================================
-- 4. Lehrer-UPDATE-Policies (Defense-in-Depth)
-- ============================================================
-- Bisher gab es fuer Lehrer nur SELECT auf assignment_submissions /
-- submission_answers. Damit Korrektur-Updates auch unter einer normalen
-- Lehrer-Session (statt nur ueber den Admin-Client) sauber funktionieren,
-- ergaenzen wir granulare UPDATE-Policies. Der Schreibschutz fuer Schueler
-- bleibt durch den Guard-Trigger bestehen.

create policy "teacher_grades_submissions" on public.assignment_submissions
  for update to authenticated
  using (
    (select private.user_role()) = 'teacher'
    and private.assignment_belongs_to_teacher(assignment_id)
  )
  with check (
    (select private.user_role()) = 'teacher'
    and private.assignment_belongs_to_teacher(assignment_id)
  );

create policy "teacher_grades_answers" on public.submission_answers
  for update to authenticated
  using (
    (select private.user_role()) = 'teacher'
    and private.submission_belongs_to_teacher(submission_id)
  )
  with check (
    (select private.user_role()) = 'teacher'
    and private.submission_belongs_to_teacher(submission_id)
  );
