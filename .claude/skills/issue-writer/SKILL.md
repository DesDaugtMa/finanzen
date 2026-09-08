---
name: issue-writer
description: >-
  Erstellt aus einer Nutzereingabe (Bug-Meldung, Feature-Wunsch, Change-Idee)
  ein ausführliches, präzises GitHub Issue für dieses Repo (Angular-Frontend
  ./Source/Frontend/, .NET-API ./Source/Backend/). Analysiert VOR dem
  Anlegen die betroffenen Codestellen (Grep/Read), denkt Edge Cases und
  Risiken durch und befüllt dabei zwingend eines der passenden Templates aus
  ./.github/ISSUE_TEMPLATE/ (bug.md, feature.md, backend.md, frontend.md,
  fullstack.md) vollständig aus, statt ein Issue frei zu formulieren. Nutze
  diesen Skill, wenn der Nutzer ein Issue erstellen/anlegen will, „schreib
  mir ein Issue", „mach daraus ein GitHub Issue" oder ähnliches sagt.
---

# Issue Writer

Du erstellst GitHub Issues für dieses Repository. Ein gutes Issue hier ist
eines, das ein Entwickler ohne Rückfragen umsetzen kann — weil es die
betroffene Codestelle konkret benennt, das gewünschte Verhalten präzise
beschreibt und Edge Cases bereits mitdenkt. Rate nichts, was du nachschlagen
kannst.

**Nicht verhandelbar:** Ein passendes Template aus `./.github/ISSUE_TEMPLATE/`
MUSS für die Erstellung verwendet werden — nie ein freihändig formatiertes
Issue. Vor dem Anlegen MUSS der betroffene Code tatsächlich gelesen worden
sein — nie aus Vermutung heraus schreiben.

## Ablauf

### 1. Input verstehen

Lies die Nutzereingabe genau. Wenn eindeutig erkennbar ist, ob es sich um
einen Bug, ein neues Feature oder eine Änderung an bestehendem Verhalten
handelt, und ob Frontend, Backend oder beides betroffen sind, triff die
Entscheidung selbst — frag nur nach, wenn die Eingabe so vage ist, dass keine
sinnvolle Codeanalyse möglich ist (z. B. weder Symptom noch Ort noch
gewünschtes Verhalten erkennbar).

### 2. Template wählen

Repo-Templates (`./.github/ISSUE_TEMPLATE/`):

| Template | Wann |
|---|---|
| `bug.md` | Fehlverhalten, unklar oder beide Schichten betroffen, kein API-Vertrag im Fokus |
| `feature.md` | Neues Verhalten, unklar oder beide Schichten betroffen, kein API-Vertrag im Fokus |
| `backend.md` | Ausschließlich `./Source/Backend/` betroffen (Controller, Service, API-Vertrag, DB) |
| `frontend.md` | Ausschließlich `./Source/Frontend/` betroffen (Komponente, Service, UI/UX, Styling) |
| `fullstack.md` | Frontend UND Backend gemeinsam betroffen (neuer Endpoint + neue Ansicht dafür) |

Bei einem Bug, der eindeutig nur in einer Schicht liegt, ist `backend.md`
bzw. `frontend.md` dem generischen `bug.md` vorzuziehen, wenn API-Vertrag
bzw. Styleguide-Kriterien relevant sind — sonst `bug.md`.

**Wichtig zu den Templates:** Einige Templates enthalten stellenweise
Altlasten aus einem Schwester-Projekt (z. B. `Fitness.API` statt
`Backend`/`Backend.API`, oder einen Link auf eine nicht existierende
`STYLE_GUIDE.md`). Übernimm die **Struktur und die Prüf-Checklisten**
unverändert, aber schreibe in die Inhalte die **tatsächlichen Pfade dieses
Repos** (`Source/Backend/...`, `Source/Frontend/...`) statt der
Platzhalter-Beispielwerte aus dem Template. Verlinke keine Datei, die nicht
existiert.

### 3. Betroffene Codestellen analysieren (Pflicht, vor dem Schreiben)

Bevor du auch nur einen Abschnitt des Issues formulierst:

- Grep/Glob nach den relevanten Begriffen (Entität, Route, Fehlermeldung,
  Property-Name) in `./Source/Backend/` und `./Source/Frontend/`.
- Lies die konkret betroffenen Dateien vollständig (Controller, Service,
  Component, Template) — nicht nur die Trefferzeile.
- Bei Bugs: verfolge den Pfad von der UI/API-Antwort bis zur Datenquelle
  (Component → Service → Controller → Service → EF-Core-Modell), um die
  wahrscheinliche Ursache zu benennen, ohne sie als sicher hinzustellen,
  falls sie nicht verifiziert ist.
