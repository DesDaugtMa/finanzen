using Backend.Domain.Exceptions;
using Microsoft.AspNetCore.Diagnostics;

namespace Backend.Api.ExceptionHandlers;

public sealed class DomainExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext ctx, Exception ex, CancellationToken ct)
    {
        if (ex is not DomainException domainEx)
            return false;

        var (status, title) = domainEx switch
        {
            NotFoundException => (StatusCodes.Status404NotFound, "Nicht gefunden"),
            BusinessRuleException => (StatusCodes.Status422UnprocessableEntity, "Geschäftsregel verletzt"),
            CurrencyMismatchException => (StatusCodes.Status422UnprocessableEntity, "Währungskonflikt"),
            _ => (StatusCodes.Status422UnprocessableEntity, "Domänenfehler"),
        };

        ctx.Response.StatusCode = status;

        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = ctx,
            Exception = domainEx,
            ProblemDetails =
            {
                Status = status,
                Title = title,
                Detail = domainEx.Message,
            },
        });
    }
}
