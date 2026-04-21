-- Migration: Spiele-Scores für Klassen-Ranking
-- Speichert Highscores pro Schüler pro Spiel, Ranking innerhalb der Klasse

create table public.game_scores (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references auth.users(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  game_key text not null,
  score int not null check (score >= 0),
  created_at timestamptz not null default now()
);

create index idx_game_scores_child on public.game_scores(child_id);
create index idx_game_scores_class_game on public.game_scores(class_id, game_key, score desc);
create index idx_game_scores_created on public.game_scores(created_at desc);

alter table public.game_scores enable row level security;

-- Schüler darf eigene Scores einfügen
create policy "child_inserts_own_game_scores"
on public.game_scores for insert
to authenticated
with check ( child_id = (select auth.uid()) );

-- Schüler darf eigene Scores lesen
create policy "child_reads_own_game_scores"
on public.game_scores for select
to authenticated
using ( child_id = (select auth.uid()) );

-- Schüler darf Scores der eigenen Klasse lesen (für Ranking)
create policy "child_reads_class_game_scores"
on public.game_scores for select
to authenticated
using (
  (select private.user_role()) = 'child'
  and class_id is not null
  and class_id = (select private.user_class_id())
);

-- Lehrer darf Scores seiner Klassen lesen
create policy "teacher_reads_class_game_scores"
on public.game_scores for select
to authenticated
using (
  (select private.user_role()) = 'teacher'
  and class_id in (
    select id from public.classes where teacher_id = (select auth.uid())
  )
);
