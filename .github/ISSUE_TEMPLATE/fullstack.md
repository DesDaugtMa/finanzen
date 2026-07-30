---
name: "Fullstack Issue"
about: "Features, Changes oder Bugs, die gleichzeitig Frontend (./Source/Frontend/) UND Backend-API (./Source/Fitness.API/) betreffen."
labels: ["Frontend", "Backend"]
title: "[Fullstack] "
---

<!--
  Titel-Format: [Fullstack] + kurze Beschreibung im Imperativ
  Beispiel: [Fullstack] Heutiges Training auf der Startseite anzeigen
  Entferne Sektionen, die nicht zutreffen.

  SCOPE-REGEL: Dieses Template nur verwenden, wenn BEIDE Seiten betroffen sind.
  Nur Frontend → frontend.md | Nur Backend → feature.md / bug.md
-->

## 📋 Zusammenfassung
<!-- Ein Satz: Was soll neu möglich sein oder was soll sich ändern? -->


## 🎯 Motivation & Problem
<!-- Welches Problem löst diese Änderung? Für wen? Warum ist es wichtig?
     Format: „Als [Nutzerrolle] möchte ich [Ziel], damit [Mehrwert]." -->


---

## 💡 Beschreibung der Lösung
<!-- Wie soll das Feature/die Änderung funktionieren? Beschreibe das gewünschte Verhalten
     aus Nutzersicht. Kein Implementierungsdetail — das kommt weiter unten. -->


### Nicht im Scope
<!-- Was gehört explizit NICHT zu diesem Issue? -->

- 

---

## 🗺️ Wo

### Frontend (`./Source/Frontend/`)

| Feld              | Wert |
|-------------------|------|
| Route / URL       | `z.B. /training/overview` |
| Komponente(n)     | `z.B. training-overview.component.ts` |
| Service(s)        | `z.B. TrainingService` |
| SCSS-Datei(en)    | `z.B. training-overview.component.scss` |

### Backend (`./Source/Fitness.API/`)

| Feld              | Wert |
|-------------------|------|
| Controller        | `z.B. TrainingController` |
| Endpoint(s)       | `z.B. GET /api/training/today` |
| Service / Logic   | `z.B. TrainingService` |
| Datenmodell       | `z.B. TodayTrainingDto` |

| Branch | `main` |
|--------|--------|

---

## 🎨 UX / Design
<!-- Mockups, Wireframes, Skizzen oder eine textuelle Beschreibung des UI-Verhaltens.
     Mobile-Ansicht zuerst beschreiben, Desktop-Anpassungen danach. -->

**Mobile (< 768 px):**

**Desktop (≥ 768 px):**

**PWA-spezifisches Verhalten (Standalone-Modus, Offline):**

---

## 🔌 API-Vertrag
<!-- Beschreibe die Schnittstelle zwischen Frontend und Backend so präzise, dass beide Seiten
     unabhängig voneinander implementiert werden können. -->

**Endpoint:**
```
GET/POST/PUT/DELETE /api/...
```

**Request-Body / Query-Parameter:**
```json

```

**Response (Success 2xx):**
```json

```

**Fehlercodes & Bedeutung:**

| HTTP-Status | Bedeutung | Erwartet vom Frontend |
|-------------|-----------|----------------------|
| `400`       |           |                      |
| `401`       |           |                      |
| `404`       |           |                      |
| `500`       |           |                      |

---

## ⚙️ Technische Hinweise

- **Abhängigkeiten:** 
- **Offline-Relevanz:** Welche API-Daten müssen gecacht werden (Service Worker / IndexedDB)?
- **Risiken / Breaking Changes:** 
- **Datenbankänderungen erforderlich:** `[ ] Ja  [ ] Nein`

---

## ✅ Acceptance Criteria

### Funktional
- [ ] ...
- [ ] ...
- [ ] Fehlerfall ist behandelt und kommuniziert (Validierung, leere States, Ladezustände)
- [ ] Keine Regression in bestehenden Funktionen

### Frontend — Styleguide ([`./Documentation/Application/STYLE_GUIDE.md`](../../Documentation/Application/STYLE_GUIDE.md))
- [ ] Alle Farben, Abstände und Schatten referenzieren ausschließlich die in `styles.scss` definierten CSS Custom Properties (keine Magic Numbers, keine Inline-Styles mit Literal-Werten)
- [ ] Abstände sind Vielfache von `0.25 rem` (4 px-Raster) — keine Werte wie 3 px, 5 px, 7 px
- [ ] Bootstrap 5 wird als Fundament genutzt; eigene SCSS-Klassen erweitern Bootstrap, überschreiben es nicht ohne begründetes `!important`
- [ ] Animationen/Übergänge liegen zwischen 150 ms und 400 ms
- [ ] Jede erhöhte Fläche (Card, Toast, Modal) hat exakt eine der drei definierten Shadow-Stufen
- [ ] WCAG 2.1 AA erfüllt: Kontrast ≥ 4,5:1 für Text, ≥ 3:1 für UI-Elemente
- [ ] Alle interaktiven Elemente haben einen sichtbaren Fokus-Ring und (wo kein sichtbares Label existiert) ein ARIA-Label

