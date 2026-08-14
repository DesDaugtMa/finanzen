using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

/// <summary>Buchungen eines Kontos innerhalb eines Abrechnungsmonats.</summary>
[ApiController]
[Route("api/bankaccounts/{accountId:int}/transactions")]
[Authorize]
public sealed class TransactionsController(
    ITransactionService transactionService,
    ICurrentUser currentUser) : FinanceControllerBase(currentUser)
{
    [HttpGet]
    public async Task<ActionResult<PagedResult<TransactionDto>>> GetPage(
        int accountId, [FromQuery] TransactionQuery query, CancellationToken ct)
        => Ok(await transactionService.ListAsync(UserId, accountId, query, ct));

    [HttpGet("{transactionId:int}")]
    public async Task<ActionResult<TransactionDto>> GetById(int accountId, int transactionId, CancellationToken ct)
        => Ok(await transactionService.GetAsync(UserId, accountId, transactionId, ct));

    [HttpPost]
    public async Task<ActionResult<TransactionDto>> Create(int accountId, [FromBody] SaveTransactionRequest request, CancellationToken ct)
    {
        var created = await transactionService.CreateAsync(UserId, accountId, request, ct);
        return CreatedAtAction(nameof(GetById), new { accountId, transactionId = created.Id }, created);
    }

    [HttpPut("{transactionId:int}")]
    public async Task<ActionResult<TransactionDto>> Update(
        int accountId, int transactionId, [FromBody] SaveTransactionRequest request, CancellationToken ct)
        => Ok(await transactionService.UpdateAsync(UserId, accountId, transactionId, request, ct));

    /// <summary>Löscht die Buchung endgültig; bei einer Überweisung auch die Gegenbuchung.</summary>
    [HttpDelete("{transactionId:int}")]
    public async Task<IActionResult> Delete(int accountId, int transactionId, CancellationToken ct)
    {
        await transactionService.DeleteAsync(UserId, accountId, transactionId, ct);
        return NoContent();
    }

    /// <summary>Markiert eine noch nicht abgebuchte Buchung als abgebucht.</summary>
    [HttpPost("{transactionId:int}/settle")]
    public async Task<ActionResult<TransactionDto>> Settle(int accountId, int transactionId, CancellationToken ct)
        => Ok(await transactionService.SettleAsync(UserId, accountId, transactionId, ct));

    /// <summary>Markiert alle noch offenen Buchungen eines Abrechnungsmonats als abgebucht.</summary>
    /// <param name="month">Monat im Format <c>yyyy-MM</c>, z. B. <c>2026-07</c>.</param>
    [HttpPost("settle")]
    public async Task<ActionResult<SettleResultDto>> SettleMonth(
        int accountId, [FromQuery] string month, CancellationToken ct)
        => Ok(await transactionService.SettleMonthAsync(UserId, accountId, ParseMonth(month), ct));

    /// <summary>Legt eine Überweisung als gekoppeltes Buchungspaar an.</summary>
    [HttpPost("transfers")]
    public async Task<ActionResult<TransactionDto>> CreateTransfer(int accountId, [FromBody] SaveTransferRequest request, CancellationToken ct)
    {
        var created = await transactionService.CreateTransferAsync(UserId, accountId, request, ct);
        return CreatedAtAction(nameof(GetById), new { accountId, transactionId = created.Id }, created);
    }

    [HttpPut("transfers/{transactionId:int}")]
    public async Task<ActionResult<TransactionDto>> UpdateTransfer(
        int accountId, int transactionId, [FromBody] SaveTransferRequest request, CancellationToken ct)
        => Ok(await transactionService.UpdateTransferAsync(UserId, accountId, transactionId, request, ct));
}
