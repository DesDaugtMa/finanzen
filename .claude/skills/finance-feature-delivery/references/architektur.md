# Architektur-Karte V2 (verifizierter Code-Stand: Juli 2026)

Diese Karte beschreibt den **tatsächlichen** Aufbau — sie wurde gegen den Code
verifiziert. Bei Widersprüchen zu `./autodocs/` (Stand März 2026, teils noch
V1) oder älteren Doku-Dateien gilt immer der Code.

## Projekt-Landkarte

| Pfad | Rolle | Status |
|---|---|---|
| `Source/Fitness.API/` | .NET-10-Web-API (aktives Backend) | **aktiv** |
| `Source/Fitness.DataAccess/` | EF-Core-Modelle + Kontexte + Migrationen | **aktiv** (nur V2-Teile) |
| `Source/Frontend/` | Angular-21-SPA (PWA, Service Worker) | **aktiv** |
| `Source/Fitness.API.Tests/` | xUnit-Tests für die API | aktiv, teils veraltet |
| `Source/Fitness/` | V1-MVC-App | **veraltet — nicht anfassen** |
| `Source/Fitness.Migration/` | Einmaliges Daten-Tool MSSQL→PostgreSQL | nicht anfassen |
| `Source/Fitness.DataAccess.PgMigrations/` | Leere Hülle (nur bin/obj) | tot — ignorieren |
| `Source/Fitness.ServerSetup/`, `Fitness.DatabaseBackup/` | Server-Tooling | nur bei Bedarf |

**Innerhalb von `Fitness.DataAccess`:** aktiv sind `ModelsV2/`,
`FitnessDbContextV2.cs` (Modell + Fluent-Konfiguration),
`FitnessDbContextV2Pg.cs` (dünne Npgsql-Ableitung, bleibt leer) und
`MigrationsV2Postgres/` (einzige aktive Migrationskette, seit InitialCreate
2026-06-27). `Models/`, `FitnessDbContext.cs`, `Migrations/`, `MigrationsV2/`
sind V1-/SQL-Server-Altlasten.

## Backend-Muster (`Source/Fitness.API/`)

Ein **einzelnes Projekt**, pragmatisch geschichtet — kein Mehrprojekt-Clean-
Architecture, kein MediatR, kein Repository-Pattern, kein AutoMapper:

```
Controllers/<Domain>Controller.cs   → schlank, [Authorize], orchestriert nur
Services/Interfaces/I<X>Service.cs  → Vertrag
Services/<X>Service.cs              → Geschäftslogik, nutzt FitnessDbContextV2 direkt
Models/<Domain>/<Name>Dto.cs        → Request-/Response-DTOs (Klassen, Suffix "Dto")
Exceptions/                         → eigene Exceptions (aktuell: ConflictException)
Middleware/ExceptionMiddleware.cs   → globale Fehler-Pipeline
Config/AppSettings.cs + appsettings*.json → Konfiguration (Sektion "AppSettings")
```

- **DI:** alle Services in `Program.cs` per `AddScoped` registriert.
- **Auth:** JWT-Bearer; `[Authorize]` auf Controller-Ebene; User-Id pro Action
  über privates `GetCurrentUserId()` (parst `ClaimTypes.NameIdentifier` als
  `int?`, bei `null` → `Unauthorized()` + `LogWarning`). Refresh-Tokens über
  `UserSession`-Entität; Passwort-Hashing kompatibel zur V1-App
  (`IPasswordHasher<User>` — nicht ändern).
