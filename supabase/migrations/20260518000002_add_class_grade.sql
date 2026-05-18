-- Migration: classes.grade
-- Bug-3-Fix: Klassenstufe als eigene Spalte statt fehleranfaelliger Regex aus dem Namen.
--
-- Variantenwahl: NULLABLE, KEIN Default.
--   Begruendung: Ein Default (z.B. 1) wuerde bei Bestandsklassen eine FALSCHE
--   Klassenstufe vortaeuschen (eine 3. Klasse erschiene als 1. Klasse), ohne dass
--   das jemandem auffaellt. NULL ist hier die ehrliche Variante: "Stufe noch
--   unbekannt". Die Anwendungslogik (addStudentAction) kann auf NULL pruefen und
--   den Lehrer zur Nachpflege auffordern, statt mit einem stillen Falschwert zu
--   arbeiten. Bestandsdaten brechen nicht, da NULL ohne Default zulaessig ist und
--   der CHECK NULL-Werte passieren laesst.
--   Neue Klassen sollten die Stufe ueber die Anwendung verpflichtend setzen.

alter table public.classes
  add column if not exists grade int
    check (grade between 1 and 4);

comment on column public.classes.grade is
  'Klassenstufe 1-4. Nullable: NULL = noch nicht gepflegt. Kein Default, '
  'damit Bestandsklassen keine falsche Stufe vortaeuschen.';
