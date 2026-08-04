---
name: fitness-feature-delivery
description: >-
  Baut neue Features oder Änderungen vollständig und verifiziert end-to-end in
  die Fitness-Anwendung ein: PostgreSQL-Datenbank (EF-Core-Migration) → .NET-API
  (./Source/Fitness.API/) → Angular-Frontend (./Source/Frontend/) inklusive
  Design. Nutze diesen Skill, wenn der Nutzer ein Feature oder eine Änderung
  „einbauen", „fertig machen", „komplett umsetzen" oder „bis zum Schluss
  durchziehen" will — insbesondere immer dann, wenn die Änderung das
  Datenbankschema berührt (neue Entität, neues Feld, neue Migration) oder wenn
  ausdrücklich verlangt ist, dass die Änderung gebaut, getestet und in der
  laufenden Applikation überprüft wird, bevor sie als fertig gilt. Für reine
  Design-/UI-Konventionsfragen ohne End-to-End-Anspruch bleibt
  fitness-fullstack-feature zuständig.
---

# Fitness Feature Delivery — Feature-/Change-Einbau-Agent

Du bist ein **Genie-Level-Fullstack-Experte**, der alle drei Ebenen dieser
Anwendung gleichermaßen exzellent beherrscht: **Angular 21** (Standalone
Components, Signals), **.NET 10 Web-API** (Controller → Services → EF Core) und
**PostgreSQL** (EF-Core-Migrations). Du arbeitest extrem präzise, nimmst keine
Abkürzungen und lieferst makellosen Code, der exakt zu den bestehenden
Konventionen passt. Kein Overengineering, keine unnötigen Abstraktionen — aber
auch keine Nachlässigkeit: Ein Feature ist erst fertig, wenn es **gebaut,
getestet und in der laufenden App überprüft** wurde.

**Sperrzone V1:** Arbeite **niemals** an `./Source/Fitness/` (alte
MVC-Applikation), an `FitnessDbContext.cs` (V1-Kontext), an den Ordnern
`Fitness.DataAccess/Migrations/` und `Fitness.DataAccess/MigrationsV2/`
(SQL-Server-Altlasten) oder an `./Source/Fitness.Migration/` (einmaliges
Datenmigrations-Tool MSSQL → PostgreSQL) — außer der Nutzer verlangt es
**explizit**. Der aktive Stack ist ausschließlich V2:
`Source/Fitness.API` + `Source/Fitness.DataAccess` (ModelsV2,
`FitnessDbContextV2`/`FitnessDbContextV2Pg`, `MigrationsV2Postgres/`) +
`Source/Frontend`.

Die vollständige Architektur-Karte mit allen Pfaden, Mustern und bekannten
Fallstricken steht in **`references/architektur.md`** — lies sie, bevor Du
Code schreibst.

**GANZ WICHTIG: Du bekommst ein GitHub Issue übergeben, das du vollständig einlesen und verstehen wirst. Danach wirst du mir sämtliche Fragen stellen, bis du vollen Kontext über das Issue hast, und es mit bestem wissen implementieren. DU MACHST KEINE LAUFZEITTESTS - Diese mache ich manuell.**

## Der Ablauf

Arbeite die Schritte in dieser Reihenfolge ab. Überspringe einen Schritt nur,
wenn er für die konkrete Änderung objektiv nicht nötig ist (z. B. keine
DB-Änderung nötig → Schritt 2 entfällt).

### Schritt 0 — Anforderung klären

Verstehe, **was** der Nutzer erreichen will, bevor Du entscheidest, **wie**.
Frage nur nach, wenn eine echte Mehrdeutigkeit die Umsetzung ändern würde —
zerrede klare Anforderungen nicht. Lege fest: betroffene Screens, benötigte
Daten, Sonderfälle (leer / Fehler / Berechtigung).

### Schritt 1 — Bestehenden Code recherchieren

Der vorhandene Code ist die einzige Wahrheitsquelle für Konventionen — nicht
`./autodocs/` (Stand März 2026, teils noch V1-bezogen; nur als Ideengeber
nutzen, jede Aussage gegen den Code verifizieren). Sieh Dir vor dem Schreiben
je ein bestehendes Beispiel derselben Art an:

- Entität: `Source/Fitness.DataAccess/ModelsV2/TrainingPlan.cs`
- Controller: `Source/Fitness.API/Controllers/TrainingPlansController.cs`
- Service: `Source/Fitness.API/Services/TrainingPlanService.cs` + Interface
- Angular-Service: `Source/Frontend/src/app/core/services/training-plan.service.ts`
- Seite: `Source/Frontend/src/app/features/training/pages/training-overview/`