### Frontend — Mobile-First & Responsive
- [ ] Implementierung startet mit dem Mobile-Layout (< 768 px); Desktop-Anpassungen sind Erweiterungen davon
- [ ] Unter 768 px ist die Bottom-Navigation aktiv und alle Inhalte sind ohne horizontales Scrollen zugänglich
- [ ] Ab 768 px wechselt die Navigation auf die Sidebar; Layout nutzt das Bootstrap-Grid für die größere Viewport-Breite
- [ ] Alle Touch-Targets sind mindestens 44 × 44 px

### Frontend — PWA & Offline
- [ ] Alle dargestellten Funktionen sind im PWA-Standalone-Modus vollständig nutzbar
- [ ] Offline-Szenarien sind berücksichtigt: betroffene Daten werden gecacht (Service Worker / IndexedDB) und stehen ohne Netzwerk zur Verfügung
- [ ] Der Nutzer erhält visuelles Feedback über den Offline-Status, wenn eine Aktion nicht sofort synchronisiert werden kann
- [ ] Keine Funktion der Applikation wird durch fehlende Netzwerkverbindung dauerhaft blockiert

### Backend — API & Architektur
- [ ] Endpoint folgt REST-Konventionen (korrekte HTTP-Verben, Statuscodes, Ressourcen-Benennung)
- [ ] Response-DTOs sind klar definiert und enthalten keine internen Implementierungsdetails (keine EF-Entities direkt serialisiert)
- [ ] Eingaben werden serverseitig validiert (Data Annotations oder FluentValidation); ungültige Requests liefern `400` mit strukturierter Fehlermeldung
- [ ] Authentifizierung / Autorisierung ist korrekt gesetzt (kein ungeschützter Endpoint ohne Absicht)
- [ ] Code folgt dem bestehenden Architekturmuster des Projekts (Controller → Service → Repository)

### Backend — Logging & Exception Handling
- [ ] Jede Anfrage ist mit aussagekräftigen strukturierten Log-Einträgen versehen (`ILogger<T>`, Serilog o. Ä.)
- [ ] Log-Level sind korrekt gewählt: `Debug` für Diagnose, `Information` für Normalfluss, `Warning` für erwartete Ausnahmen, `Error` für unerwartete Fehler
- [ ] Exceptions werden zentral abgefangen (Global Exception Handler / Middleware); kein unkontrolliertes Durchschlagen von Stack Traces an den Client
- [ ] Fehlerantworten an das Frontend sind einheitlich strukturiert (`{ type, title, status, detail }` — RFC 7807 / ProblemDetails) und maschinenlesbar
- [ ] Bekannte Fehlerfälle (Not Found, Conflict, Unauthorized) werden als spezifische HTTP-Statuscodes zurückgegeben, nicht pauschal als `500`

### Backend — Code-Qualität
- [ ] Keine Magic Strings oder Magic Numbers — Konstanten oder Enums verwenden
- [ ] Methoden haben eine einzige Verantwortung (Single Responsibility); Methodenlänge maximal überschaubar (Richtwert: ≤ 30 Zeilen)
- [ ] Keine Code-Duplikation — gemeinsame Logik ist in Services oder Extensions ausgelagert
- [ ] Asynchrone Methoden sind durchgängig `async/await`; kein `.Result` oder `.Wait()` (Deadlock-Risiko)
- [ ] Ressourcen (DB-Connections, Streams) werden mit `using` / `IDisposable` korrekt freigegeben

---

## 🏁 Definition of Done

- [ ] Alle Acceptance Criteria erfüllt und von Reviewer bestätigt
- [ ] Frontend-Änderungen ausschließlich in `./Source/Frontend/`
- [ ] Backend-Änderungen ausschließlich in `./Source/Fitness.API/`
- [ ] API-Vertrag (Endpoint, Request, Response) stimmt zwischen Frontend-Implementierung und Backend-Implementierung überein
- [ ] Dokumentation / CHANGELOG aktualisiert (falls relevant)

---

## 🔗 Zusätzlicher Kontext
<!-- Verwandte Issues, externes Feedback, Analytics-Daten, Nutzer-Berichte -->

- Verwandte Issues: #
- Design-Datei / Figma: 
- Nutzer-Feedback / Quelle: 
