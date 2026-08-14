using Backend.Middleware;
using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Die konten-übergreifende Bilanz des angemeldeten Nutzers.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class BalanceController(
    IBalanceService balanceService,
    ICurrentUser currentUser) : FinanceControllerBase(currentUser)
{
    /// <summary>Bilanz eines Monats über alle Konten, aufgeschlüsselt nach Kontokategorie.</summary>
    /// <param name="month">Monat im Format <c>yyyy-MM</c>, z. B. <c>2026-07</c>.</param>
    [HttpGet("month")]
    [ProducesResponseType<OverallMonthBalanceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<OverallMonthBalanceDto>> GetMonth([FromQuery] string month, CancellationToken ct)
        => Ok(await balanceService.GetMonthAsync(UserId, ParseMonth(month), ct));

    /// <summary>Bilanz eines Jahres über alle Konten samt Verlauf der zwölf Monate.</summary>
    /// <param name="year">Vierstellige Jahreszahl, z. B. <c>2026</c>.</param>
    [HttpGet("year")]
    [ProducesResponseType<YearBalanceDto>(StatusCodes.Status200OK)]
    [ProducesResponseType<ErrorResponse>(StatusCodes.Status422UnprocessableEntity)]
    public async Task<ActionResult<YearBalanceDto>> GetYear([FromQuery] int year, CancellationToken ct)
        => Ok(await balanceService.GetYearAsync(UserId, year, ct));
}
