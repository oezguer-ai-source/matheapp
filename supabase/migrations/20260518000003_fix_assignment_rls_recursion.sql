-- Migration: RLS-Rekursion zwischen assignment_classes und assignments beheben
-- (Theo — behebt Bug 2: Lehrer-Aufgaben beim Schueler nicht sichtbar)
--
-- Problem (Postgres-Fehler 42P17 "infinite recursion detected in policy"):
-- Die Schueler-Lese-Policies bilden einen Zyklus, weil beide tabellen-
-- uebergreifend per inline-Subquery auf die jeweils andere Tabelle lesen und
-- damit deren RLS-Policies erneut auswerten:
--
--   assignment_classes
--     -> teacher_manages_class_assignments  (Subquery auf public.assignments)
--   public.assignments
--     -> student_reads_assigned_assignments (Subquery auf public.assignment_classes)
--   ... und wieder von vorn.
--
-- Sobald ein Schueler `select ... from assignment_classes` ausfuehrt, wertet
-- Postgres beide Policy-Saetze ineinander aus und bricht mit 42P17 ab. Fuer
-- Schueler liefert die Query daher IMMER einen Fehler — die Aufgaben-Liste
-- in /kind/aufgaben bleibt leer. Genau dieselbe Klasse Bug wie in
-- 20260418000003_fix_school_rls_recursion.sql.
--
-- Fix (analog 20260418000003): die tabellen-uebergreifenden Subqueries in
-- SECURITY-DEFINER-Helfern kapseln. SECURITY DEFINER laeuft mit den Rechten
-- des Funktions-Owners und umgeht RLS, damit ist der Auswertungs-Zyklus
-- durchbrochen. Bestehende Migrationen werden NICHT editiert.

-- ============================================================
-- 1. SECURITY-DEFINER-Helfer
-- ============================================================

-- Gehoert die Aufgabe dem aktuellen Lehrer? (RLS-frei, durchbricht den Zyklus)
create or replace function private.assignment_belongs_to_teacher(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignments a
    where a.id = target_assignment
      and a.teacher_id = auth.uid()
  );
$$;

-- private.assignment_in_my_class(uuid) existiert bereits aus 20260518000001
-- (H4) und kapselt die Subquery auf assignment_classes RLS-frei. Wird unten
-- fuer die Schueler-Lese-Policy auf assignments wiederverwendet.

-- ============================================================
-- 2. assignment_classes — Lehrer-Policy ohne Subquery auf assignments
-- ============================================================
drop policy if exists "teacher_manages_class_assignments" on public.assignment_classes;

create policy "teacher_manages_class_assignments" on public.assignment_classes
  for all to authenticated
  using (private.assignment_belongs_to_teacher(assignment_id))
  with check (private.assignment_belongs_to_teacher(assignment_id));

-- student_reads_class_assignments (20260419000001) bleibt unveraendert:
--   using (class_id = (select private.user_class_id()))
-- — kein Tabellen-Zugriff, kein Rekursions-Anteil.

-- ============================================================
-- 3. assignments — Schueler-Lese-Policy ohne Subquery auf assignment_classes
-- ============================================================
drop policy if exists "student_reads_assigned_assignments" on public.assignments;

create policy "student_reads_assigned_assignments" on public.assignments
  for select to authenticated
  using (private.assignment_in_my_class(id));

-- assignment_items: student_reads_items (20260419000001) liest per inline-
-- Subquery aus assignment_classes. assignment_items ist an KEINER Policy
-- der anderen Tabellen beteiligt, daher entsteht hier KEIN Zyklus. Trotzdem
-- auf den vorhandenen Helfer umstellen, damit das Muster einheitlich ist und
-- kuenftige Policy-Aenderungen keine neue Rekursion einfuehren.
drop policy if exists "student_reads_items" on public.assignment_items;

create policy "student_reads_items" on public.assignment_items
  for select to authenticated
  using (private.assignment_in_my_class(assignment_id));
