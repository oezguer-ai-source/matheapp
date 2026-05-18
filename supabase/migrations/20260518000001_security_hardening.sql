-- Migration: Sicherheits-Hardening (Theo-Audit H1-H5, M3, M5, N4)
-- Behebt kritische RLS-Luecken: Rollen-Eskalation, Nachrichten-Spoofing,
-- Schul-Tier-Manipulation, Aufgaben-Cross-Class-Zugriff sowie Punkte-Manipulation.
-- Bestehende Migrationen werden NICHT editiert; hier nur additive Aenderungen.

-- ============================================================
-- H2 — Rollen-Eskalation: profiles.role / class_id schreibgeschuetzt
-- ============================================================
-- Die bestehende Policy "user_updates_own_profile" erlaubt Kindern, beliebige
-- Spalten ihres eigenen Profils zu aendern — auch role ('child' -> 'teacher')
-- und class_id (Wechsel in eine fremde Klasse). Spalten-granulare RLS ist in
-- Postgres nicht moeglich, daher ein BEFORE-UPDATE-Guard-Trigger:
-- Service-Role (z. B. teacherSignup) bleibt unberuehrt, weil der Trigger nur
-- auf authentifizierte Endnutzer-Sessions wirkt.

create or replace function private.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Service-Role (admin.ts) und der Postgres-Owner duerfen alles aendern.
  -- Endnutzer (authenticated) duerfen role und class_id NICHT selbst setzen.
  if current_setting('request.jwt.claims', true) is not null
     and coalesce(
           (current_setting('request.jwt.claims', true)::jsonb ->> 'role'),
           ''
         ) = 'authenticated'
  then
    if new.role is distinct from old.role then
      raise exception 'Die Rolle darf nicht veraendert werden.'
        using errcode = '42501';
    end if;
    if new.class_id is distinct from old.class_id then
      raise exception 'Die Klassenzuordnung darf nicht veraendert werden.'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_update on public.profiles;
create trigger trg_guard_profile_update
  before update on public.profiles
  for each row
  execute function private.guard_profile_update();

-- ============================================================
-- H1 — messages-INSERT: Spoofing verhindern
-- ============================================================
-- Bisher: jeder Authentifizierte durfte beliebige Nachrichten mit beliebiger
-- class_id / recipient_id einfuegen, solange sender_id = auth.uid().
-- Neu: Klassennachrichten nur von Lehrern in ihre eigene Klasse; Direktnach-
-- richten nur an Mitglieder einer eigenen Klasse (Lehrer) bzw. an den Lehrer
-- der eigenen Klasse (Kind).

-- Helfer: gehoert die Ziel-Klasse dem aktuellen Lehrer?
-- (private.is_teacher_of_class existiert bereits aus 20260415000002.)

-- Helfer: ist target_user Mitglied einer Klasse des aktuellen Lehrers?
create or replace function private.is_student_of_my_class(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    join public.classes c on c.id = p.class_id
    where p.user_id = target_user
      and c.teacher_id = auth.uid()
  );
$$;

-- Helfer: ist target_user der Lehrer der eigenen Klasse? (fuer Kind -> Lehrer)
create or replace function private.is_my_class_teacher(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes c
    where c.id = (
            select class_id from public.profiles where user_id = auth.uid() limit 1
          )
      and c.teacher_id = target_user
  );
$$;

drop policy if exists "user_sends_messages" on public.messages;

create policy "validated_message_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = (select auth.uid())
    and (
      -- Fall A: Klassennachricht — nur Lehrer, nur eigene Klasse,
      -- recipient_id muss leer sein.
      (
        class_id is not null
        and recipient_id is null
        and (select private.user_role()) = 'teacher'
        and private.is_teacher_of_class(class_id)
      )
      or
      -- Fall B: Direktnachricht Lehrer -> Schueler der eigenen Klasse.
      (
        recipient_id is not null
        and class_id is null
        and (select private.user_role()) = 'teacher'
        and private.is_student_of_my_class(recipient_id)
      )
      or
      -- Fall C: Direktnachricht Kind -> Lehrer der eigenen Klasse.
      (
        recipient_id is not null
        and class_id is null
        and (select private.user_role()) = 'child'
        and private.is_my_class_teacher(recipient_id)
      )
    )
  );

-- ============================================================
-- H3 — schools-Tier: Kinder-UPDATE entfernen, RPC ersetzt es
-- ============================================================
-- Die freie UPDATE-Policy erlaubte Kindern, jede Spalte ihrer Schule zu
-- aendern (z. B. den Namen). Wir entfernen sie und ersetzen sie durch eine
-- eng begrenzte SECURITY-DEFINER-Funktion (siehe unten upgrade_school_tier).
drop policy if exists "child_upgrades_own_school" on public.schools;

