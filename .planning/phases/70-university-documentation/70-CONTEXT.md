# Phase 70: University Documentation - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning
**Mode:** Auto-generated (autonomous mode)

<domain>
## Phase Boundary

All required university deliverables: market analysis, research question, UML/BPMN diagrams, and technical documentation of the implementation. These are written documents, no code changes.

</domain>

<decisions>
## Implementation Decisions

### Marktanalyse (REQ-06)
- **D-01:** Dokument unter `docs/marktanalyse.md` — Markdown-Format
- **D-02:** Konkurrenten: Anton, Mathegym, Sofatutor — Stärken/Schwächen-Vergleich
- **D-03:** Marktpotenzial: Anzahl Grundschulen in Deutschland, Digitalisierungstrend
- **D-04:** Positionierung: B2B-Modell mit Freemium, Fokus auf Gamification + einfache Bedienung
- **D-05:** Sprache: Deutsch (Uni-Dokument)

### Forschungsfrage (REQ-07)
- **D-06:** Dokument unter `docs/forschungsfrage.md`
- **D-07:** Forschungsfrage: "Inwiefern steigert ein gamifiziertes Belohnungssystem die Lernmotivation und Übungshäufigkeit von Grundschulkindern im Mathematikunterricht?"
- **D-08:** Ableitung aus dem Produktkonzept: Punkte + Mini-Game als Motivationsloop

### UML/BPMN-Diagramme (REQ-08)
- **D-09:** Dokument unter `docs/diagramme.md` mit Mermaid-Diagrammen (render im Browser)
- **D-10:** UML Klassendiagramm: Profiles, Classes, Schools, ProgressEntries und ihre Beziehungen
- **D-11:** UML Sequenzdiagramm: Kind-Login-Flow + Übungssession-Flow
- **D-12:** BPMN: Übungsprozess von Start bis Punktevergabe

### Technische Dokumentation (REQ-09)
- **D-13:** Dokument unter `docs/technische-dokumentation.md`
- **D-14:** Architektur-Beschreibung: Next.js, Supabase, RLS, Server Components
- **D-15:** Tech-Stack-Entscheidungen und Begründungen
- **D-16:** Implementierungsschritte: Phase für Phase beschrieben
- **D-17:** Screenshots der UI (Referenz auf existierende Seiten)

### Claude's Discretion
- Exakte Struktur und Gliederung der Dokumente
- Tiefe der Marktanalyse-Recherche
- Zusätzliche Diagramme falls sinnvoll
- Formatierung und Länge der Dokumente

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `supabase/migrations/*.sql` — Schema-Definitionen für Diagramme
- `types/database.types.ts` — TypeScript-Typen als Quelle für Klassendiagramm
- `.planning/PROJECT.md` — Projekt-Übersicht
- `.planning/ROADMAP.md` — Phasen-Beschreibungen für Implementierungsschritte

### Integration Points
- Keine Code-Änderungen nötig — nur Dokumenterstellung

</code_context>

<specifics>
## Specific Ideas

- Diagramme als Mermaid im Markdown — kein externes Tool nötig
- Dokumente sollen als Uni-Abgabe druckbar sein
- Praktische Beispiele aus dem Code einbeziehen

</specifics>

<deferred>
## Deferred Ideas

- Benutzerhandbuch — nicht Teil der Uni-Anforderungen
- API-Dokumentation — nice-to-have
- Deployment-Guide — außerhalb Scope

</deferred>