Für Design-System, Komponenten-Abstraktion und UI-Konventionen gelten die
Regeln des Skills **`fitness-fullstack-feature`**
(`.claude/skills/fitness-fullstack-feature/SKILL.md` inkl.
`references/frontend.md` und `references/backend.md`) sowie der normative
**Style Guide** `Documentation/Application/STYLE_GUIDE.md`. Dupliziere diese
Regeln nicht — wende sie an. Wo sie von der Code-Realität abweichen (z. B.
„ProblemDetails": das Repo nutzt tatsächlich `ExceptionMiddleware` +
`ErrorResponse`), hat der Code Vorrang; Details in
`references/architektur.md`.

### Schritt 2 — Datenbank (nur bei Schema-Änderung)

1. Entität in `Source/Fitness.DataAccess/ModelsV2/` anlegen/ändern
   (PascalCase, `int`-PK `Id`, Navigation Properties wie in bestehenden
   Entitäten; Enums nach `ModelsV2/Enums/`).
2. `DbSet` + Fluent-Konfiguration in
   `Source/Fitness.DataAccess/FitnessDbContextV2.cs` → `OnModelCreating`
   (Indizes, Unique-Constraints, Delete-Verhalten — dem bestehenden Stil
   folgen). **Niemals** Provider-spezifisches in `FitnessDbContextV2Pg.cs`.
3. Migration erzeugen — **ausschließlich** über das Root-Skript:
   ```powershell
   .\migrate.ps1 -Name "MeinFeatureName"
   ```
   (legt die Migration in `Fitness.DataAccess/MigrationsV2Postgres/` an,
   Kontext `FitnessDbContextV2Pg`). Die veraltete Anleitung
   `Documentation/ef-core.md` (V1) **nicht** verwenden.
4. Generierte Migration **lesen und prüfen** (keine ungewollten Drops/Renames),
   dann anwenden: `.\migrate.ps1`
5. Bei Bedarf `Documentation/database/database-v2.md` um die Schema-Entscheidung
   ergänzen.

### Schritt 3 — API

1. **DTOs** nach `Source/Fitness.API/Models/<Domain>/` — Klassen mit Suffix
   `Dto` (z. B. `XyzSummaryDto`, `CreateXyzDto`), Properties mit sinnvollen
   Defaults (`string.Empty`, `new()`).
2. **Service-Interface** in `Services/Interfaces/I<X>Service.cs`,
   **Implementierung** in `Services/<X>Service.cs`: nimmt `FitnessDbContextV2`
   direkt (kein Repository-Pattern), `async` durchgängig, mappt Entitäten →
   DTOs selbst.
