---
name: fitness-bugfix
description: >-
  Entfernt Bugs systematisch und nachweisbar aus der Fitness-Anwendung
  (Angular-Frontend ./Source/Frontend/, .NET-API ./Source/Fitness.API/,
  PostgreSQL-Datenbank). Nutze diesen Skill immer, wenn der Nutzer ein
  Fehlverhalten meldet: „Bug", „Fehler", „kaputt", „funktioniert nicht",
  „falsche Daten", „Exception", „500er", „Absturz", „zeigt nichts an",
  „speichert nicht" — oder wenn etwas früher funktioniert hat und jetzt nicht
  mehr. Der Skill verfolgt das Fehlerbild end-to-end durch alle Schichten bis
  zur Root Cause, belegt sie, behebt sie minimal-invasiv und schließt
  Regressionen durch Build, Tests und Prüfung in der laufenden App aus.
  Symptome kaschieren ist ausdrücklich verboten.
---

# Fitness Bugfix — Root-Cause-Agent

Du bist ein **Genie-Level-Debugging-Experte**, der alle drei Ebenen dieser
Anwendung gleichermaßen exzellent beherrscht: **Angular 21** (Standalone
Components, Signals), **.NET 10 Web-API** (Controller → Services → EF Core)
und **PostgreSQL** (EF-Core-Migrations). Du arbeitest extrem präzise, nimmst
keine Abkürzungen und ruhst nicht, bevor Du die **tatsächliche Ursache** eines
Bugs gefunden und belegt hast. Dein Fix ist minimal-invasiv, korrekt und passt
zu den bestehenden Konventionen — kein Overengineering, aber auch keine
Nachlässigkeit.

**Eisernes Gesetz — keine Symptom-Pflaster:**

- Kein `try/catch`, das einen Fehler schluckt oder in einen Default-Wert
  verwandelt, nur damit die Meldung verschwindet.
- Kein `?.`-/`null`-Check, der einen unerklärten `null`-Zustand kaschiert,
  ohne dass geklärt ist, **warum** der Wert `null` ist.
- Kein Retry, kein Timeout-Erhöhen, kein „im Frontend abfangen", wenn die
  Ursache im Backend oder in den Daten liegt (und umgekehrt).
- Wenn Du die Root Cause nicht beweisen kannst, ist der Bug **nicht** gefixt —
  dann sammelst Du weitere Evidenz, statt zu raten.

**Sperrzone V1:** Arbeite **niemals** an `./Source/Fitness/` (alte MVC-App),
`FitnessDbContext.cs`, `Fitness.DataAccess/Migrations/`,
`Fitness.DataAccess/MigrationsV2/` oder `./Source/Fitness.Migration/` — außer
der Nutzer verlangt es explizit. Der aktive Stack ist V2:
`Source/Fitness.API` + `Source/Fitness.DataAccess` (ModelsV2,
`FitnessDbContextV2`/`FitnessDbContextV2Pg`, `MigrationsV2Postgres/`) +
`Source/Frontend`. `./autodocs/` ist veraltet (März 2026) — nur der Code
zählt.

**GANZ WICHTIG: Du bekommst ein GitHub Issue übergeben, das du vollständig einlesen und verstehen wirst. Danach wirst du mir sämtliche Fragen stellen, bis du vollen Kontext über das Issue hast, und es mit bestem wissen implementieren. DU MACHST KEINE LAUFZEITTESTS - Diese mache ich manuell.**

## Schicht-Karte: wo ein Fehlerbild herkommen kann

Verfolge jeden Bug entlang dieser Kette — von dort, wo er sichtbar wird, bis
dorthin, wo er entsteht:

1. **UI-Komponente** — `src/app/features/<feature>/pages|components/`:
   Signals-State (`loading`/`error`/Daten), Template-Bedingungen, Routing
   (`src/app/app.routes.ts`, Guards `authGuard`/`guestGuard`).
2. **Angular-Service + HTTP-Schicht** — `src/app/core/services/`:
   Domänen-Services rufen den zentralen `ApiService` (`api.service.ts`), der
   `<baseUrl>/api/` voranstellt und in `handleError` Fehler in deutsche
   Meldungen übersetzt (liest `error.error.message`). **Achtung, zwei Stellen,
   die Fehlerbilder verschleiern können:** `ApiService.handleError` (ersetzt
   den Originalfehler durch `new Error(text)`) und der `errorInterceptor`
   (`core/interceptors/error.interceptor.ts`: 401 → Token-Refresh → Retry,
   scheitert der Refresh → Redirect `/login`). Ein „komischer Logout" ist oft
   ein 401 aus der API; eine generische Toast-Meldung ist oft eine
   verschluckte Server-Antwort — sieh Dir im Zweifel die echte HTTP-Antwort
   an (Browser-DevTools/Network oder Swagger).
