using Backend.Exceptions;
using System.Text.Json;

namespace Backend.Middleware;

public class ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> logger, IWebHostEnvironment env)
{
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await next(context);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, ex.Message);
            await HandleExceptionAsync(context, ex);
        }
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception ex)
    {
        context.Response.ContentType = "application/json";

        var (statusCode, message) = ex switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, ex.Message),
            BusinessRuleException => (StatusCodes.Status422UnprocessableEntity, ex.Message),
            CurrencyMismatchException => (StatusCodes.Status422UnprocessableEntity, ex.Message),
            _ => (StatusCodes.Status500InternalServerError, "Ein interner Fehler ist aufgetreten.")
        };

        context.Response.StatusCode = statusCode;

        var response = new ErrorResponse(
            Message: message,
            Detail: env.IsDevelopment() ? ex.StackTrace : null,
            TraceId: context.TraceIdentifier
        );

        await context.Response.WriteAsync(JsonSerializer.Serialize(response, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        }));
    }
}

public record ErrorResponse(string Message, string? Detail, string TraceId);
