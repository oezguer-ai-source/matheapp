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
