using Backend.Models.Finance;
using Backend.ValueObjects;

namespace Backend.Services.Interfaces;

/// <summary>
/// Verwaltet die Buchungen eines Kontos samt ihrer 1-zu-1-Verknüpfung mit einer Buchung
/// eines anderen Kontos. Verknüpfte Buchungen bleiben eigenständig: Die Verknüpfung ist
/// ein Verweis für die Nachvollziehbarkeit, kein gemeinsamer Datensatz.
/// </summary>
public interface ITransactionService
{
    Task<PagedResult<TransactionDto>> ListAsync(int userId, int accountId, TransactionQuery query, CancellationToken ct = default);

    Task<TransactionDto> GetAsync(int userId, int accountId, int transactionId, CancellationToken ct = default);

    Task<TransactionDto> CreateAsync(int userId, int accountId, SaveTransactionRequest request, CancellationToken ct = default);

    Task<TransactionDto> UpdateAsync(int userId, int accountId, int transactionId, SaveTransactionRequest request, CancellationToken ct = default);

    /// <summary>
    /// Löscht die Buchung endgültig. Eine verknüpfte Gegenbuchung bleibt bestehen und
    /// verliert nur ihre Verknüpfung.
    /// </summary>
    Task DeleteAsync(int userId, int accountId, int transactionId, CancellationToken ct = default);

    /// <summary>
    /// Markiert eine noch nicht abgebuchte Buchung als abgebucht. Ist sie es bereits,
    /// bleibt der Aufruf folgenlos und liefert den unveränderten Stand.
    /// </summary>
    Task<TransactionDto> SettleAsync(int userId, int accountId, int transactionId, CancellationToken ct = default);

    /// <summary>Markiert alle noch offenen Buchungen eines Abrechnungsmonats als abgebucht.</summary>
    Task<SettleResultDto> SettleMonthAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default);

    /// <summary>Liefert die verknüpfte Buchung mit allen Angaben für die Detailansicht.</summary>
    Task<LinkedTransactionDto> GetLinkAsync(int userId, int accountId, int transactionId, CancellationToken ct = default);

    /// <summary>
    /// Sucht auf einem anderen Konto die Buchungen, die als Gegenstück in Frage kommen:
    /// entgegengesetzte Richtung, gleicher Betrag, noch nicht verknüpft.
    /// </summary>
    Task<IReadOnlyList<LinkedTransactionDto>> ListLinkCandidatesAsync(
        int userId, int accountId, LinkCandidateQuery query, CancellationToken ct = default);

    /// <summary>Verknüpft zwei Buchungen 1-zu-1 und liefert die Gegenbuchung zurück.</summary>
    Task<LinkedTransactionDto> LinkAsync(
        int userId, int accountId, int transactionId, LinkTransactionRequest request, CancellationToken ct = default);

    /// <summary>
    /// Löst die Verknüpfung auf beiden Seiten. Besteht keine, bleibt der Aufruf folgenlos.
    /// </summary>
    Task UnlinkAsync(int userId, int accountId, int transactionId, CancellationToken ct = default);
}
