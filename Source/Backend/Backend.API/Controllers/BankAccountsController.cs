using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Backend.ValueObjects;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Girokonten des angemeldeten Nutzers.</summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class BankAccountsController(
    IBankAccountService bankAccountService,
    IMonthSummaryService monthSummaryService,
    ICurrentUser currentUser) : ControllerBase
{
    /// <summary>Kennzahlen des Kontos für einen Abrechnungsmonat.</summary>
    /// <param name="month">Monat im Format <c>yyyy-MM</c>, z. B. <c>2026-07</c>.</param>
    [HttpGet("{id:int}/summary")]
    public async Task<ActionResult<MonthSummaryDto>> GetSummary(int id, [FromQuery] string month, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        return Ok(await monthSummaryService.GetAsync(userId.Value, id, AccountingMonth.Parse(month), ct));
    }

    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<BankAccountDto>>> GetMine(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        return Ok(await bankAccountService.ListMineAsync(userId.Value, ct));
    }

    [HttpGet("{id:int}")]
    public async Task<ActionResult<BankAccountDto>> GetById(int id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        return Ok(await bankAccountService.GetMineAsync(userId.Value, id, ct));
    }

    [HttpPost]
    public async Task<ActionResult<BankAccountDto>> Create([FromBody] CreateBankAccountRequest request, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        var created = await bankAccountService.CreateAsync(userId.Value, request, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id:int}")]
    public async Task<ActionResult<BankAccountDto>> Update(int id, [FromBody] UpdateBankAccountRequest request, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        return Ok(await bankAccountService.UpdateAsync(userId.Value, id, request, ct));
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id, CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        await bankAccountService.DeleteAsync(userId.Value, id, ct);
        return NoContent();
    }
}
