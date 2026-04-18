# Technische Diagramme der Mathe-Lernapp

## Einleitung

Dieses Dokument enthaelt die zentralen technischen Diagramme der Mathe-Lernapp fuer die Grundschule. Alle Diagramme sind in Mermaid-Syntax verfasst und koennen direkt in GitHub, VS Code oder anderen Mermaid-faehigen Viewern gerendert werden. Die Diagramme dokumentieren sowohl die Datenstruktur (Klassendiagramm) als auch die Kernprozesse der Anwendung (Sequenzdiagramme, Prozessdiagramm).

---

## 1. UML-Klassendiagramm: Datenbankschema

Das folgende Klassendiagramm bildet die vier zentralen Tabellen der PostgreSQL-Datenbank (Supabase) ab. Es zeigt die Attribute jeder Entitaet sowie die Beziehungen untereinander.

```mermaid
classDiagram
    class School {
        +uuid id
        +string name
        +string subscription_tier
        +datetime created_at
    }

    class Class {
        +uuid id
        +uuid school_id
        +uuid teacher_id
        +string name
        +datetime created_at
    }

    class Profile {
        +uuid user_id
        +string role
        +string display_name
        +int grade_level
        +uuid class_id
        +string pin_hint
        +datetime created_at
    }

    class ProgressEntry {
        +uuid id
        +uuid child_id
        +string operation_type
        +int grade
        +boolean correct
        +int points_earned
        +datetime created_at
    }

    School "1" --> "*" Class : hat
    Class "*" --> "1" School : gehoert_zu
    Profile "*" --> "0..1" Class : ist_in
    ProgressEntry "*" --> "1" Profile : gehoert_zu
```

**Erlaeuterung der Beziehungen:**

Eine **Schule** (School) kann mehrere **Klassen** (Class) besitzen. Jede Klasse ist genau einer Schule zugeordnet und wird von einer Lehrkraft verwaltet (teacher_id verweist auf den authentifizierten Benutzer). **Profile** repraesentieren sowohl Kinder als auch Lehrkraefte, unterschieden durch das Feld `role` (`'child'` oder `'teacher'`). Kinder sind ueber `class_id` einer Klasse zugeordnet, waehrend bei Lehrkraeften dieses Feld leer bleibt (nullable). Die Tabelle **ProgressEntry** erfasst jeden einzelnen Aufgabenversuch eines Kindes mit Rechenart (`operation_type`), Klassenstufe, Korrektheit und verdienten Punkten. Das Feld `subscription_tier` der Schule steuert den Funktionsumfang (Free-Tier fuer Klasse 1-3, Abo-Pakete ab Klasse 4).

---

## 2. UML-Sequenzdiagramm: Kind-Login-Flow

Das folgende Sequenzdiagramm zeigt den vollstaendigen Authentifizierungsablauf, wenn sich ein Kind mit Benutzername und PIN anmeldet.

```mermaid
sequenceDiagram
    participant Kind as Kind (Browser)
    participant Client as Login-Seite (/login)
    participant Action as Server Action (childLogin)
    participant Admin as Supabase Admin Client
    participant Auth as Supabase Auth
    participant DB as Datenbank (profiles)

    Kind->>Client: Benutzername + PIN eingeben
    Client->>Action: childLogin(formData)
    Action->>Action: Zod-Validierung (childLoginSchema)
    alt Validierung fehlgeschlagen
        Action-->>Client: Fehlermeldung (generisch)
    end
    Action->>Admin: profiles.select() WHERE display_name = username AND role = 'child'
    Admin->>DB: SQL-Abfrage (Service-Role, bypassed RLS)
    DB-->>Admin: Profil mit class_id und user_id
    alt Kein Profil gefunden
        Action-->>Client: Fehlermeldung (generisch)
    end
    Action->>Action: buildSyntheticEmail(username, class_id)
    Action->>Action: padPin(pin, class_id)
    Action->>Auth: signInWithPassword(email, password)
    alt Authentifizierung fehlgeschlagen
        Auth-->>Action: Fehler
        Action-->>Client: Fehlermeldung (generisch)
    end
    Auth-->>Action: Session-Token
    Action-->>Client: redirect("/kind/dashboard")
    Client-->>Kind: Dashboard wird angezeigt
```

**Erlaeuterung:**

Der Login-Flow fuer Kinder basiert auf einem synthetischen E-Mail-System: Da Grundschulkinder keine eigene E-Mail-Adresse besitzen, wird aus dem Benutzernamen und der Klassen-ID eine kuenstliche E-Mail-Adresse konstruiert (z.B. `max-abc123@matheapp.local`). Die PIN wird ebenfalls mit der Klassen-ID kombiniert, um Kollisionen zwischen Klassen zu vermeiden. Aus Sicherheitsgruenden wird bei jedem Fehlschlag eine identische, generische Fehlermeldung zurueckgegeben, um Rueckschluesse auf existierende Benutzerkonten zu verhindern (Schutz vor User Enumeration).

---

## 3. UML-Sequenzdiagramm: Uebungssession-Flow

Das folgende Sequenzdiagramm zeigt den Ablauf einer vollstaendigen Uebungssession, von der Aufgabengenerierung bis zur Punktevergabe und Schwierigkeitsanpassung.

