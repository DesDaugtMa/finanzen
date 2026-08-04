using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>
/// Geplante Fixkosten eines Kontos. Jede Position gehört zu genau einem Abrechnungsmonat;
/// tatsächliche Buchungen werden ihr über die Unterressource <c>transactions</c> zugeordnet.
/// </summary>
[ApiController]
[Route("api/bankaccounts/{accountId:int}/fixedcosts")]
[Authorize]
public sealed class FixedCostsController(
    IFixedCostService fixedCostService,
    ICurrentUser currentUser) : FinanceControllerBase(currentUser)
{
    /// <param name="month">Monat im Format <c>yyyy-MM</c>, z. B. <c>2026-07</c>.</param>
    [HttpGet]
    public async Task<ActionResult<FixedCostMonthDto>> GetMonth(
        int accountId, [FromQuery] string month, CancellationToken ct)
        => Ok(await fixedCostService.GetMonthAsync(UserId, accountId, ParseMonth(month), ct));

    [HttpGet("{fixedCostId:int}")]
    public async Task<ActionResult<FixedCostDto>> GetById(int accountId, int fixedCostId, CancellationToken ct)
        => Ok(await fixedCostService.GetAsync(UserId, accountId, fixedCostId, ct));

    [HttpPost]
    public async Task<ActionResult<FixedCostDto>> Create(
        int accountId, [FromQuery] string month, [FromBody] SaveFixedCostRequest request, CancellationToken ct)
    {
        var created = await fixedCostService.CreateAsync(UserId, accountId, ParseMonth(month), request, ct);
        return CreatedAtAction(nameof(GetById), new { accountId, fixedCostId = created.Id }, created);
    }

    [HttpPut("{fixedCostId:int}")]
    public async Task<ActionResult<FixedCostDto>> Update(
        int accountId, int fixedCostId, [FromBody] SaveFixedCostRequest request, CancellationToken ct)
        => Ok(await fixedCostService.UpdateAsync(UserId, accountId, fixedCostId, request, ct));

    /// <summary>Löscht die Position; zugeordnete Buchungen bleiben erhalten und werden wieder variabel.</summary>
    [HttpDelete("{fixedCostId:int}")]
    public async Task<IActionResult> Delete(int accountId, int fixedCostId, CancellationToken ct)
    {
        await fixedCostService.DeleteAsync(UserId, accountId, fixedCostId, ct);
        return NoContent();
    }

    /// <summary>Zeigt, welche Positionen aus einem anderen Monat übernommen werden können.</summary>
    /// <param name="sourceMonth">Optional; ohne Angabe der jüngste Monat vor dem Zielmonat.</param>
    [HttpGet("copy-preview")]
    public async Task<ActionResult<FixedCostCopyPreviewDto>> GetCopyPreview(
        int accountId, [FromQuery] string month, [FromQuery] string? sourceMonth, CancellationToken ct)
        => Ok(await fixedCostService.GetCopyPreviewAsync(UserId, accountId, ParseMonth(month), sourceMonth, ct));

    /// <summary>Übernimmt die gewählten Positionen in den Zielmonat; namensgleiche werden übersprungen.</summary>
    [HttpPost("copy")]
    public async Task<ActionResult<FixedCostMonthDto>> Copy(
        int accountId, [FromQuery] string month, [FromBody] CopyFixedCostsRequest request, CancellationToken ct)
        => Ok(await fixedCostService.CopyAsync(UserId, accountId, ParseMonth(month), request, ct));

    /// <summary>Buchungen, die sich der Position zuordnen lassen — Ausgaben ohne bestehende Zuordnung.</summary>
    [HttpGet("{fixedCostId:int}/assignable-transactions")]
    public async Task<ActionResult<IReadOnlyList<FixedCostTransactionDto>>> GetAssignableTransactions(
        int accountId, int fixedCostId, [FromQuery] string? search, CancellationToken ct)
        => Ok(await fixedCostService.GetAssignableTransactionsAsync(UserId, accountId, fixedCostId, search, ct));

    [HttpPut("{fixedCostId:int}/transactions/{transactionId:int}")]
    public async Task<ActionResult<FixedCostMonthDto>> LinkTransaction(
        int accountId, int fixedCostId, int transactionId, CancellationToken ct)
        => Ok(await fixedCostService.LinkTransactionAsync(UserId, accountId, fixedCostId, transactionId, ct));

    [HttpDelete("{fixedCostId:int}/transactions/{transactionId:int}")]
    public async Task<ActionResult<FixedCostMonthDto>> UnlinkTransaction(
        int accountId, int fixedCostId, int transactionId, CancellationToken ct)
        => Ok(await fixedCostService.UnlinkTransactionAsync(UserId, accountId, fixedCostId, transactionId, ct));
}
