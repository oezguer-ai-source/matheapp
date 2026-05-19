-- Migration: Paket B — neuer Item-Typ 'math' fuer generierte Mathe-Aufgaben
-- Eine Mathe-Aufgabe hat genau eine korrekte Zahl als Antwort. Sie braucht
-- weder Options-Listen noch correct_options (das sind Choice-Felder).
-- Bestehende Migrationen werden NICHT editiert; hier nur additive Aenderungen.

-- ============================================================
-- 1. CHECK auf item_type erweitern: 'text' | 'choice' | 'math'
-- ============================================================
-- Der bestehende Constraint heisst (Postgres-Default) assignment_items_item_type_check.
-- Wir droppen ihn defensiv per "if exists" und legen ihn mit dem erweiterten
-- Werte-Set neu an.
alter table public.assignment_items
  drop constraint if exists assignment_items_item_type_check;

alter table public.assignment_items
  add constraint assignment_items_item_type_check
  check (item_type in ('text', 'choice', 'math'));

-- ============================================================
-- 2. Neue Spalte: correct_number — die eindeutige korrekte Zahl
-- ============================================================
-- Nullable, weil 'text'- und 'choice'-Items keine numerische Loesung haben.
-- Bei 'math'-Items ist sie Pflicht — das erzwingt der Zod-Layer
-- (assignmentItemSchema) sowie die Action-Logik.
alter table public.assignment_items
  add column if not exists correct_number numeric;