```mermaid
sequenceDiagram
    participant Kind as Kind (Browser)
    participant UI as Uebungsseite (/kind/ueben)
    participant GenAction as generateExerciseAction
    participant SubAction as submitAnswerAction
    participant Auth as Supabase Auth
    participant DB as Datenbank (progress_entries)

    Kind->>UI: "Ueben starten" klicken
    UI->>GenAction: generateExerciseAction(grade, difficulty)
    GenAction->>GenAction: Zod-Validierung
    GenAction->>Auth: getUser() - Authentifizierung pruefen
    GenAction->>GenAction: generateExercise(grade, difficulty)
    Note over GenAction: RANGES-Konfiguration bestimmt<br/>Operanden und Operatoren
    GenAction-->>UI: ClientExercise (ohne correctAnswer)
    UI-->>Kind: Aufgabe anzeigen (z.B. "7 + 5 = ?")

    Kind->>UI: Antwort ueber NumberPad eingeben
    UI->>SubAction: submitAnswerAction(exerciseId, operands, userAnswer, difficulty, streaks)
    SubAction->>SubAction: Zod-Validierung
    SubAction->>Auth: getUser() - Authentifizierung pruefen
    SubAction->>DB: profiles.select(grade_level)
    SubAction->>SubAction: validateOperandsForGrade() - Manipulationsschutz
    SubAction->>SubAction: compute(operand1, operand2, operator)
    Note over SubAction: Server berechnet korrekte Antwort<br/>selbst neu (vertraut Client nicht)
    SubAction->>SubAction: calculatePoints(correct, difficulty)
    SubAction->>SubAction: computeNewDifficulty(streaks)
    SubAction->>DB: progress_entries.insert(child_id, operation_type, correct, points)
    DB-->>SubAction: Erfolgreich gespeichert
    SubAction-->>UI: SubmitAnswerResult (correct, correctAnswer, points, newDifficulty)

    alt Antwort korrekt
        UI-->>Kind: Gruenes Feedback-Overlay + Punkte
    else Antwort falsch
        UI-->>Kind: Rotes Feedback-Overlay + korrekte Antwort
    end

    UI->>GenAction: Naechste Aufgabe generieren (mit neuer Schwierigkeit)
```

**Erlaeuterung:**

Die Uebungssession folgt einem sicherheitsbewussten Architekturmuster: Der Server sendet die Aufgabe ohne korrekte Antwort an den Client (Schutz vor Manipulation im Browser). Bei der Abgabe berechnet der Server die korrekte Antwort eigenstaendig aus den Operanden neu und validiert zusaetzlich, dass die Operanden zur Klassenstufe und Schwierigkeit passen (Schutz vor Trivialaufgaben-Einschleusung). Die Schwierigkeit passt sich automatisch an die Leistung des Kindes an: Nach mehreren korrekten Antworten in Folge steigt sie, nach mehreren Fehlern sinkt sie.

---

## 4. BPMN-Prozessdiagramm: Uebungsprozess mit Gamification-Loop

Das folgende Prozessdiagramm bildet den vollstaendigen Uebungsablauf als BPMN-aehnliches Flussdiagramm ab. Es zeigt den Kern-Loop der Aufgabenbearbeitung sowie das Gamification-Gate, das den Zugang zum Belohnungs-Minispiel steuert.

```mermaid
flowchart TD
    Start((Start)) --> Generate[Aufgabe generieren]
    Generate --> Display[Aufgabe anzeigen]
    Display --> Input[Antwort eingeben]
    Input --> Check{Korrekt?}
    Check -->|Ja| Points[Punkte vergeben]
    Check -->|Nein| ShowCorrect[Korrekte Antwort zeigen]
    Points --> Difficulty[Schwierigkeit anpassen]
    ShowCorrect --> NextQ[Naechste Aufgabe]
    Difficulty --> Threshold{Punkte-Schwelle erreicht?}
    Threshold -->|Nein| NextQ
    NextQ --> Generate
    Threshold -->|Ja| Unlock[Mini-Game freischalten]
    Unlock --> Game[Mini-Game spielen]
    Game --> Reset[Punkte zuruecksetzen]
    Reset --> End((Ende))
```

**Erlaeuterung des Prozessablaufs:**

Der **Kern-Loop** der Anwendung folgt dem Zyklus: Aufgabe generieren, anzeigen, Antwort entgegennehmen, auswerten und die naechste Aufgabe vorbereiten. Dieser Loop wiederholt sich kontinuierlich waehrend einer Uebungssession. Bei jeder korrekt geloesten Aufgabe werden Punkte als **Fortschrittsindikator** vergeben, deren Hoehe von der aktuellen Schwierigkeitsstufe abhaengt (hoehere Schwierigkeit ergibt mehr Punkte).

Das **Belohnungs-Gate** prueft nach jeder Punktevergabe, ob die gesammelte Punktzahl einen definierten Schwellenwert erreicht hat. Erst wenn diese Schwelle ueberschritten ist, wird das Minispiel als Belohnung freigeschaltet. Dieser Mechanismus stellt sicher, dass das Kind ausreichend geuebt hat, bevor es die Belohnung erhaelt. Die **Schwierigkeits-Adaption** passt sich automatisch an die Leistung des Kindes an: Nach mehreren korrekten Antworten in Folge steigt die Schwierigkeit, nach mehreren Fehlern wird sie reduziert, um Frustration zu vermeiden und den Lerneffekt zu maximieren.
