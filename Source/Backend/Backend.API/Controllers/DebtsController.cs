using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>
/// Schuldeinträge des angemeldeten Nutzers — Geld, das er anderen geliehen hat. Anders als
/// die übrigen Finanz-Ressourcen hängen sie am Nutzer statt an einem Konto: Verleih und
/// Rückzahlung laufen häufig über verschiedene Geldkonten.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public sealed class DebtsController(
    IDebtService debtService,
    ICurrentUser currentUser) : FinanceControllerBase(currentUser)
{
    /// <summary>Alle Einträge, gruppiert nach Person, samt Summen.</summary>
    [HttpGet]
    public async Task<ActionResult<DebtOverviewDto>> GetOverview(CancellationToken ct)
        => Ok(await debtService.GetOverviewAsync(UserId, ct));

    [HttpGet("{debtId:int}")]
    public async Task<ActionResult<DebtDto>> GetById(int debtId, CancellationToken ct)
        => Ok(await debtService.GetAsync(UserId, debtId, ct));

    [HttpPost]
    public async Task<ActionResult<DebtDto>> Create([FromBody] SaveDebtRequest request, CancellationToken ct)
    {
        var created = await debtService.CreateAsync(UserId, request, ct);
        return CreatedAtAction(nameof(GetById), new { debtId = created.Id }, created);
    }

    [HttpPut("{debtId:int}")]
    public async Task<ActionResult<DebtDto>> Update(
        int debtId, [FromBody] SaveDebtRequest request, CancellationToken ct)
        => Ok(await debtService.UpdateAsync(UserId, debtId, request, ct));

    /// <summary>Löscht den Eintrag; zugeordnete Buchungen bleiben erhalten.</summary>
    [HttpDelete("{debtId:int}")]
    public async Task<IActionResult> Delete(int debtId, CancellationToken ct)
    {
        await debtService.DeleteAsync(UserId, debtId, ct);
        return NoContent();
    }

    /// <summary>Buchungen aller Geldkonten, die sich dem Eintrag zuordnen lassen.</summary>
    /// <param name="accountId">Optionaler Filter auf ein Geldkonto.</param>
    [HttpGet("{debtId:int}/assignable-transactions")]
    public async Task<ActionResult<IReadOnlyList<DebtTransactionDto>>> GetAssignableTransactions(
        int debtId, [FromQuery] string? search, [FromQuery] int? accountId, CancellationToken ct)
        => Ok(await debtService.GetAssignableTransactionsAsync(UserId, debtId, search, accountId, ct));

    [HttpPut("{debtId:int}/transactions/{transactionId:int}")]
    public async Task<ActionResult<DebtOverviewDto>> LinkTransaction(
        int debtId, int transactionId, CancellationToken ct)
        => Ok(await debtService.LinkTransactionAsync(UserId, debtId, transactionId, ct));

    [HttpDelete("{debtId:int}/transactions/{transactionId:int}")]
    public async Task<ActionResult<DebtOverviewDto>> UnlinkTransaction(
        int debtId, int transactionId, CancellationToken ct)
        => Ok(await debtService.UnlinkTransactionAsync(UserId, debtId, transactionId, ct));
}
