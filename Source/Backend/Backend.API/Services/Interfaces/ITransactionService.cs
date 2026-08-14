using Backend.Models.Finance;
using Backend.ValueObjects;

namespace Backend.Services.Interfaces;

/// <summary>
/// Verwaltet die Buchungen eines Kontos inklusive der Überweisungen zwischen zwei
/// Konten, die als fest gekoppeltes Buchungspaar abgebildet sind.
/// </summary>
public interface ITransactionService
{
    Task<PagedResult<TransactionDto>> ListAsync(int userId, int accountId, TransactionQuery query, CancellationToken ct = default);

    Task<TransactionDto> GetAsync(int userId, int accountId, int transactionId, CancellationToken ct = default);

    Task<TransactionDto> CreateAsync(int userId, int accountId, SaveTransactionRequest request, CancellationToken ct = default);

    Task<TransactionDto> UpdateAsync(int userId, int accountId, int transactionId, SaveTransactionRequest request, CancellationToken ct = default);

    /// <summary>Löscht die Buchung endgültig; bei einer Überweisung auch die Gegenbuchung.</summary>
    Task DeleteAsync(int userId, int accountId, int transactionId, CancellationToken ct = default);

    /// <summary>
    /// Markiert eine noch nicht abgebuchte Buchung als abgebucht. Ist sie es bereits,
    /// bleibt der Aufruf folgenlos und liefert den unveränderten Stand.
    /// </summary>
    Task<TransactionDto> SettleAsync(int userId, int accountId, int transactionId, CancellationToken ct = default);

    /// <summary>Markiert alle noch offenen Buchungen eines Abrechnungsmonats als abgebucht.</summary>
    Task<SettleResultDto> SettleMonthAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default);

    Task<TransactionDto> CreateTransferAsync(int userId, int accountId, SaveTransferRequest request, CancellationToken ct = default);

    Task<TransactionDto> UpdateTransferAsync(int userId, int accountId, int transactionId, SaveTransferRequest request, CancellationToken ct = default);
}
