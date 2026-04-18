# Technische Dokumentation: Matheapp

## Einleitung

Das vorliegende Dokument beschreibt die technische Umsetzung der Matheapp, einer Web-Anwendung zum spielerischen Erlernen von Mathematik fuer Grundschueler der Klassen 1 bis 4. Die App wurde im Rahmen eines universitaeren Projekts als Minimum Viable Product (MVP) entwickelt und demonstriert ein B2B-Geschaeftsmodell fuer den Einsatz an oeffentlichen Schulen. Im Folgenden werden die Systemarchitektur, die getroffenen Tech-Stack-Entscheidungen sowie die Implementierungsschritte der einzelnen Entwicklungsphasen detailliert erlaeutert.

## Architektur

### 2.1 Ueberblick

Die Anwendung folgt einer klassischen 3-Schicht-Architektur, die eine klare Trennung von Darstellung, Geschaeftslogik und Datenhaltung gewaehrleistet:

- **Praesentationsschicht:** React Server Components und Client Components bilden die Benutzeroberflaeche. Server Components laden Daten serverseitig und rendern statisches HTML, waehrend Client Components (gekennzeichnet durch `"use client"`) interaktive Elemente wie das NumberPad oder das Ballonplatzen-Minispiel bereitstellen. Als UI-Bibliothek kommt shadcn/ui (New York Style) zum Einsatz, gestaltet mit Tailwind CSS fuer ein kindgerechtes, farbiges Design.

- **Logikschicht:** Next.js Server Actions verarbeiten alle Schreiboperationen (Login, Antwort-Validierung, Abo-Upgrade). Jede Server Action validiert ihre Eingaben mit Zod-Schemas, bevor sie die Geschaeftslogik ausfuehrt. Die Exercise Engine ist als Sammlung reiner Funktionen (Pure Functions) implementiert, die unabhaengig von der Datenbank operieren und damit leicht testbar sind.

- **Datenschicht:** Supabase stellt die PostgreSQL-Datenbank, die Authentifizierung und die Echtzeit-Infrastruktur bereit. Row Level Security (RLS) auf allen Tabellen gewaehrleistet, dass Kinder ausschliesslich ihre eigenen Daten und Lehrkraefte nur die Daten ihrer Klasse sehen koennen. SECURITY DEFINER Helfer-Funktionen im privaten Schema verhindern rekursive RLS-Aufrufe.

### 2.2 Next.js App Router

Die Anwendung nutzt den Next.js App Router (Version 15.2) mit dem Route-Group-Pattern zur rollenbasierten Strukturierung:

- **`(child)` Route Group:** Enthaelt alle Kind-spezifischen Seiten unter `/kind/*`:
  - `/kind/dashboard` -- Punkte, Fortschritt, Klassenstufe
  - `/kind/ueben` -- Uebungssession mit Mathe-Aufgaben
  - `/kind/spiel` -- Ballonplatzen-Minispiel
  - `/kind/upgrade` -- Abo-Upgrade-Seite (nur Klasse 4)

- **`(teacher)` Route Group:** Enthaelt alle Lehrer-spezifischen Seiten unter `/lehrer/*`:
  - `/lehrer/dashboard` -- Klassenuebersicht mit Schuelerfortschritt

- **Oeffentliche Routen:** `/login` (Kind- und Lehrer-Login) sowie `/registrieren` (Lehrer-Registrierung) sind ohne Authentifizierung zugaenglich.

Die **Middleware** (`middleware.ts`) faengt jeden Request ab und delegiert an `updateSession()` aus `lib/supabase/middleware.ts`. Diese Funktion:

1. Erstellt einen Supabase Server Client mit Cookie-basierter Authentifizierung
2. Liest die JWT-Claims ueber `supabase.auth.getClaims()`
3. Leitet unauthentifizierte Nutzer auf `/login` um
4. Prueft die Rolle (`app_metadata.role`) und leitet Kinder, die Lehrer-Routen aufrufen, auf `/kind/dashboard` um (und umgekehrt)
5. Weist Nutzer ohne erkannte Rolle (`child` oder `teacher`) auf die Login-Seite zurueck