- Bei Features: identifiziere die nächstliegenden bestehenden Analogien
  (ähnlicher Endpoint, ähnliche Komponente), auf denen die Umsetzung
  aufbauen sollte, und die Stellen, die für die Integration angefasst werden
  müssen (Routing, DI-Registrierung, Navigation).
- Halte fest, welche Dateien/Klassen/Methoden/Routen konkret betroffen sind —
  das sind die Werte für die „Wo"-Tabelle des Templates, nicht Platzhalter.
- Wenn eine Codestelle trotz Suche nicht eindeutig lokalisiert werden kann,
  schreib das explizit ins Issue (z. B. unter „Technische Hinweise") statt
  einen falschen Pfad zu raten.

Für große/unklare Suchen: nutze bei Bedarf den `Explore`-Agent, um Codestellen
zu finden, lies aber die zentralen Treffer selbst, bevor du das Issue
formulierst — die Analyse muss auf tatsächlich gelesenem Code beruhen.

### 4. Edge Cases & Probleme durchdenken

Leite aus dem gelesenen Code aktiv mögliche Problemfälle ab, die über die
Nutzereingabe hinausgehen, und benenne sie im Issue (Acceptance Criteria
und/oder „Technische Hinweise"), z. B.:

- Grenzwerte und leere/`null`-Zustände (leere Liste, 0-Beträge, fehlende
  Pflichtfelder, sehr lange Strings)
- Nebenläufigkeit/Race Conditions bei parallelen Requests oder Multi-Device
- Berechtigungen: gehört die betroffene Entität wirklich dem eingeloggten
  Nutzer (`GetCurrentUserId()`-Check), invite-only-Auswirkungen
- Geldbeträge: Rundung, Vorzeichen, Währungs-/Dezimal-Konsistenz
- Migrations-/Datenkompatibilität, wenn sich ein Datenmodell ändert
- Offline/PWA-Verhalten, wenn Frontend betroffen ist (Service Worker,
  IndexedDB-Cache, Sync bei Wiederverbindung)
- Fehlerfälle der Gegenseite: Was zeigt das Frontend, wenn der Backend-Call
  fehlschlägt? Welchen Status liefert das Backend bei ungültigem Input?
- Regressionsrisiko: welche bestehenden Features nutzen denselben Code-Pfad
  und könnten brechen?

Nicht jeder Punkt passt auf jedes Issue — wähle die tatsächlich relevanten
aus, statt die Liste generisch abzuspulen.

### 5. Issue-Body verfassen

Fülle **jeden Abschnitt** des gewählten Templates mit konkretem Inhalt aus
Schritt 3 und 4 — keine Platzhalter, keine leeren `<!-- -->`-Kommentare
stehen lassen (Kommentare selbst dürfen entfernt werden, sie sind nur
Ausfüllhilfe). Entferne nur Abschnitte, die laut Template-Hinweis „falls
zutreffend" sind und hier wirklich nicht zutreffen (z. B. UX/Design bei einem
reinen Backend-Bugfix ohne UI-Bezug) — kürze nicht aus Bequemlichkeit.

Titel: exakt im Format aus dem Template-Frontmatter (`title:`), z. B.
`[Bug] Fehlende Validierung bei negativem Transaktionsbetrag`.

Labels: die im Template-Frontmatter vorgegebenen (`labels:`) plus, falls
eindeutig zutreffend, passende zusätzliche Labels aus dem bestehenden
Label-Set des Repos (`gh label list`, z. B. `Geldkonto`, `Depot`,
`Kryptowallet`, `Benutzer`, `Database`, `Change`, `Infrastructure`). Kein
Label erfinden, das nicht existiert.

### 6. Issue anlegen

Schreibe den fertigen Body in eine temporäre `.md`-Datei und lege das Issue
per `gh issue create` an (Body per `--body-file`, nicht `--body`, wegen
Formatierung/Sonderzeichen):

```bash
gh issue create --title "[Bug] ..." --body-file /tmp/issue-body.md --label "Bug" --label "Backend"
```

Bestätige dem Nutzer danach kurz, welches Template verwendet wurde, mit
welchen Labels, und gib den Link zum angelegten Issue aus.

### 7. Wenn der Nutzer nur einen Entwurf will

Falls die Eingabe erkennen lässt, dass der Nutzer das Issue vor dem Anlegen
noch sehen/freigeben will (oder es unklar ist, ob es sofort öffentlich
angelegt werden soll), zeig den fertigen Markdown-Body zuerst im Chat und
frag kurz nach, bevor du `gh issue create` ausführst. Ist der Auftrag
eindeutig „leg das Issue an", lege direkt an.
