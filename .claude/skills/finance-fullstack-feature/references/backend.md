# Backend-Referenz — .NET 10 Web API, Clean Architecture

Diese Referenz gilt für `./Source/Backend/` (Solution `Backend.slnx`, Projekte
`Backend.API/` und `Backend.DataAccess/`, **net10.0**, `Nullable` +
`ImplicitUsings` aktiviert, ASP.NET-Core Controller). Sieh Dir immer zuerst
`Program.cs` und einen bestehenden Controller an und übernimm den etablierten Stil.

> **Hinweis zum Ist-Zustand:** Das Projekt enthält derzeit nur die Basis
> (Benutzerverwaltung, Logging, Settings, Datenbankzugriff). Wo für neue
> Fachbereiche noch keine Layer existieren, etabliere die unten beschriebene
> Struktur sauber; schreibe keine Geschäftslogik als Wegwerf-Code in den Controller.

## 1. Layer & Abhängigkeitsrichtung

Abhängigkeiten zeigen **nach innen**: API → Application → Domain. Infrastructure
implementiert Interfaces, die weiter innen definiert sind.

```
Domain          Entities, Value Objects, Domain-Exceptions, Interfaces
   ▲
Application     Use Cases / Application-Services, DTOs, Validierung, Orchestrierung
   ▲
Infrastructure  EF Core / Persistenz, externe Dienste — implementiert Domain-Interfaces
   ▲
API (Backend)   Controller (schlank), DI/Composition Root, Middleware, Mapping
```

Wenn das Repo (noch) ein einzelnes Projekt ist, spiegle die Layer mindestens über
Ordner/Namespaces (`Domain/`, `Application/`, `Infrastructure/`, `Api/` bzw.
`Controllers/`) und ziehe später bei Bedarf eigene Projekte heraus. Bestehende
Struktur immer respektieren.

**Regeln:**
- Keine Geschäftslogik in Controllern. Controller: Request annehmen → Use Case
  aufrufen → Ergebnis/Status zurückgeben.
- Domain hat keine Abhängigkeiten nach außen (kein EF, kein ASP.NET).
- Programmiere gegen Interfaces (z. B. `IItemService`), registriert im
  Composition Root (`Program.cs`).

## 2. Datentypen & Präzision

- Exakte Werte (Beträge, Mengen mit Nachkommastellen) sind **immer `decimal`**,
  niemals `double`/`float` — Floats verursachen Rundungsfehler.
- Fachlich zusammengehörige Werte bevorzugt als Value Object in der Domain
  kapseln, das Vergleiche/Arithmetik und Invarianten schützt.
- Runde bewusst und einheitlich, und nur an definierten Stellen.
- Persistenz: passende Präzision/Scale konfigurieren (z. B. EF Core
  `HasPrecision(18, 2)`), damit die DB nicht still rundet.
- Aggregationen müssen deterministisch und exakt sein.

## 3. Controller — schlank halten

```csharp
[ApiController]
[Route("api/[controller]")]
public sealed class ItemsController(IItemService items) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<ItemDto>>> GetAll(CancellationToken ct)
        => Ok(await items.GetAllAsync(ct));

    [HttpPost]
    public async Task<ActionResult<ItemDto>> Create(
        CreateItemRequest request, CancellationToken ct)
    {
        var created = await items.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<ItemDto>> GetById(int id, CancellationToken ct)
        => Ok(await items.GetByIdAsync(id, ct));
}
```

- `[ApiController]` aktiviert automatische Model-Validation → 400 als
  `ValidationProblemDetails`.
- Immer `CancellationToken` durchreichen.
- DTOs rein/raus — niemals Domain-Entities direkt serialisieren.
- Passende Statuscodes (`200`, `201` + Location, `204`, `404`, `409`, `422`).

## 4. Application-Services / Use Cases

- Ein Service kapselt einen fachlichen Anwendungsfall, kleine Methoden mit einer
  Verantwortung. Geteilte Logik auslagern, nicht kopieren.
- Default ist **Application-Services** (kein MediatR/CQRS), außer das Repo nutzt
  bereits ein anderes Muster.