Server Components laden Daten direkt ueber den Supabase Server Client. Client Components erhalten Daten als Props vom umschliessenden Server Component oder rufen Server Actions fuer Schreiboperationen auf.

### 2.3 Supabase-Integration

Die Anbindung an Supabase erfolgt ueber drei spezialisierte Client-Typen:

- **Browser-Client** (`lib/supabase/client.ts`): Fuer clientseitige Auth-Zustandspruefungen. Verwendet den oeffentlichen Publishable Key und laeuft im Browser. Wird sparsam eingesetzt, da die meisten Datenzugriffe serverseitig erfolgen.

- **Server-Client** (`lib/supabase/server.ts`): Der primaere Client fuer Server Components und Server Actions. Liest und schreibt Cookies ueber die Next.js `cookies()` API, um die Supabase-Session zu verwalten. Alle Datenbankabfragen in Server Components nutzen diesen Client, wodurch RLS-Policies automatisch greifen.

- **Admin-Client** (`lib/supabase/admin.ts`): Verwendet den Service-Role-Key und umgeht saemtliche RLS-Policies. Wird ausschliesslich fuer privilegierte Operationen eingesetzt, etwa das Anlegen von Kind-Accounts durch Lehrkraefte. Die Datei ist mit `import 'server-only'` geschuetzt, sodass ein versehentlicher Import in Client Components zur Build-Zeit einen Fehler erzeugt.

### 2.4 Sicherheitskonzept

Das Sicherheitskonzept der Matheapp basiert auf mehreren, ineinandergreifenden Schichten:

**Row Level Security (RLS):**
Alle vier Datenbanktabellen (`schools`, `classes`, `profiles`, `progress_entries`) sind durch RLS-Policies geschuetzt. Kinder koennen nur ihre eigenen Profildaten und Uebungseintraege lesen und schreiben. Lehrkraefte sehen die Profile und Fortschritte aller Schueler ihrer Klasse, jedoch nicht die Daten anderer Klassen.

**SECURITY DEFINER Helfer-Funktionen:**
Im privaten Schema (`private`) existieren drei Helfer-Funktionen, die mit SECURITY DEFINER ausgefuehrt werden und damit die RLS-Pruefung der aufrufenden Tabelle umgehen:
- `private.user_role()` -- Liest die Rolle des aktuellen Nutzers aus `auth.users.raw_app_meta_data`
- `private.user_class_id()` -- Ermittelt die Klassen-ID des aktuellen Nutzers
- `private.is_teacher_of_class(class_id)` -- Prueft, ob der aktuelle Nutzer Lehrkraft der gegebenen Klasse ist

Diese Funktionen vermeiden eine rekursive RLS-Pruefung, die entstuende, wenn RLS-Policies direkt auf die `profiles`-Tabelle zugreifen wuerden, waehrend diese selbst durch RLS geschuetzt ist.

**PIN-basierte Authentifizierung fuer Kinder:**
Kinder melden sich mit einem einfachen Benutzernamen und einer 4-stelligen PIN an. Technisch wird der Benutzername auf eine interne E-Mail-Adresse abgebildet (`{benutzername}@matheapp.local`), und die PIN dient als Passwort. Die PIN wird in `auth.users` als bcrypt-Hash gespeichert -- zu keinem Zeitpunkt liegt die PIN im Klartext in der Datenbank vor.

**Stateless Answer Validation:**
Bei der Uebungssession sendet der Client lediglich die Aufgaben-ID und die eingegebene Antwort an den Server. Die Server Action berechnet die korrekte Antwort eigenstaendig neu, anstatt einem vom Client gesendeten `correctAnswer`-Feld zu vertrauen. Dadurch ist es unmoeglich, durch Manipulation der Client-Anfrage Punkte fuer falsche Antworten zu erhalten.

