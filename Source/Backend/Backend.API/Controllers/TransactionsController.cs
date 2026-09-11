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
    /// <summary>Alle Buchungen eines Abrechnungsmonats. Filterung und Sortierung laufen im Frontend.</summary>
    /// <param name="month">Monat im Format <c>yyyy-MM</c>, z. B. <c>2026-07</c>.</param>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<TransactionDto>>> GetMonth(
        int accountId, [FromQuery] string month, CancellationToken ct)
        => Ok(await transactionService.ListAsync(UserId, accountId, ParseMonth(month), ct));

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

    /// <summary>
    /// Löscht die Buchung endgültig. Eine verknüpfte Gegenbuchung bleibt bestehen und
    /// verliert nur ihre Verknüpfung.
    /// </summary>
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

    /// <summary>
    /// Buchungen eines anderen Kontos, die sich mit dieser Seite verknüpfen lassen.
    /// Richtung und Betrag der eigenen Seite stehen in der Abfrage — beim Anlegen ist sie
    /// noch gar nicht gespeichert.
    /// </summary>
    [HttpGet("link-candidates")]
    public async Task<ActionResult<IReadOnlyList<LinkedTransactionDto>>> GetLinkCandidates(
        int accountId, [FromQuery] LinkCandidateQuery query, CancellationToken ct)
        => Ok(await transactionService.ListLinkCandidatesAsync(UserId, accountId, query, ct));

    /// <summary>Die verknüpfte Buchung des anderen Kontos mit allen Details.</summary>
    [HttpGet("{transactionId:int}/link")]
    public async Task<ActionResult<LinkedTransactionDto>> GetLink(int accountId, int transactionId, CancellationToken ct)
        => Ok(await transactionService.GetLinkAsync(UserId, accountId, transactionId, ct));

    /// <summary>Verknüpft diese Buchung 1-zu-1 mit einer Buchung eines anderen Kontos.</summary>
    [HttpPost("{transactionId:int}/link")]
    public async Task<ActionResult<LinkedTransactionDto>> Link(
        int accountId, int transactionId, [FromBody] LinkTransactionRequest request, CancellationToken ct)
        => Ok(await transactionService.LinkAsync(UserId, accountId, transactionId, request, ct));

    /// <summary>Löst die Verknüpfung; beide Buchungen bleiben erhalten.</summary>
    [HttpDelete("{transactionId:int}/link")]
    public async Task<IActionResult> Unlink(int accountId, int transactionId, CancellationToken ct)
    {
        await transactionService.UnlinkAsync(UserId, accountId, transactionId, ct);
        return NoContent();
    }
}