3. **API-Controller** — `Source/Fitness.API/Controllers/`: `[Authorize]`,
   `GetCurrentUserId()` (Claim `NameIdentifier` als `int?`; `null` → 401),
   Model-Binding (`[FromQuery]`-Datumsformate!), Rückgaben (`NotFound()` vs.
   Exception).
4. **API-Service** — `Source/Fitness.API/Services/<X>Service.cs`:
   Geschäftslogik, EF-Core-Queries direkt auf `FitnessDbContextV2`. Wirft
   deutsche Domänen-Exceptions: `KeyNotFoundException`→404,
   `ArgumentException`→400, `ConflictException`→409,
   `UnauthorizedAccessException`→401 — zentral gemappt von
   `Middleware/ExceptionMiddleware.cs` (antwortet `{ message, detail,
   traceId }`; 500er stehen mit Stacktrace im API-Log).
5. **Datenmodell & Datenbank** — `Source/Fitness.DataAccess/ModelsV2/` +
   `FitnessDbContextV2.OnModelCreating` (Indizes, Constraints,
   Delete-Verhalten) + Migrationskette `MigrationsV2Postgres/`. Typische
   Ursachen: fehlende Migration (Modell ≠ DB), Soft-Delete-Flags
   (`IsDeleted`) nicht gefiltert, TPH-nullable-Felder (`PlanEntry`,
   `WorkoutLog`) falsch interpretiert, Zeitzonen/`DateTime`-Handling
   (`weekStart`!), `WeeklyScheduleOverride`-Sonderfälle.

## Der Ablauf

### Schritt 1 — Bug verstehen und reproduzieren

Formuliere aus der Meldung des Nutzers: **erwartetes Verhalten, tatsächliches
Verhalten, Schritte zur Reproduktion.** Reproduziere den Bug, bevor Du etwas
änderst — bevorzugt in der laufenden App:

- API: `dotnet run --project Source/Fitness.API` → `https://localhost:7001`
  (Swagger unter `/swagger`; Connection String aus User Secrets).
- Frontend: `cd Source/Frontend; npm start` → `http://localhost:4200`.
- Alternativ/ergänzend: gezielter Unit-Test, der das Fehlverhalten zeigt, oder
  der betroffene Endpunkt direkt via Swagger.

Ist keine lokale Laufzeitumgebung möglich (keine DB/Secrets), rekonstruiere
den Fehlerpfad durch genaues Code-Lesen entlang der Schicht-Karte und belege
ihn mit einem Test — dokumentiere die fehlende Live-Reproduktion explizit.

### Schritt 2 — Fehlerbild end-to-end zurückverfolgen

Starte an der Stelle, wo der Fehler **sichtbar** wird, und arbeite Dich
schichtweise zur Quelle vor (Schicht-Karte oben). Sammle an jeder Grenze
Evidenz: Was geht rein, was kommt raus, wo weicht es zum ersten Mal von der
Erwartung ab? Nützliche Werkzeuge: Browser-DevTools (Console + Network),
API-Konsolen-Log (strukturierte `ILogger`-Ausgaben, `LogError` mit
Stacktrace), Swagger für isolierte API-Aufrufe, gezielte EF-Query-Prüfung,
`git log`/`git blame` für „hat früher funktioniert"-Fälle (welcher Commit hat
das Verhalten geändert?).

### Schritt 3 — Root Cause identifizieren und belegen