## Tech-Stack-Entscheidungen

### 3.1 Uebersicht

| Technologie | Version | Begruendung |
|-------------|---------|-------------|
| Next.js | 15.2 | App Router, Server Components, Server Actions -- Frontend, Backend und Routing in einem Framework vereint |
| React | 19 | Neueste Version mit nativer Server Component Unterstuetzung, optimierte Performance |
| Supabase | 2.103 | PostgreSQL-Datenbank mit integrierter Authentifizierung und Row Level Security, kein eigener Auth-Server notwendig |
| TypeScript | 5.x | Statische Typsicherheit, verbesserte IDE-Unterstuetzung, fruehe Fehlererkennung zur Entwicklungszeit |
| Tailwind CSS | 4.x | Utility-first CSS Framework fuer schnelles Prototyping, einfache Umsetzung eines kindgerechten Designs |
| shadcn/ui | -- | Barrierefreie, anpassbare UI-Komponenten (Button, Card, Table, Tabs, Alert, Collapsible) als Copy-Paste-Bausteine |
| Zod | 4.x | Schema-basierte Validierung fuer Server Actions, vollstaendig typsicher mit TypeScript-Integration |
| Vitest | 2.x | Schnelle Unit-Tests, kompatibel mit dem Vite-Ecosystem, unterstuetzt React-Komponenten-Tests ueber jsdom |
| Playwright | 1.59 | End-to-End-Tests im echten Browser, zuverlaessige Cross-Browser-Unterstuetzung |

### 3.2 Begruendung gegen Alternativen

**Supabase statt Firebase:**
Firebase bietet mit Firestore eine NoSQL-Datenbank, deren Security Rules auf dokumentenbasiertem JSON operieren. Supabase hingegen stellt eine vollwertige PostgreSQL-Datenbank mit SQL-basierten RLS-Policies bereit. Fuer die relationale Datenstruktur der Matheapp (Schulen -> Klassen -> Schueler -> Uebungseintraege) ist das relationale Modell mit Foreign Keys und JOINs deutlich natuerlicher. Zudem erlauben SECURITY DEFINER Funktionen eine feingranulare Zugriffskontrolle, die ueber die Moeglichkeiten von Firestore Security Rules hinausgeht.

**Server Actions statt REST-API:**
Next.js Server Actions ermoeglichen die direkte Ausfuehrung serverseitiger Logik aus React-Komponenten heraus, ohne dedizierte API-Routes zu definieren. Dies reduziert den Boilerplate-Code erheblich: Statt Endpunkt-Definition, Fetch-Aufruf und Response-Parsing genuegt ein einfacher Funktionsaufruf mit automatischer Typsicherheit durch TypeScript. Fuer ein MVP mit begrenztem Entwicklungszeitraum war diese Produktivitaetssteigerung entscheidend.

**CSS-Animationen statt Phaser.js fuer das Mini-Game:**
Das Ballonplatzen-Minispiel wurde bewusst mit reinen CSS-Keyframe-Animationen und React-State umgesetzt, anstatt eine vollwertige Game Engine wie Phaser.js einzubinden. Die Vorteile: keine zusaetzliche Bundle-Groesse (Phaser.js umfasst ca. 1 MB), kein Canvas-Rendering-Overhead, und die gesamte UI bleibt im React-Komponentenmodell. Fuer ein zeitlich begrenztes Minispiel (75 Sekunden) mit einfacher Klick-Interaktion ist eine Game Engine ueberdimensioniert.

## Implementierungsschritte

Die Entwicklung der Matheapp erfolgte in sechs aufeinander aufbauenden Phasen. Jede Phase produzierte ein testbares, funktionsfaehiges Inkrement nach dem Vertical-Slice-Prinzip.

