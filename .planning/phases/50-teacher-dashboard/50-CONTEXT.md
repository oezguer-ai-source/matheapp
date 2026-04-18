# Phase 50: Teacher Dashboard - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

Teachers can view meaningful progress data for their class: who is struggling, who is inactive, and how the class performs by operation type. Pure read-only dashboard — no write operations beyond what already exists.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Layout
- **D-01:** Route: `/lehrer/dashboard` (bereits als Stub vorhanden aus Phase 10)
- **D-02:** Klassenübersicht als Tabelle: Name, Gesamtpunkte, Aufgaben, Genauigkeit%, letzte Aktivität
- **D-03:** shadcn/ui Table Component für die Klassenübersicht (Lehrer-Bereich nutzt shadcn/ui, nicht raw Tailwind)
- **D-04:** Sortierbar nach jeder Spalte (Name, Punkte, Genauigkeit, letzte Aktivität)

### Per-Student Detail
- **D-05:** Klick auf Schüler-Zeile zeigt Detailansicht mit Genauigkeit nach Operation (Addition, Subtraktion, Multiplikation, Division)
- **D-06:** Detailansicht als expandierbarer Bereich in der Tabelle (kein separater Route)
- **D-07:** Farbcodierung: Rot < 50% Genauigkeit, Gelb 50-75%, Grün > 75%

### Activity Tracking
- **D-08:** "Letzte Aktivität" zeigt das Datum des letzten progress_entry (MAX(created_at))
- **D-09:** Inaktive Schüler (> 7 Tage keine Aktivität) werden visuell hervorgehoben
- **D-10:** Datumsformat: relatives Datum ("Heute", "Gestern", "vor 3 Tagen", dann Datum)

### Data Queries
- **D-11:** Server Component — alle Daten werden server-seitig geladen
- **D-12:** Eine einzige Supabase-Query pro Schüler mit Aggregation: SUM(points_earned), COUNT(*), richtig/falsch-Ratio, MAX(created_at)
- **D-13:** RLS sorgt automatisch dafür, dass nur Schüler der eigenen Klasse sichtbar sind (teacher_reads_class_profiles Policy)
- **D-14:** Operation-Genauigkeit als separate Query: GROUP BY operation_type, COUNT(CASE WHEN is_correct)

### Claude's Discretion
- Exact table styling and spacing
- Whether to use client-side sorting or server-side
- Loading skeleton design
- Empty state when no students in class
- Number formatting (Dezimalstellen bei Prozent)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/(teacher)/lehrer/dashboard/page.tsx` — Stub aus Phase 10 (muss erweitert werden)
- `components/ui/table.tsx` — shadcn/ui Table Components (falls installiert)
- `components/ui/card.tsx` — shadcn/ui Card Components
- `lib/supabase/server.ts` — Server-side Supabase client
- `progress_entries` Tabelle: user_id, operation_type, is_correct, points_earned, created_at

### Established Patterns
- Lehrer-Route-Group: `app/(teacher)/lehrer/` mit shadcn/ui
- Server Components für Daten-Laden
- RLS-basierte Datenisolation

### Integration Points
- `profiles` Tabelle: display_name, class_id, grade_level
- `progress_entries` Tabelle: alle Übungsdaten
- `classes` Tabelle: teacher_id für Klassen-Zuordnung
- Bestehende RLS Policies: teacher_reads_class_profiles, teacher_reads_own_classes

</code_context>

<specifics>
## Specific Ideas

- Dashboard soll auf einen Blick zeigen: wer übt regelmäßig, wer nicht
- Lehrkräfte wollen schnell sehen welche Rechenart Probleme macht
- Einfach und übersichtlich — keine komplexen Charts, Tabelle reicht

</specifics>

<deferred>
## Deferred Ideas

- Export als CSV/PDF — nicht im MVP
- Zeitraum-Filter (letzte Woche/Monat) — nice-to-have
- Vergleich zwischen Schülern — nicht priorisiert
- Eltern-Ansicht — außerhalb des Scopes

</deferred>