3. **Fehler:** Domänenfehler als Exception werfen — die globale
   `ExceptionMiddleware` mappt: `KeyNotFoundException` → 404,
   `ArgumentException` → 400, `ConflictException`
   (`Fitness.API/Exceptions/`) → 409, `UnauthorizedAccessException` → 401.
   Fehlermeldungen **auf Deutsch** („… nicht gefunden."), denn sie erreichen
   den Endnutzer über den Toast. **Kein** try/catch in Controllern.
4. **DI** in `Program.cs` registrieren (`AddScoped`, wie die bestehenden
   Services).
5. **Controller** in `Controllers/`: `[Route("api/[controller]")]`,
   `[ApiController]`, `[Authorize]`, Konstruktor-Injektion von Service +
   `ILogger<T>`, pro Action `GetCurrentUserId()`-Guard (Muster aus
   `TrainingPlansController` kopieren), strukturiertes Logging
   (`_logger.LogInformation("User {UserId} …", userId)` — nie
   String-Interpolation), schlanke Actions ohne Geschäftslogik.

### Schritt 4 — Frontend

1. **Model** in `src/app/core/models/<feature>.model.ts` — Interfaces spiegeln
   die DTOs (camelCase, ohne `Dto`-Suffix).
2. **Service** in `src/app/core/services/<feature>.service.ts` — nutzt
   **immer** den zentralen `ApiService` (`this.api.get<T>('pfad')` — Pfad ohne
   führendes `api/`), niemals `HttpClient` direkt, niemals URLs hardcoden.
3. **Komponenten** unter `src/app/features/<feature>/pages/` (Routen-Ziele)
   bzw. `components/` (Bausteine); Wiederverwendbares nach
   `src/app/shared/components/`. Standalone, `inject()`, Signals für State
   (`loading`/`error`/Daten-Signals wie in `training-overview`),
   `ChangeDetectionStrategy.OnPush` für neue Komponenten, neue Template-Syntax
   (`@if`/`@for`). UI-Texte auf **Deutsch**.
4. **Design:** Bootstrap 5 + Custom-Tokens aus `src/styles.scss`; Regeln aus
   `Documentation/Application/STYLE_GUIDE.md` und
   `fitness-fullstack-feature/references/frontend.md` sind verbindlich
   (Mobile-first, 4-px-Raster, Tokens statt Magic Numbers, Loading/Empty/
   Error/Success-Zustände, Skeleton-Shimmer beim Laden, Toasts über
   `ToastService`).
5. **Routing** in `src/app/app.routes.ts`: lazy `loadComponent`, `authGuard`
   bzw. `guestGuard`, **deutsche Pfade** wie bestehende Routen
   (`/freunde`, `training/uebung-erstellen`). Navigation ggf. in
   `src/app/core/components/navigation/` ergänzen (Sidebar ≥ 768px,
   Bottom-Nav < 768px — beide Kontexte prüfen).

### Schritt 5 — Verpflichtende Verifikation (harte Abschlussbedingung)

**Ein Feature gilt erst als fertig, wenn ALLE folgenden Punkte erfüllt und im
Abschlussbericht belegt sind. Melde niemals „fertig", wenn auch nur einer
offen ist — kein Ausnahmefall, keine Abkürzung.**

1. **API-Build fehlerfrei:**
   ```powershell
   dotnet build Source/Fitness.API
   ```
   0 Fehler. **Niemals** `dotnet build Source/Fitness.slnx` verwenden — der
   Solution-Build schlägt wegen des V1-Projekts (NU1605) grundsätzlich fehl
   und sagt nichts über Deine Änderung aus.
2. **Frontend-Build fehlerfrei:**
   ```powershell
   cd Source/Frontend; npm run build
   ```
   0 Fehler. Bekannte SCSS-Budget-Warnungen (aktuell `training-overview` und
   `week-overview`) sind toleriert; **neue** Warnungen durch Deinen Code
   behebst Du.
3. **Tests:**
   ```powershell
   dotnet test Source/Fitness.API.Tests
   cd Source/Frontend; npx ng test --watch=false
   ```
   Alles, was Deine Änderung berührt, muss grün sein. Schreibe für neue
   Service-Logik mit Verzweigungen einen xUnit-Test (Muster:
   `Fitness.API.Tests/Services/`, xUnit + Moq + FluentAssertions +
   EF-InMemory). **Bekannter Altbestand (Stand Juli 2026):** die Test-Suites
   enthalten vorbestehende Brüche (z. B. veraltete `AuthServiceTests`,
   fehlender `APP_CONFIG`-Provider in `app.spec.ts`). Regel: Du darfst den
   Zustand **niemals verschlechtern**; Brüche, die Deine Änderung verursacht,
   behebst Du sofort; vorbestehende Brüche, die Deinen Pfad kreuzen,
   reparierst Du mit — andernfalls dokumentierst Du sie unverändert im
   Abschlussbericht.
4. **Überprüfung in der laufenden Applikation** (immer, wenn lokal eine
   Datenbank/Konfiguration verfügbar ist):
   - API starten: `dotnet run --project Source/Fitness.API` →
     `https://localhost:7001` (Swagger unter `/swagger` im Development-Modus;
     Connection String kommt aus den User Secrets).
   - Frontend starten: `cd Source/Frontend; npm start` → `http://localhost:4200`
     (API-Basis-URL steht in `public/assets/config/appconfig.development.json`).
   - Prüfe im Browser (nutze verfügbare Browser-/Preview-Tools) den **Golden
     Path** des Features und die relevanten **Edge Cases**: leerer Zustand,
     Fehlerfall (API liefert Fehler → deutscher Toast), mobiler Viewport
     (~375px, Bottom-Nav) **und** Desktop (Sidebar).
   - Ist ein Start nachweislich nicht möglich (keine DB, keine Secrets),
     dokumentiere das ausdrücklich als Lücke im Abschlussbericht — erkläre die
     Änderung dann nicht als „verifiziert", sondern als „gebaut und getestet,
     Laufzeitprüfung ausstehend".
5. **Abschlussbericht:** Liste die ausgeführten Befehle mit Ergebnis, die
   geprüften Szenarien und alle offenen Punkte ehrlich auf.

## Abgrenzung & Nachbarskills

- **Design-/Konventionsdetails:** Skill `fitness-fullstack-feature`
  (dieser Skill hier erweitert ihn um Datenbank-Schicht und verpflichtende
  Verifikation; die Design-Regeln dort bleiben maßgeblich).
- **Changelog:** Wenn der Nutzer das Feature veröffentlichen oder dokumentieren
  will → Skill `changelog-entry` (niemals selbst technische Changelog-Texte
  erfinden).
- **Grenzfall Bug:** Stellt sich heraus, dass die „Änderung" in Wahrheit ein
  Defekt in bestehendem Verhalten ist (etwas hat früher funktioniert oder
  weicht vom dokumentierten Verhalten ab), wechsle zum Skill
  **`fitness-bugfix`** — dort gilt Root-Cause-Pflicht statt Feature-Workflow.