### Phase 10: Foundation

In der ersten Phase wurde das technische Fundament der Anwendung gelegt. Ein Next.js 15.2 Projekt mit TypeScript, Tailwind CSS 4 und shadcn/ui (New York Style) bildete die Basis. Als Datenbank wurde ein Supabase Cloud-Projekt in der EU-Region (Frankfurt) aufgesetzt.

**Datenbank-Schema:**
Das PostgreSQL-Schema umfasst vier Tabellen: `schools` (Schulen mit Abo-Tier), `classes` (Klassen mit Referenz zur Schule und Lehrkraft), `profiles` (Schueler- und Lehrer-Profile mit Rolle, Klassenzugehoerigkeit, Punktestand) und `progress_entries` (einzelne Uebungseintraege mit Operationstyp, Korrektheit und Zeitstempel). Alle Tabellen verwenden `gen_random_uuid()` als Primaerschluessel (statt `uuid_generate_v4()` fuer Supabase Cloud Kompatibilitaet).

**Dual-Login-System:**
Kinder melden sich mit Benutzername und 4-stelliger PIN an. Der Benutzername wird intern auf `{name}@matheapp.local` abgebildet und die PIN als Passwort in `auth.users` gespeichert (bcrypt-Hash). Lehrkraefte nutzen eine klassische E-Mail/Passwort-Kombination. Die Middleware routet basierend auf dem JWT-Claim `app_metadata.role` zu `/kind/*` oder `/lehrer/*`.

**Sicherheit:**
RLS-Policies auf allen vier Tabellen, implementiert ueber SECURITY DEFINER Helfer-Funktionen im privaten Schema. Ein Datenbank-Trigger erstellt bei der Lehrer-Registrierung automatisch ein Profil in der `profiles`-Tabelle.

