-- Kombinierter Index fuer Zeitreihen-Queries auf progress_entries.
-- Bedient Verlaufs-Abfragen pro Kind effizient:
--   WHERE child_id = X  ORDER BY / FILTER BY created_at
-- Die bestehenden Einzel-Indizes auf child_id und created_at koennen
-- diese Kombination aus Equality + Range/Sort nicht so effizient bedienen.
-- Additive Migration: keine neue Tabelle, keine RLS-Aenderung.

create index if not exists idx_progress_entries_child_created
  on public.progress_entries (child_id, created_at);