- Validierung fachlicher Regeln hier oder in der Domain (z. B. „Eintrag braucht
  einen existierenden Besitzer", „Zeitraum gültig"). Format-/Pflichtfeld-
  Validierung kann via DataAnnotations/Validator am DTO erfolgen.
- Mapping Domain ↔ DTO explizit (manuell oder etabliertes Mapping-Tool des Repos).

## 5. Fehlerbehandlung — globale ProblemDetails-Pipeline

Nutze die modernen .NET-Idiome: `IExceptionHandler` + `AddProblemDetails()`.
Fachliche Fehler werfen aussagekräftige **Domain-Exceptions**; ein zentraler
Handler mappt sie auf RFC-7807-`ProblemDetails`. Controller fangen keine
Exceptions ab, um Statuscodes zu setzen.

```csharp
// Program.cs
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<DomainExceptionHandler>();
// ...
app.UseExceptionHandler();
```

```csharp
public sealed class DomainExceptionHandler(IProblemDetailsService problemDetails)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        var (status, title) = ex switch
        {
            NotFoundException        => (StatusCodes.Status404NotFound, "Nicht gefunden"),
            BusinessRuleException    => (StatusCodes.Status422UnprocessableEntity, "Regel verletzt"),
            _                        => (StatusCodes.Status500InternalServerError, "Interner Fehler"),
        };

        ctx.Response.StatusCode = status;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            Exception = ex,
            ProblemDetails = { Status = status, Title = title, Detail = ex.Message },
        });
    }
}
```

Domain-Exception-Basis (Beispiele für diese App):

```csharp
public abstract class DomainException(string message) : Exception(message);
public sealed class NotFoundException(string what) : DomainException($"{what} nicht gefunden.");
public sealed class BusinessRuleException(string message) : DomainException(message);
```

> **Detail nicht leaken:** Bei `500` keine internen Details/Stacktraces in
> `Detail` an den Client geben — generische Meldung, Details nur ins Log.

## 6. Logging — strukturiert, datenschutzkonform

- `ILogger<T>` per DI, **strukturiertes** Logging mit benannten Platzhaltern
  (nicht String-Interpolation):

```csharp
logger.LogInformation("Eintrag {ItemId} für Benutzer {UserId} erstellt",
    created.Id, userId);
```

- **Niemals sensible Daten im Klartext loggen:** Passwörter, Tokens,
  personenbezogene Daten. IDs sind ok. Im Zweifel maskieren/weglassen.
- Log-Level sinnvoll: `Information` für fachliche Ereignisse, `Warning` für
  erwartbare Fehlersituationen (z. B. Regel verletzt), `Error` für
  unerwartete Exceptions.
- Falls Serilog bereits konfiguriert ist, dessen Konventionen übernehmen;
  ansonsten der Default-`ILogger<T>`.

## 7. DTOs & API-Vertrag

- Request-/Response-DTOs sind getrennt von Domain-Entities und stabil — das
  Frontend spiegelt sie in TypeScript-Interfaces. Änderungen am Vertrag bewusst
  und konsistent.
- Exakte Werte als `decimal` mit definierter Präzision; Datumsangaben als
  ISO-8601; IDs wie im Repo üblich (derzeit `int`).
- Eingaben validieren (DataAnnotations am Request oder Validator im Application-
  Layer); ungültige Eingaben → `400/422` mit `(Validation)ProblemDetails`.

## Backend-Checkliste

- [ ] Layer respektiert; Abhängigkeiten zeigen nach innen; keine Logik im
      Controller.
- [ ] Exakte Werte sind `decimal`; Persistenz-Präzision gesetzt; Aggregationen
      exakt.
- [ ] Controller schlank; DTOs rein/raus; korrekte Statuscodes; `CancellationToken`
      durchgereicht.
- [ ] Fachfehler über Domain-Exceptions → globale `ProblemDetails`-Pipeline; keine
      internen Details an den Client bei 500.
- [ ] Strukturiertes `ILogger<T>`-Logging; keine sensiblen Daten im Log.
- [ ] Eingaben validiert; API-Vertrag stabil und mit dem Frontend synchron.
