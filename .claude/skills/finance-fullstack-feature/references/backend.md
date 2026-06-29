# Backend-Referenz — .NET 10 Web API, Clean Architecture

Diese Referenz gilt für `./Source/Backend/` (Solution `Backend.slnx`, Projekt
`Backend/`, **net10.0**, `Nullable` + `ImplicitUsings` aktiviert, ASP.NET-Core
Controller). Sieh Dir immer zuerst `Program.cs` und einen bestehenden Controller
an und übernimm den etablierten Stil.

> **Hinweis zum Ist-Zustand:** Das Projekt ist evtl. noch nah am Web-API-Template
> (z. B. `WeatherForecastController`). Wo noch keine Layer existieren, etabliere
> die unten beschriebene Struktur sauber; schreibe keine Geschäftslogik als
> Wegwerf-Code in den Controller.

## 1. Layer & Abhängigkeitsrichtung

Abhängigkeiten zeigen **nach innen**: API → Application → Domain. Infrastructure
implementiert Interfaces, die weiter innen definiert sind.

```
Domain          Entities, Value Objects (Money!), Domain-Exceptions, Interfaces
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
- Programmiere gegen Interfaces (z. B. `IKontoRepository`,
  `ITransactionService`), registriert im Composition Root (`Program.cs`).

## 2. Geld korrekt behandeln — kritisch

- Geld ist **immer `decimal`**, niemals `double`/`float`. Floats verursachen
  Rundungsfehler und sind in einer Finanz-App ein Bug.
- Bevorzugt ein `Money`-Value-Object (Betrag + Währung) in der Domain, das
  Vergleiche/Arithmetik kapselt und Währungs-Mismatches verhindert.
- Runde bewusst und einheitlich (`MidpointRounding.ToEven` oder fachlich
  vorgegeben), und nur an definierten Stellen.
- Persistenz: passende Präzision/Scale konfigurieren (z. B. EF Core
  `HasPrecision(18, 2)` bzw. `decimal(18,2)`), damit die DB nicht still rundet.
- Aggregationen (Summe je Kategorie, Budget-Rest, Kontosaldo) müssen
  deterministisch und exakt sein. In DTOs Beträge als `decimal` führen; bei der
  JSON-Serialisierung darauf achten, dass keine Float-Repräsentation entsteht
  (ggf. als String oder mit definierter Präzision serialisieren — konsistent mit
  dem, was das Frontend erwartet).

```csharp
public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Euro(decimal amount) => new(amount, "EUR");

    public Money Add(Money other)
    {
        EnsureSameCurrency(other);
        return this with { Amount = Amount + other.Amount };
    }

    private void EnsureSameCurrency(Money other)
    {
        if (Currency != other.Currency)
            throw new CurrencyMismatchException(Currency, other.Currency);
    }
}
```

## 3. Controller — schlank halten

```csharp
[ApiController]
[Route("api/[controller]")]
public sealed class TransactionsController(ITransactionService transactions) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TransactionDto>>> GetAll(
        [FromQuery] Guid accountId, CancellationToken ct)
        => Ok(await transactions.GetForAccountAsync(accountId, ct));

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create(
        CreateTransactionRequest request, CancellationToken ct)
    {
        var created = await transactions.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<TransactionDto>> GetById(Guid id, CancellationToken ct)
        => Ok(await transactions.GetByIdAsync(id, ct));
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
- Validierung fachlicher Regeln hier oder in der Domain (z. B. „Transaktion
  braucht existierendes Konto", „Budget-Periode gültig"). Format-/Pflichtfeld-
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
            CurrencyMismatchException=> (StatusCodes.Status422UnprocessableEntity, "Währungskonflikt"),
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
public sealed class CurrencyMismatchException(string a, string b)
    : DomainException($"Währungskonflikt: {a} vs. {b}.");
// z. B. KontoNotFoundException, BudgetUeberschrittenException als Spezialisierungen
```

> **Detail nicht leaken:** Bei `500` keine internen Details/Stacktraces in
> `Detail` an den Client geben — generische Meldung, Details nur ins Log.

## 6. Logging — strukturiert, datenschutzkonform

- `ILogger<T>` per DI, **strukturiertes** Logging mit benannten Platzhaltern
  (nicht String-Interpolation):

```csharp
logger.LogInformation("Transaktion {TransactionId} für Konto {AccountId} erstellt",
    created.Id, request.AccountId);
```

- **Niemals sensible Finanzdaten im Klartext loggen:** vollständige
  Konto-/IBAN-Nummern, personenbezogene Daten. IDs sind ok; Beträge nur, wenn
  fachlich nötig und unkritisch. Im Zweifel maskieren/weglassen.
- Log-Level sinnvoll: `Information` für fachliche Ereignisse, `Warning` für
  erwartbare Fehlersituationen (z. B. Budget überschritten), `Error` für
  unerwartete Exceptions.
- Falls Serilog bereits konfiguriert ist, dessen Konventionen übernehmen;
  ansonsten der Default-`ILogger<T>`.

## 7. DTOs & API-Vertrag

- Request-/Response-DTOs sind getrennt von Domain-Entities und stabil — das
  Frontend spiegelt sie in TypeScript-Interfaces. Änderungen am Vertrag bewusst
  und konsistent.
- Beträge als `decimal` mit definierter Präzision; Datumsangaben als ISO-8601;
  IDs als `Guid` (oder was das Repo nutzt).
- Eingaben validieren (DataAnnotations am Request oder Validator im Application-
  Layer); ungültige Eingaben → `400/422` mit `(Validation)ProblemDetails`.

## Backend-Checkliste

- [ ] Layer respektiert; Abhängigkeiten zeigen nach innen; keine Logik im
      Controller.
- [ ] Geld ist `decimal` (idealerweise `Money`-Value-Object); Persistenz-Präzision
      gesetzt; Aggregationen exakt.
- [ ] Controller schlank; DTOs rein/raus; korrekte Statuscodes; `CancellationToken`
      durchgereicht.
- [ ] Fachfehler über Domain-Exceptions → globale `ProblemDetails`-Pipeline; keine
      internen Details an den Client bei 500.
- [ ] Strukturiertes `ILogger<T>`-Logging; keine sensiblen Finanzdaten im Log.
- [ ] Eingaben validiert; API-Vertrag stabil und mit dem Frontend synchron.