create or replace function public.upgrade_school_tier(tier text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
begin
  -- Nur Kinder duerfen die Demo-Upgrade-Funktion nutzen.
  if (select role from public.profiles where user_id = auth.uid() limit 1) <> 'child' then
    raise exception 'Nur Schueler-Konten duerfen diese Funktion nutzen.'
      using errcode = '42501';
  end if;

  -- Wert gegen erlaubte Tiers validieren.
  if tier not in ('free', 'grundschule', 'foerderung', 'experte', 'demo') then
    raise exception 'Ungueltige Stufe: %', tier
      using errcode = '22023';
  end if;

  -- Schule der eigenen Klasse ermitteln.
  v_school_id := private.user_school_id();
  if v_school_id is null then
    raise exception 'Keine Schule fuer dieses Konto gefunden.'
      using errcode = 'P0002';
  end if;

  update public.schools
  set subscription_tier = tier
  where id = v_school_id;
end;
$$;

revoke all on function public.upgrade_school_tier(text) from public;
grant execute on function public.upgrade_school_tier(text) to authenticated;

-- ============================================================
-- H4 — assignment_submissions / submission_answers an Klasse binden
-- ============================================================
-- Bisher: ein Schueler konnte Abgaben zu JEDER assignment_id anlegen, auch zu
-- Aufgaben, die seiner Klasse nie zugewiesen wurden. Neu: WITH CHECK prueft die
-- Klassen-Zuweisung. Ausserdem wird is_correct fuer Schueler schreibgeschuetzt
-- (Bewertung erfolgt nur ueber Service-Role / Lehrer).

-- Helfer: ist die Aufgabe der Klasse des aktuellen Schuelers zugewiesen?
create or replace function private.assignment_in_my_class(target_assignment uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignment_classes ac
    where ac.assignment_id = target_assignment
      and ac.class_id = (
            select class_id from public.profiles where user_id = auth.uid() limit 1
          )
  );
$$;

-- assignment_submissions: bestehende "for all"-Policy durch granulare ersetzen.
drop policy if exists "student_manages_submissions" on public.assignment_submissions;

create policy "student_reads_own_submissions" on public.assignment_submissions
  for select to authenticated
  using (student_id = (select auth.uid()));

create policy "student_inserts_own_submissions" on public.assignment_submissions
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and private.assignment_in_my_class(assignment_id)
  );

create policy "student_updates_own_submissions" on public.assignment_submissions
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (
    student_id = (select auth.uid())
    and private.assignment_in_my_class(assignment_id)
  );

-- submission_answers: "for all"-Policy ersetzen; is_correct fuer Schueler sperren.
drop policy if exists "student_manages_answers" on public.submission_answers;

-- Helfer: gehoert die Submission dem aktuellen Schueler?
create or replace function private.submission_belongs_to_me(target_submission uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.assignment_submissions s
    where s.id = target_submission
      and s.student_id = auth.uid()
  );
$$;

create policy "student_reads_own_answers" on public.submission_answers
  for select to authenticated
  using (private.submission_belongs_to_me(submission_id));

create policy "student_inserts_own_answers" on public.submission_answers
  for insert to authenticated
  with check (
    private.submission_belongs_to_me(submission_id)
    -- is_correct darf vom Schueler nicht gesetzt werden (nur NULL erlaubt).
    and is_correct is null
  );

create policy "student_updates_own_answers" on public.submission_answers
  for update to authenticated
  using (private.submission_belongs_to_me(submission_id))
  with check (private.submission_belongs_to_me(submission_id));

-- Schreibschutz fuer is_correct: ein Schueler darf den Wert per UPDATE nicht
-- aendern. Spalten-RLS gibt es nicht, daher Guard-Trigger analog zu H2.
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
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_answer_is_correct on public.submission_answers;
create trigger trg_guard_answer_is_correct
  before update on public.submission_answers
  for each row
  execute function private.guard_answer_is_correct();

-- ============================================================
-- H5 — Punkte-Obergrenzen (CHECK-Constraints)
-- ============================================================
-- progress_entries.points_earned: im echten Ueb-Flow max. 30 pro Eintrag
-- (BASE_POINTS 10 * MULTIPLIER hard 3). Obergrenze 100 als Puffer gegen
-- Punkte-Inflation. Untergrenze negativ, damit minigame_redeem-Eintraege
-- (ausgegebene Punkte) weiterhin abziehen koennen.
alter table public.progress_entries
  add constraint progress_entries_points_earned_range
  check (points_earned between -10000 and 100);

-- game_scores.score: bereits >= 0, zusaetzlich Obergrenze gegen Manipulation.
alter table public.game_scores
  drop constraint if exists game_scores_score_check;
alter table public.game_scores
  add constraint game_scores_score_range
  check (score between 0 and 10000);

-- ============================================================
-- M5 — messages_target_check als echtes XOR
-- ============================================================
-- Bisher: "recipient_id is not null OR class_id is not null" — beide
-- gleichzeitig waeren erlaubt (mehrdeutiges Ziel). Jetzt exklusiv.
alter table public.messages
  drop constraint if exists messages_target_check;
alter table public.messages
  add constraint messages_target_check
  check ((recipient_id is not null) <> (class_id is not null));

-- ============================================================
-- M3 — fehlende Indizes
-- ============================================================
create index if not exists idx_progress_entries_child_operation
  on public.progress_entries(child_id, operation_type);
create index if not exists idx_message_reads_user
  on public.message_reads(user_id);
create index if not exists idx_submission_answers_item
  on public.submission_answers(item_id);

-- ============================================================
-- N4 — redundanten Index entfernen
-- ============================================================
-- profiles.user_id ist Primary Key -> der explizite idx_profiles_user_id
-- dupliziert nur den automatischen PK-Index.
drop index if exists public.idx_profiles_user_id;
