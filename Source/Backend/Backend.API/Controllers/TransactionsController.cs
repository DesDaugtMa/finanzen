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
