# Matheapp

## What This Is

Eine Web-App zum Lernen von Mathematik für Grundschüler (Klasse 1-4). Kinder lösen altersgerechte Rechenaufgaben, sammeln Punkte und schalten als Belohnung ein Mini-Game frei. Lehrkräfte sehen den Fortschritt ihrer Klasse über ein Dashboard. Die App wird als B2B-Produkt an öffentliche Schulen vertrieben.

## Core Value

Kinder üben Mathe spielerisch und mit Motivation durch ein Belohnungssystem — Lehrkräfte sehen den Lernfortschritt.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Kinder können sich einloggen und ihren Fortschritt sehen
- [ ] Mathe-Aufgaben nach Klassenstufe (1-4) mit Grundrechenarten
- [ ] Punktesystem mit Mini-Game als Belohnung
- [ ] Lehrer-Dashboard für Klassenfortschritt
- [ ] Simuliertes Abo-Modell (Klasse 1-3 kostenlos, ab Klasse 4 Abo-Auswahl)
- [ ] Marktanalyse mit Konkurrenz, Potenziale, Positionierung
- [ ] Forschungsfrage und Ableitung
- [ ] UML/BPMN-Diagramme der Anwendung
- [ ] Technische Dokumentation der Umsetzungsschritte

### Out of Scope

- Echte Zahlungsabwicklung (Stripe/PayPal) — simuliertes Abo reicht für Uni-Projekt
- Mobile Native App — Web-App deckt den Bedarf, mobile App ggf. Zukunft
- B2C-Plattform — Fokus auf B2B (Schulen), B2C ist Zukunftsvision
- Geometrie, Textaufgaben, Brüche — nur Grundrechenarten im MVP
- Erweiterte Abo-Stufen (Förderung, Experte) — nur als Konzept in der Doku, nicht implementiert

## Context

- **Uni-Projekt** im Bereich Anwendungsentwicklung mit Teamkollegen (Doku wird aufgeteilt, Code wird solo entwickelt)
- **Deadline:** 2-4 Wochen (ca. Ende April / Anfang Mai 2026)
- **Zielgruppe:** Öffentliche Schulen (Grundschule), B2B-Modell
- **Geschäftsmodell:** Klasse 1-3 kostenlos als Markteinführungsstrategie, ab Klasse 4 Abo-Modell mit Paketen (Grundschulniveau, Förderung, Experte)
- **Mathe-Inhalte pro Klassenstufe:**
  - Klasse 1: Addition und Subtraktion (Zahlenraum bis 20)
  - Klasse 2: Addition und Subtraktion (Zahlenraum bis 100)
  - Klasse 3: Multiplikation und Division (kleines Einmaleins)
  - Klasse 4: Gemischte Operationen, größerer Zahlenraum

## Constraints

- **Timeline**: 2-4 Wochen — aggressiver Zeitrahmen, Fokus auf MVP
- **Solo-Entwickler**: Nur eine Person am Code, Doku wird im Team aufgeteilt
- **Tech-Stack**: Next.js / React (vorhandene Erfahrung)
- **Sprache**: Deutsche UI, deutsche Aufgabenstellungen
- **Uni-Anforderungen**: Marktanalyse, Forschungsfrage, UML/BPMN-Diagramme, Implementierungsbeschreibung gehören zur Abgabe

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web-App statt Native | Sofort an Schulen verteilbar, Next.js-Erfahrung vorhanden | — Pending |
| Login pro Kind | Fortschritt und Punkte individuell tracken | — Pending |
| Abo nur simuliert | Echte Zahlung übersteigt Uni-Projekt-Scope | — Pending |
| Grundrechenarten only | MVP-Fokus, erweiterte Themen in Zukunft | — Pending |
| Klasse 1-3 kostenlos | Markteinführungsstrategie laut Konzept | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-15 after initialization*