- **Fehler-Pipeline (wichtig, weicht von „ProblemDetails"-Doku ab):**
  `ExceptionMiddleware` fängt alles, loggt `LogError` und antwortet mit
  JSON-`ErrorResponse` `{ message, detail, traceId }` (camelCase). Mapping:
  `UnauthorizedAccessException`→401, `ConflictException`→409,
  `ArgumentException`→400, `KeyNotFoundException`→404, sonst 500.
  `detail` enthält nur im Development den Stacktrace. Exception-Messages sind
  **deutsch und endnutzertauglich**, denn `message` landet im Frontend-Toast
  (z. B. `throw new KeyNotFoundException("Trainingsplan nicht gefunden.")`).
  Für „nicht gefunden" existieren beide Stile: Exception im Service **oder**
  `null`-Rückgabe + `NotFound()` im Controller — folge dem Stil des jeweiligen
  Domänen-Services.
- **Logging:** `ILogger<T>`, strukturierte Templates
  (`"User {UserId} requested …"`, `userId`). Optionales Request-Logging über
  `AppSettings.EnableRequestLogging`.
- **CORS:** `DefaultPolicy` erlaubt `http(s)://localhost:4200` und
  `https://fitness.alexander-friedrich.at`.
- **Ports (Development):** `https://localhost:7001` + `http://localhost:5237`,
  Swagger unter `/swagger` (nur Development).
- **Changelog-Datei:** `Source/Fitness.API/CHANGELOG.md` (wird vom Frontend
  ausgelesen; Einträge nur über den Skill `changelog-entry`).

## Datenbank (PostgreSQL, V2)

- Entitäten: `Source/Fitness.DataAccess/ModelsV2/` — u. a. `User`,
  `UserProfile` (1:1), `TrainingPlan` → `TrainingDay` → `PlanEntry` (TPH für
  Kraft/Cardio via nullable Felder + `Exercise.ExerciseType`-Enum),
  `WorkoutSession` → `WorkoutLog`, `Friendship`, `UserBlock`,
  `SocialNotification`, `WeeklyScheduleOverride`, `PushSubscription`,
  `UserSession`, `Image`, `Feedback`. Tabellennamen PascalCase-Plural,
  `int`-PK `Id`, Soft-Delete über `IsDeleted`, wo vorhanden.
- Schema-Entscheidungen und Begründungen: `Documentation/database/database-v2.md`.
- **Migrationen ausschließlich über das Root-Skript** (Kontext
  `FitnessDbContextV2Pg`, Output `MigrationsV2Postgres/`):
  ```powershell
  .\migrate.ps1 -Name "MeinFeature"   # neue Migration erzeugen
  .\migrate.ps1                        # Datenbank aktualisieren
  ```
  Connection String kommt aus den User Secrets von `Fitness.API`.
  `Documentation/ef-core.md` beschreibt den V1-Weg — **nicht verwenden**.
- Testdaten-Skripte im Root: `GenerateTestData.sql`, `GeneratePOTestData.sql`.

## Frontend-Muster (`Source/Frontend/`, Angular 21)

```
src/app/core/services/     → ApiService (zentraler HTTP-Wrapper) + Domänen-Services
src/app/core/interceptors/ → authInterceptor (Bearer), errorInterceptor (401→Refresh→Retry, sonst /login)
src/app/core/guards/       → authGuard, guestGuard
src/app/core/models/       → Interfaces je Domäne (camelCase, ohne "Dto")
src/app/core/tokens/       → APP_CONFIG (Laufzeit-Konfiguration)
src/app/core/components/navigation/ → Sidebar (≥768px) + Bottom-Nav (<768px)
src/app/features/<feature>/pages|components/ → Feature-Screens
src/app/shared/components/ → wiederverwendbare Bausteine (avatar, image-upload, toast-container, …)
src/styles.scss            → Design-Tokens (Single Source of Truth, Style Guide §1.7)
```

- **HTTP nur über `ApiService`** (`core/services/api.service.ts`): hängt
  `<baseUrl>/api/` voran, zentrales `handleError` übersetzt Fehler in deutsche
  Meldungen (liest `error.error.message` — deshalb müssen Backend-Messages
  deutsch sein). Basis-URL kommt zur Laufzeit aus
  `public/assets/config/appconfig.json` bzw. `appconfig.development.json`
  (kein Angular-`environment`-Mechanismus!).
- **State:** Signals (`signal`, `computed`), `inject()` statt Konstruktor,
  Standalone-Komponenten, neue Template-Syntax. Ladezustände als eigene
  Signals (`plansLoading`, `plansError`, …) + Skeleton-Shimmer; Feedback über
  `ToastService` (success/info/warning/error, deutsche Texte).
- **Design:** Bootstrap 5.3 (`@use "bootstrap/scss/bootstrap"`),
  bootstrap-icons, Custom-Tokens/Utilities in `styles.scss`
  (`.dashboard-card`, `.btn-fitness-primary`, Schatten-/Radius-/Z-Index-/
  Animations-Tokens). Normativ: `Documentation/Application/STYLE_GUIDE.md`
  (4-px-Raster, Token-Pflicht, Schattenstufen, 150–400ms-Übergänge, WCAG AA).
- **PWA:** Service Worker (`ngsw-config.json`), nur im Prod-Build aktiv.
- Kein ESLint konfiguriert; Prettier ist vorhanden. Charts über
  `chart.js`/`ng2-charts`; Drag & Drop über `@angular/cdk`.

## Build-, Test- und Startbefehle (verifiziert)

| Zweck | Befehl | Anmerkung |
|---|---|---|
| API bauen | `dotnet build Source/Fitness.API` | baut DataAccess mit |
| API-Tests | `dotnet test Source/Fitness.API.Tests` | xUnit/Moq/FluentAssertions/EF-InMemory |
| Frontend bauen | `cd Source/Frontend; npm run build` | 2 bekannte SCSS-Budget-Warnungen |
| Frontend-Tests | `cd Source/Frontend; npx ng test --watch=false` | Vitest + jsdom |
| API starten | `dotnet run --project Source/Fitness.API` | https://localhost:7001, Swagger |
| Frontend starten | `cd Source/Frontend; npm start` | http://localhost:4200 |

**Fallstricke:**

- `dotnet build Source/Fitness.slnx` schlägt **immer** fehl (NU1605 im
  V1-Projekt `Fitness.csproj`) — nie als Verifikationsgrundlage verwenden.
- Test-Altbestand (Stand Juli 2026): `Fitness.API.Tests` kompiliert nicht
  (`AuthServiceTests` fehlt der `IHttpContextAccessor`-Parameter), und
  `src/app/app.spec.ts` schlägt fehl (fehlender `APP_CONFIG`-Provider im
  TestBed). Nichts davon verschlechtern; im Abschlussbericht ausweisen.
- `CLAUDE.md` ist leer, `GEMINI.md` ist leer — keine versteckten Anweisungen.
- UI-Sprache, Routen-Pfade, Toast- und Fehlertexte sind durchgehend
  **deutsch**; Code-Bezeichner englisch.
