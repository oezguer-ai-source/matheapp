-- Migration: Nachrichten- und Aufgaben-System
-- Nachrichten zwischen Lehrern und Schülern/Klassen
-- Aufgaben mit Baukasten-Items und Schüler-Abgaben

-- ============================================
-- 1. Nachrichten
-- ============================================

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  -- recipient_id = einzelner Schüler (NULL bei Klassennachricht)
  recipient_id uuid references auth.users(id) on delete cascade,
  -- class_id = Klassennachricht (NULL bei Direktnachricht)
  class_id uuid references public.classes(id) on delete cascade,
  subject text not null default '',
  body text not null,
  created_at timestamptz not null default now(),
  -- Entweder recipient_id oder class_id muss gesetzt sein
  constraint messages_target_check check (
    recipient_id is not null or class_id is not null
  )
);

-- Gelesen-Status pro Empfänger
create table public.message_reads (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index idx_messages_sender on public.messages(sender_id);
create index idx_messages_recipient on public.messages(recipient_id);
create index idx_messages_class on public.messages(class_id);
create index idx_messages_created on public.messages(created_at desc);

-- ============================================
-- 2. Aufgaben
-- ============================================

-- Aufgabe (Container)
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text not null default '',
  due_date timestamptz not null,
  created_at timestamptz not null default now()
);

-- Aufgaben-Items (Freitext oder Multiple-Choice)
create table public.assignment_items (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  sort_order int not null default 0,
  -- 'text' = Freitext-Antwort, 'choice' = Multiple-Choice
  item_type text not null check (item_type in ('text', 'choice')),
  question text not null,
  -- Bei Multiple-Choice: JSON-Array der Optionen, z.B. ["Option A", "Option B"]
  options jsonb,
  -- Bei Multiple-Choice: Index der korrekten Antwort(en), z.B. [0] oder [0,2]
  correct_options jsonb,
  created_at timestamptz not null default now()
);

-- Zuweisung einer Aufgabe an eine Klasse
create table public.assignment_classes (
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  primary key (assignment_id, class_id)
);

-- Schüler-Abgabe für eine Aufgabe
create table public.assignment_submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  -- 'in_progress' | 'submitted'
  status text not null default 'in_progress'
    check (status in ('in_progress', 'submitted')),
  started_at timestamptz not null default now(),
  submitted_at timestamptz,
  -- Dauer in Sekunden (berechnet bei Abgabe)
  duration_seconds int,
  created_at timestamptz not null default now(),
  unique (assignment_id, student_id)
);

-- Antworten pro Item
create table public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.assignment_submissions(id) on delete cascade,
  item_id uuid not null references public.assignment_items(id) on delete cascade,
  -- Freitext-Antwort
  text_answer text,
  -- Multiple-Choice: gewählte Optionen als JSON-Array, z.B. [1]
  selected_options jsonb,
  created_at timestamptz not null default now(),
  unique (submission_id, item_id)
);

create index idx_assignments_teacher on public.assignments(teacher_id);
create index idx_assignment_items_assignment on public.assignment_items(assignment_id);
create index idx_assignment_classes_class on public.assignment_classes(class_id);
create index idx_submissions_assignment on public.assignment_submissions(assignment_id);
create index idx_submissions_student on public.assignment_submissions(student_id);
create index idx_submission_answers_submission on public.submission_answers(submission_id);

-- ============================================
-- 3. RLS Policies
-- ============================================

alter table public.messages enable row level security;
alter table public.message_reads enable row level security;
alter table public.assignments enable row level security;
alter table public.assignment_items enable row level security;
alter table public.assignment_classes enable row level security;
alter table public.assignment_submissions enable row level security;
alter table public.submission_answers enable row level security;

-- Nachrichten: Lehrer kann eigene Nachrichten lesen
create policy "teacher_reads_own_messages" on public.messages
  for select to authenticated
  using (sender_id = (select auth.uid()));

-- Nachrichten: Schüler kann Nachrichten lesen die an ihn oder seine Klasse gehen
create policy "student_reads_messages" on public.messages
  for select to authenticated
  using (
    recipient_id = (select auth.uid())
    or class_id = (select private.user_class_id())
  );

-- Nachrichten: Authentifizierte Benutzer können Nachrichten senden
create policy "user_sends_messages" on public.messages
  for insert to authenticated
  with check (sender_id = (select auth.uid()));

-- Message reads
create policy "user_manages_own_reads" on public.message_reads
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Aufgaben: Lehrer sieht eigene Aufgaben
create policy "teacher_manages_assignments" on public.assignments
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (teacher_id = (select auth.uid()));

-- Aufgaben-Items: Lehrer sieht Items eigener Aufgaben
create policy "teacher_manages_items" on public.assignment_items
  for all to authenticated
  using (
    assignment_id in (
      select id from public.assignments where teacher_id = (select auth.uid())
    )
  )
  with check (
    assignment_id in (
      select id from public.assignments where teacher_id = (select auth.uid())
    )
  );

-- Schüler sieht Items zugewiesener Aufgaben
create policy "student_reads_items" on public.assignment_items
  for select to authenticated
  using (
    assignment_id in (
      select ac.assignment_id from public.assignment_classes ac
      where ac.class_id = (select private.user_class_id())
    )
  );

-- Klassen-Zuweisungen: Lehrer verwaltet
create policy "teacher_manages_class_assignments" on public.assignment_classes
  for all to authenticated
  using (
    assignment_id in (
      select id from public.assignments where teacher_id = (select auth.uid())
    )
  )
  with check (
    assignment_id in (
      select id from public.assignments where teacher_id = (select auth.uid())
    )
  );

-- Schüler sieht eigene Klassen-Zuweisungen
create policy "student_reads_class_assignments" on public.assignment_classes
  for select to authenticated
  using (class_id = (select private.user_class_id()));

-- Abgaben: Schüler verwaltet eigene
create policy "student_manages_submissions" on public.assignment_submissions
  for all to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

-- Abgaben: Lehrer sieht Abgaben seiner Aufgaben
create policy "teacher_reads_submissions" on public.assignment_submissions
  for select to authenticated
  using (
    assignment_id in (
      select id from public.assignments where teacher_id = (select auth.uid())
    )
  );

-- Antworten: Schüler verwaltet eigene
create policy "student_manages_answers" on public.submission_answers
  for all to authenticated
  using (
    submission_id in (
      select id from public.assignment_submissions where student_id = (select auth.uid())
    )
  )
  with check (
    submission_id in (
      select id from public.assignment_submissions where student_id = (select auth.uid())
    )
  );

-- Antworten: Lehrer sieht Antworten seiner Aufgaben
create policy "teacher_reads_answers" on public.submission_answers
  for select to authenticated
  using (
    submission_id in (
      select s.id from public.assignment_submissions s
      join public.assignments a on a.id = s.assignment_id
      where a.teacher_id = (select auth.uid())
    )
  );