**Erstellte Module:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/admin.ts`, `lib/supabase/middleware.ts`, `middleware.ts`, drei SQL-Migrationen, Login-Seite mit Rollen-Toggle, Registrierungsseite, Zod-Schemas fuer alle Auth-Actions.

### Phase 20: Exercise Engine

Die zweite Phase implementierte die Mathe-Engine als Sammlung reiner Funktionen (Pure Functions) ohne Datenbankabhaengigkeit.

**RANGES-Konfiguration:**
Die zentrale Konfigurationsdatei `lib/exercises/config.ts` definiert fuer jede der vier Klassenstufen drei Schwierigkeitsgrade (easy, medium, hard), insgesamt 12 Kombinationen. Jede Kombination spezifiziert den Zahlenraum (`min`/`max`) und die erlaubten Operatoren:
- Klasse 1: Addition und Subtraktion im Zahlenraum bis 20
- Klasse 2: Addition und Subtraktion im Zahlenraum bis 100
- Klasse 3: Multiplikation und Division (kleines Einmaleins, Zahlen 1-10)
- Klasse 4: Alle vier Grundrechenarten, Zahlenraum bis 1000

**Curriculum-Constraints:**
Der Generator stellt mathematische Korrektheit sicher: Bei Subtraktion werden die Operanden getauscht, wenn das Ergebnis negativ waere. Bei Division wird das Ergebnis zuerst bestimmt (Quotient und Divisor), dann der Dividend berechnet (`dividend = quotient * divisor`), um ganzzahlige Ergebnisse zu garantieren. Der Divisor ist immer mindestens 2.

**Schwierigkeits-Adaption:**
Die Schwierigkeit steigt nach drei aufeinanderfolgenden richtigen Antworten von `easy` auf `medium` und von `medium` auf `hard`. Nach zwei aufeinanderfolgenden falschen Antworten sinkt sie um eine Stufe. Punkte werden abhaengig von der Schwierigkeit vergeben: easy = 10, medium = 20, hard = 30.

**Stateless Validation:**
Die Server Action `submitAnswerAction` erhaelt die Aufgaben-ID und die Antwort des Kindes, berechnet die korrekte Antwort serverseitig neu und schreibt einen `progress_entries`-Datensatz in die Datenbank.

**Erstellte Module:** `lib/exercises/types.ts`, `lib/exercises/config.ts`, `lib/exercises/generators.ts`, `lib/exercises/difficulty.ts`, `lib/exercises/points.ts`, Server Actions `generateExerciseAction` und `submitAnswerAction`, 37 Unit-Tests.

### Phase 30: Kind-Dashboard und Uebungssession

Die dritte Phase lieferte die kindgerechte Benutzeroberflaeche fuer den Lernloop.

**Kind-Dashboard:**
Ein Server Component unter `/kind/dashboard` zeigt den aktuellen Punktestand, einen visuellen Fortschrittsbalken zum Freischalten des Mini-Games und die Klassenstufe des Kindes. Die Daten werden ueber aggregierte Supabase-Queries geladen (Summe der Punkte, Anzahl der Aufgaben).

**NumberPad:**
Ein touch-freundliches 3x4-Grid mit den Ziffern 0-9, einer Loeschen-Taste und einer Bestaetigen-Taste. Die Buttons haben eine Mindesthoehe von 64px fuer kindgerechte Bedienung auf Tablets und Smartphones -- eine Tastatur ist nicht erforderlich.

**ExerciseSession State Machine:**
Die Uebungssession folgt einem klar definierten Zustandsautomaten: `loading` (Aufgabe wird geladen) -> `answering` (Kind gibt Antwort ueber NumberPad ein) -> `submitting` (Antwort wird an Server gesendet) -> `feedback` (gruenes oder rotes Overlay) -> naechste Aufgabe. Das gruene Feedback-Overlay zeigt die erhaltenen Punkte, das rote Overlay die korrekte Antwort. Nach 1,5 Sekunden (richtig) bzw. 2 Sekunden (falsch) wechselt die Anzeige automatisch zur naechsten Aufgabe.

**Erstellte Module:** `components/child/number-pad.tsx`, `components/child/feedback-overlay.tsx`, `components/child/exercise-session.tsx`, `app/(child)/kind/ueben/page.tsx`, `app/(child)/kind/dashboard/page.tsx`.

### Phase 40: Mini-Game (Ballonplatzen)

Die vierte Phase implementierte das Belohnungsspiel, das den Motivationsloop vervollstaendigt.

**Spielmechanik:**
Das Ballonplatzen-Spiel ist ein rein CSS-basiertes Klickspiel. Bunte Ballons steigen von unten nach oben auf (CSS `@keyframes balloon-rise`), und das Kind klickt oder tippt auf die Ballons, um sie platzen zu lassen (CSS `@keyframes balloon-pop` mit Scale-Animation). Das Spiel laeuft 75 Sekunden. Alle 800ms erscheint ein neuer Ballon an einer zufaelligen horizontalen Position in einer von sieben Farben. Maximal 12 Ballons sind gleichzeitig auf dem Bildschirm (DOM-Overflow-Schutz).

**Punkte-Gate:**
Um das Spiel zu starten, werden 100 Punkte vom Punktestand des Kindes abgezogen. Die Server Action `startGameAction` prueft, ob genuegend Punkte vorhanden sind, und fuehrt den Abzug durch. Ohne ausreichende Punkte wird der Spielstart blockiert.

**Design-Entscheidung:**
Der Spiel-Score (Anzahl geplatzter Ballons) ist rein clientseitig und wird bewusst nicht in die Datenbank geschrieben. Das Spiel ist eine Belohnung, kein Wettbewerb. Nach dem Spiel kehrt das Kind zum Dashboard zurueck und muss weitere Aufgaben loesen, um erneut spielen zu koennen.

**Erstellte Module:** `components/child/balloon-game.tsx`, `components/child/balloon.tsx`, `components/child/game-over-screen.tsx`, CSS-Animationen in `app/globals.css`, `app/(child)/kind/spiel/page.tsx`.

### Phase 50: Lehrer-Dashboard

Die fuenfte Phase lieferte die Klassenuebersicht fuer Lehrkraefte.

**Server Component Architektur:**
Die Dashboard-Seite (`app/(teacher)/lehrer/dashboard/page.tsx`) ist ein Server Component, der die Klassendaten ueber Supabase-Queries laedt. Die interaktive Tabelle (`components/teacher/class-table.tsx`) ist ein Client Component, der die vorgeladenen Daten als Props erhaelt.

**Sortierbare Tabelle:**
Die Klassenuebersicht zeigt fuer jeden Schueler: Name, Gesamtpunkte, Anzahl geloester Aufgaben, Genauigkeit (Prozent) und Datum der letzten Aktivitaet. Jede Spalte ist per Klick sortierbar (aufsteigend/absteigend) mit visuellem Pfeil-Indikator.

**Expandierbare Detail-Ansicht:**
Beim Klick auf eine Schueler-Zeile klappt ein Detail-Bereich auf, der die Genauigkeit pro Operationstyp (Addition, Subtraktion, Multiplikation, Division) in einem 2x2-Grid mit farbcodierten Karten anzeigt. Die Operations-Daten werden beim ersten Aufklappen ueber eine Server Action geladen und gecacht.

**Farbcodierung und Inaktivitaets-Hervorhebung:**
Genauigkeits-Badges sind farblich codiert: Rot unter 50%, Gelb zwischen 50% und 75%, Gruen ueber 75%. Schueler, die laenger als 7 Tage nicht geuebt haben, werden mit einem bernsteinfarbenen Hintergrund hervorgehoben.

**Datenisolation:**
Alle Daten sind durch RLS-Policies auf die eigene Klasse beschraenkt. Eine Lehrkraft kann ausschliesslich die Schueler sehen, die ihrer Klasse zugeordnet sind.

**Erstellte Module:** `lib/teacher/queries.ts`, `lib/utils/relative-date.ts`, `components/teacher/class-table.tsx`, `components/teacher/student-detail.tsx`, `app/(teacher)/lehrer/dashboard/page.tsx`.

### Phase 60: Abo-Gate (Subscription)

Die sechste Phase implementierte das simulierte B2B-Abonnement-Modell.

**Freemium-Strategie:**
Klasse 1 bis 3 ist vollstaendig kostenlos nutzbar -- kein Gate, kein Hinweis auf Abonnements. Erst ab Klasse 4 greift der Subscription-Check: Kinder an Schulen mit dem Tier `free` werden beim Aufrufen der Uebungsseite auf `/kind/upgrade` umgeleitet.

**Subscription-Query-Helper:**
Die Funktion `getSchoolSubscriptionTier()` in `lib/subscription/queries.ts` ermittelt den Abo-Status der Schule ueber den Pfad `profiles -> classes -> schools`. Die Pure Function `isGated(grade, tier)` gibt `true` nur bei Klasse 4 und Tier `free` zurueck.

**Upgrade-Seite:**
Unter `/kind/upgrade` werden drei Abo-Pakete in einem responsiven Grid dargestellt:
- Grundschulniveau: 9,99 EUR/Monat
- Foerderung: 14,99 EUR/Monat
- Experte: 19,99 EUR/Monat

Ein Klick auf ein Paket loest die Server Action `upgradeSubscriptionAction` aus, die den `subscription_tier` der Schule in der Datenbank aktualisiert (RLS-geschuetzt). Es handelt sich um einen simulierten Checkout ohne echte Zahlungsabwicklung.

**Demo-Tier:**
Fuer Evaluierungszwecke existiert ein `demo`-Tier, bei dem das Gate nicht greift. Dies ermoeglicht Testzugriff auf alle Inhalte ohne simulierten Kauf.

**Lehrer-Badge:**
Im Lehrer-Dashboard wird der Abo-Status der Schule als Badge unter dem Klassennamen angezeigt: gruen fuer bezahlte Tiers, grau fuer den kostenlosen Tier.

**Erstellte Module:** SQL-Migration (demo-Tier, Kind-RLS), `lib/subscription/queries.ts`, `app/(child)/kind/upgrade/page.tsx`, `app/(child)/kind/upgrade/actions.ts`.

## Projektstruktur

Der folgende Verzeichnisbaum zeigt die wichtigsten Ordner und ihre Funktion:

```
matheapp/
+-- app/                        # Next.js App Router
|   +-- (child)/kind/           # Kind-Routen
|   |   +-- dashboard/          #   Punkte, Fortschritt, Klassenstufe
|   |   +-- ueben/              #   Uebungssession mit Mathe-Aufgaben
|   |   +-- spiel/              #   Ballonplatzen Mini-Game
|   |   +-- upgrade/            #   Abo-Upgrade-Seite (nur Klasse 4)
|   +-- (teacher)/lehrer/       # Lehrer-Routen
|   |   +-- dashboard/          #   Klassenuebersicht mit Schuelerfortschritt
|   +-- login/                  # Login-Seite (Kind + Lehrer)
|   +-- registrieren/           # Lehrer-Registrierung
+-- components/                 # React-Komponenten
|   +-- child/                  # Kind-UI (NumberPad, ExerciseSession, BalloonGame)
|   +-- teacher/                # Lehrer-UI (ClassTable, StudentDetail)
|   +-- login/                  # Login-Formulare
|   +-- ui/                     # shadcn/ui Basiskomponenten
+-- lib/                        # Geschaeftslogik
|   +-- exercises/              # Mathe-Engine (Generatoren, Schwierigkeit, Punkte)
|   +-- supabase/               # Supabase-Client-Helfer (client, server, admin, middleware)
|   +-- schemas/                # Zod-Validierungsschemas
|   +-- subscription/           # Abo-Queries und Gate-Logik
|   +-- teacher/                # Lehrer-Dashboard-Queries
+-- supabase/migrations/        # SQL-Migrationen (Schema, RLS, Trigger)
+-- tests/                      # Unit- und E2E-Tests
|   +-- unit/                   # Vitest Unit-Tests
|   +-- e2e/                    # Playwright E2E-Tests
```

## Screenshots und UI-Referenzen

Screenshots der laufenden Anwendung werden separat als Bildanhang beigefuegt. Die folgenden Seiten sind in der Anwendung verfuegbar:

| Route | Beschreibung |
|-------|-------------|
| /login | Login-Seite mit Rollen-Toggle (Kind/Lehrer). Kinder geben Benutzername und 4-stellige PIN ein, Lehrkraefte nutzen E-Mail und Passwort. |
| /registrieren | Lehrer-Registrierung mit Schulname, Klassenname, E-Mail und Passwort. Erstellt Schule, Klasse und Lehrer-Profil in einem Schritt. |
| /kind/dashboard | Kind-Dashboard mit Punktestand, Fortschrittsbalken zum Mini-Game, Klassenstufe und Buttons zum Ueben und Spielen. |
| /kind/ueben | Uebungssession mit grosser Aufgabenanzeige, NumberPad-Eingabe und farbigem Feedback-Overlay (gruen/rot). |
| /kind/spiel | Ballonplatzen Mini-Game mit aufsteigenden bunten Ballons, Score-Anzeige und 75-Sekunden-Timer. |
| /kind/upgrade | Abo-Upgrade-Seite mit drei Paket-Optionen (nur sichtbar fuer Klasse-4-Kinder an Free-Tier-Schulen). |
| /lehrer/dashboard | Lehrer-Dashboard mit sortierter Klassenuebersicht, expandierbaren Schueler-Details und Abo-Status-Badge. |