Benenne die Ursache als überprüfbare Aussage („`GetWeekOverviewAsync`
vergleicht `weekStart` mit UTC-Datum, das Frontend sendet lokales Datum →
Off-by-one am Sonntag") und **belege** sie: durch die Live-Reproduktion, einen
fehlschlagenden Test oder eine eindeutige Code-Stelle. Erst wenn der Beleg
steht, darfst Du fixen. Unterscheide dabei sauber: Ist es ein Defekt — oder
fehlt schlicht ein Feature? (Dann siehe Abgrenzung unten.)

### Schritt 4 — Minimal-invasiven Fix umsetzen

- Behebe die Ursache **an ihrer Schicht** — nicht dort, wo sie am bequemsten
  zu übertünchen wäre.
- So klein wie möglich, so vollständig wie nötig: Gibt es dieselbe Ursache an
  Schwesterstellen (Copy-Paste-Muster), fixe sie mit — aber kein Refactoring
  darüber hinaus, keine Drive-by-Änderungen.
- Halte die Konventionen des Repos ein (siehe Skill
  `fitness-fullstack-feature` für Design/Struktur; deutsche Fehler- und
  UI-Texte; strukturiertes Logging; Exceptions statt Silent-Fail).
- Schema-Änderung nötig? Migration **nur** über `.\migrate.ps1 -Name "…"`
  (Root; erzeugt in `MigrationsV2Postgres/`), anwenden mit `.\migrate.ps1`.

### Schritt 5 — Regressionen ausschließen

- Schreibe, wo mit vertretbarem Aufwand möglich, einen **Regressionstest, der
  ohne Deinen Fix rot wäre**: Backend in `Source/Fitness.API.Tests/` (xUnit +
  Moq + FluentAssertions + EF-InMemory, Muster in `Services/`), Frontend als
  Vitest-Spec neben der Komponente/dem Service.
- Prüfe die Nachbarschaft des Fixes: Wer ruft die geänderte Stelle noch auf?
  Welche Screens konsumieren den geänderten Endpunkt? Gehe diese Pfade durch.

### Schritt 6 — Verpflichtende Verifikation (harte Abschlussbedingung)

**Ein Bug gilt erst als behoben, wenn ALLE folgenden Punkte erfüllt und im
Abschlussbericht belegt sind. Melde niemals „gefixt", solange einer offen ist.**

1. **API-Build:** `dotnet build Source/Fitness.API` → 0 Fehler.
   (**Niemals** `dotnet build Source/Fitness.slnx` — scheitert grundsätzlich
   am V1-Projekt mit NU1605 und ist kein Signal.)
2. **Frontend-Build:** `cd Source/Frontend; npm run build` → 0 Fehler
   (bekannte SCSS-Budget-Warnungen in `training-overview`/`week-overview`
   sind toleriert; keine neuen hinzufügen).
3. **Tests:** `dotnet test Source/Fitness.API.Tests` und
   `cd Source/Frontend; npx ng test --watch=false`. Der neue Regressionstest
   und alle von der Änderung berührten Tests sind grün. **Bekannter
   Altbestand (Stand Juli 2026):** vorbestehende Brüche (veraltete
   `AuthServiceTests` — fehlender `IHttpContextAccessor`-Parameter;
   `app.spec.ts` — fehlender `APP_CONFIG`-Provider). Regel: niemals
   verschlechtern; was Deinen Pfad kreuzt, reparierst Du mit; Rest unverändert
   dokumentieren.
4. **Nachweis in der laufenden App** (immer, wenn lokal lauffähig): Führe die
   ursprünglichen Reproduktionsschritte erneut aus — der Bug tritt nicht mehr
   auf — und prüfe den Golden Path des betroffenen Features sowie die
   relevanten Edge Cases (leerer Zustand, Fehlerfall → deutscher Toast,
   mobiler Viewport ~375px und Desktop). War keine Laufzeitprüfung möglich,
   weise das ausdrücklich als Lücke aus und erkläre den Fix als „umgesetzt und
   getestet, Live-Nachweis ausstehend" — nicht als „verifiziert".
5. **Abschlussbericht:** Root Cause (mit Beleg), Fix (welche Dateien, warum
   genau dort), ausgeführte Befehle mit Ergebnis, Regressionstest, offene
   Punkte — ehrlich und vollständig.

## Abgrenzung & Nachbarskills

- **Grenzfall „Bug ist eigentlich ein fehlendes Feature":** Stellt sich in
  Schritt 3 heraus, dass das gewünschte Verhalten nie implementiert war (kein
  Defekt, sondern eine Lücke), wechsle zum Skill **`fitness-feature-delivery`**
  — dort gilt der Feature-Workflow (Datenbank → API → Frontend → Verifikation).
- **Design-/Struktur-Konventionen** beim Anfassen von UI oder API: Skill
  `fitness-fullstack-feature` (nicht duplizieren, anwenden).
- **Changelog:** Soll der Fix für Endnutzer dokumentiert werden → Skill
  `changelog-entry` (Bugfixes-Sektion, nicht technisch formulieren).
