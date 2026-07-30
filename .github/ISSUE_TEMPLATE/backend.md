---
name: "Backend Issue"
about: "Features, Changes oder Bugs in der API (./Source/Fitness.API/). NUR Änderungen im Backend — kein Frontend-Code."
labels: ["Backend"]
title: "[Backend] "
---

<!--
  Titel-Format: [Backend] + kurze Beschreibung im Imperativ
  Beispiel: [Backend] Endpoint für heutiges Training bereitstellen
  Entferne Sektionen, die nicht zutreffen.

  SCOPE-REGEL: Dieses Template gilt ausschließlich für Änderungen in ./Source/Fitness.API/.
  Frontend betroffen → frontend.md | Beides betroffen → fullstack.md
-->

## 📋 Zusammenfassung
<!-- Ein Satz: Was soll neu möglich sein oder was soll sich ändern? -->


## 🎯 Motivation & Problem
<!-- Welches Problem löst diese Änderung? Für wen? Warum ist es wichtig?
     Format: „Als [Nutzerrolle / System] möchte ich [Ziel], damit [Mehrwert]." -->


---

## 💡 Beschreibung der Lösung
<!-- Wie soll die Änderung funktionieren? Beschreibe das gewünschte Verhalten
     aus Sicht des API-Konsumenten. Kein Implementierungsdetail — das kommt weiter unten. -->


### Nicht im Scope
<!-- Was gehört explizit NICHT zu diesem Issue? -->

- Keine Frontend-Änderungen
- 

---

## 🗺️ Wo (`./Source/Fitness.API/`)

| Feld              | Wert |
|-------------------|------|
| Controller        | `z.B. TrainingController` |
| Endpoint(s)       | `z.B. GET /api/training/today` |
| Service / Logic   | `z.B. TrainingService` |
| Datenmodell       | `z.B. TodayTrainingDto` |
| Branch            | `main` |

---

## 🔌 API-Vertrag
<!-- Beschreibe die Schnittstelle so präzise, dass das Frontend sie ohne Rückfragen konsumieren kann. -->

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
- **Risiken / Breaking Changes:** 
- **Datenbankänderungen erforderlich:** `[ ] Ja  [ ] Nein`

---

## ✅ Acceptance Criteria

### Funktional
- [ ] ...
- [ ] ...
- [ ] Keine Regression in bestehenden Endpoints

### API & Architektur
- [ ] Endpoint folgt REST-Konventionen (korrekte HTTP-Verben, Statuscodes, Ressourcen-Benennung)
- [ ] Response-DTOs sind klar definiert und enthalten keine internen Implementierungsdetails (keine EF-Entities direkt serialisiert)
- [ ] Eingaben werden serverseitig validiert (Data Annotations oder FluentValidation); ungültige Requests liefern `400` mit strukturierter Fehlermeldung
- [ ] Authentifizierung / Autorisierung ist korrekt gesetzt (kein ungeschützter Endpoint ohne Absicht)
- [ ] Code folgt dem bestehenden Architekturmuster des Projekts (Controller → Service → Repository)

### Logging & Exception Handling
- [ ] Jede Anfrage ist mit aussagekräftigen strukturierten Log-Einträgen versehen (`ILogger<T>`, Serilog o. Ä.)
- [ ] Log-Level sind korrekt gewählt: `Debug` für Diagnose, `Information` für Normalfluss, `Warning` für erwartete Ausnahmen, `Error` für unerwartete Fehler
- [ ] Exceptions werden zentral abgefangen (Global Exception Handler / Middleware); kein unkontrolliertes Durchschlagen von Stack Traces an den Client
- [ ] Fehlerantworten sind einheitlich strukturiert (`{ type, title, status, detail }` — RFC 7807 / ProblemDetails) und maschinenlesbar
- [ ] Bekannte Fehlerfälle (Not Found, Conflict, Unauthorized) werden als spezifische HTTP-Statuscodes zurückgegeben, nicht pauschal als `500`

### Code-Qualität
- [ ] Keine Magic Strings oder Magic Numbers — Konstanten oder Enums verwenden
- [ ] Methoden haben eine einzige Verantwortung (Single Responsibility); Methodenlänge maximal überschaubar (Richtwert: ≤ 30 Zeilen)
- [ ] Keine Code-Duplikation — gemeinsame Logik ist in Services oder Extensions ausgelagert
- [ ] Asynchrone Methoden sind durchgängig `async/await`; kein `.Result` oder `.Wait()` (Deadlock-Risiko)
- [ ] Ressourcen (DB-Connections, Streams) werden mit `using` / `IDisposable` korrekt freigegeben

---

## 🏁 Definition of Done

- [ ] Alle Acceptance Criteria erfüllt und von Reviewer bestätigt
- [ ] Änderungen ausschließlich in `./Source/Fitness.API/`
- [ ] Kein Frontend-Code verändert
- [ ] Dokumentation / CHANGELOG aktualisiert (falls relevant)

---

## 🔗 Zusätzlicher Kontext
<!-- Verwandte Issues, externes Feedback, Nutzer-Berichte -->

- Verwandte Issues: #
- Nutzer-Feedback / Quelle: 
