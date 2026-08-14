using Backend.Exceptions;
using System.Text.Json;

namespace Backend.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IWebHostEnvironment env)
{
    private const string ProblemContentType = "application/problem+json";

    /// <summary>Basis der <c>type</c>-URIs — die von RFC 7807 empfohlenen HTTP-Statusdefinitionen.</summary>
    private const string StatusTypeBase = "https://datatracker.ietf.org/doc/html/rfc9110#section-15";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            LogException(context, ex);
            await HandleExceptionAsync(context, ex);
        }
    }

    /// <summary>
    /// Erwartete Regelverstöße sind kein Betriebsfehler: sie werden als Warnung geloggt,
    /// damit im Fehlerkanal nur das steht, was wirklich jemand ansehen muss.
    /// </summary>
    private void LogException(HttpContext context, Exception ex)
    {
        var path = context.Request.Path.Value;

        if (ex is DomainException)
            logger.LogWarning("Regelverstoß auf {Path}: {Reason}", path, ex.Message);
        else
            logger.LogError(ex, "Unerwarteter Fehler auf {Path}.", path);
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        var (statusCode, title, message) = Translate(ex);

        context.Response.ContentType = ProblemContentType;
        context.Response.StatusCode = statusCode;

        var response = new ErrorResponse(
            Type: $"{StatusTypeBase}",
            Title: title,
            Status: statusCode,
            Detail: message,
            Message: message,
            TraceId: context.TraceIdentifier,
            // Der Stack Trace verlässt den Server nur in der Entwicklung — im Betrieb wäre
            // er eine Innenansicht der Anwendung, die niemanden außerhalb etwas angeht.
            Exception: env.IsDevelopment() ? ex.StackTrace : null
        );

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, SerializerOptions));
    }

    private static (int StatusCode, string Title, string Message) Translate(Exception ex) => ex switch
    {
        UnauthorizedException => (StatusCodes.Status401Unauthorized, "Nicht angemeldet", ex.Message),
        NotFoundException => (StatusCodes.Status404NotFound, "Nicht gefunden", ex.Message),
        BusinessRuleException => (StatusCodes.Status422UnprocessableEntity, "Regel verletzt", ex.Message),
        CurrencyMismatchException => (StatusCodes.Status422UnprocessableEntity, "Währungen passen nicht zusammen", ex.Message),
        _ => (StatusCodes.Status500InternalServerError, "Interner Fehler", "Ein interner Fehler ist aufgetreten.")
    };
}

/// <summary>
/// Einheitliche Fehlerantwort im Format von RFC 7807 (<c>type</c>, <c>title</c>,
/// <c>status</c>, <c>detail</c>). <c>message</c> trägt denselben Text wie <c>detail</c>
/// und bleibt erhalten, weil das Frontend die Meldung dort liest.
/// </summary>
public record ErrorResponse(
    string Type,
    string Title,
    int Status,
    string Detail,
    string Message,
    string TraceId,
    string? Exception);
