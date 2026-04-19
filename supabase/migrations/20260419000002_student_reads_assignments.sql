-- Fix 1: Schüler konnten Aufgaben-Metadaten nicht lesen, weil auf public.assignments
-- nur eine teacher_manages_assignments-Policy existierte. Dadurch lieferte die
-- Abfrage in /kind/aufgaben zwar die zugewiesenen IDs, aber keine Titel/Fälligkeit.

create policy "student_reads_assigned_assignments" on public.assignments
  for select to authenticated
  using (
    id in (
      select ac.assignment_id from public.assignment_classes ac
      where ac.class_id = (select private.user_class_id())
    )
  );

-- Fix 2: Die Client-Actions (submitAssignmentAction, startAssignmentAction) schreiben
-- attempts_used und is_correct, und die Typ-Definition in types/database.types.ts
-- deklariert sie. Die ursprüngliche Migration hatte diese Spalten aber nicht angelegt.

alter table public.assignment_submissions
  add column if not exists attempts_used int not null default 0;

alter table public.submission_answers
  add column if not exists is_correct boolean;
