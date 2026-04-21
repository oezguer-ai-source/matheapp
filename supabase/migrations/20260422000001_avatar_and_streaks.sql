-- Migration: Avatar (Dino) + Streak-State pro Kind
-- XP/Level und Tages-Streak werden in separaten Tabellen gespeichert,
-- damit Lehrer sie lesen können ohne teure Aggregationen.

create table public.avatar_state (
  child_id uuid primary key references auth.users(id) on delete cascade,
  level int not null default 1 check (level between 1 and 10),
  xp int not null default 0 check (xp >= 0),
  dino_name text not null default 'Rexi',
  updated_at timestamptz not null default now()
);

create table public.streak_state (
  child_id uuid primary key references auth.users(id) on delete cascade,
  current_streak int not null default 0 check (current_streak >= 0),
  best_streak int not null default 0 check (best_streak >= 0),
  last_active_day date,
  updated_at timestamptz not null default now()
);

create index idx_avatar_state_level on public.avatar_state(level);
create index idx_streak_state_current on public.streak_state(current_streak desc);

alter table public.avatar_state enable row level security;
alter table public.streak_state enable row level security;

-- Kind: eigenen State lesen/schreiben
create policy "child_reads_own_avatar" on public.avatar_state
  for select to authenticated using (child_id = (select auth.uid()));
create policy "child_writes_own_avatar" on public.avatar_state
  for all to authenticated
  using (child_id = (select auth.uid()))
  with check (child_id = (select auth.uid()));

create policy "child_reads_own_streak" on public.streak_state
  for select to authenticated using (child_id = (select auth.uid()));
create policy "child_writes_own_streak" on public.streak_state
  for all to authenticated
  using (child_id = (select auth.uid()))
  with check (child_id = (select auth.uid()));

-- Lehrer: Klasse lesen
create policy "teacher_reads_class_avatar" on public.avatar_state
  for select to authenticated using (
    (select private.user_role()) = 'teacher'
    and child_id in (
      select user_id from public.profiles
      where class_id in (select id from public.classes where teacher_id = (select auth.uid()))
    )
  );

create policy "teacher_reads_class_streak" on public.streak_state
  for select to authenticated using (
    (select private.user_role()) = 'teacher'
    and child_id in (
      select user_id from public.profiles
      where class_id in (select id from public.classes where teacher_id = (select auth.uid()))
    )
  );
