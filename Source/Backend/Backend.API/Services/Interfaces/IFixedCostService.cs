using Backend.Models.Finance;
using Backend.ValueObjects;

namespace Backend.Services.Interfaces;

/// <summary>
/// Summen der Fixkosten eines Monats. <paramref name="Effective"/> ist der Betrag, der
/// gegen die Einnahmen gerechnet wird: je Position das bereits gezahlte Geld plus die
/// Restverpflichtung, also <c>max(geplant, gebucht)</c>.
/// </summary>
public readonly record struct FixedCostTotals(
    decimal Planned,
    decimal Booked,
    decimal Effective,
    int Count,
    int OpenCount)
{
    public static FixedCostTotals Empty => new(0m, 0m, 0m, 0, 0);
}

/// <summary>Geplante Fixkosten eines Kontos. Jede Position gehört zu genau einem Abrechnungsmonat.</summary>
public interface IFixedCostService
{
    Task<FixedCostMonthDto> GetMonthAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default);

    Task<FixedCostDto> GetAsync(int userId, int accountId, int fixedCostId, CancellationToken ct = default);

    Task<FixedCostDto> CreateAsync(int userId, int accountId, AccountingMonth month, SaveFixedCostRequest request, CancellationToken ct = default);

    Task<FixedCostDto> UpdateAsync(int userId, int accountId, int fixedCostId, SaveFixedCostRequest request, CancellationToken ct = default);

    /// <summary>Löscht die Position; zugeordnete Buchungen bleiben erhalten und werden wieder variabel.</summary>
    Task DeleteAsync(int userId, int accountId, int fixedCostId, CancellationToken ct = default);

    /// <param name="sourceMonth">Quellmonat; ohne Angabe der jüngste Monat vor dem Zielmonat, der Fixkosten hat.</param>
    Task<FixedCostCopyPreviewDto> GetCopyPreviewAsync(
        int userId, int accountId, AccountingMonth month, string? sourceMonth, CancellationToken ct = default);

    Task<FixedCostMonthDto> CopyAsync(
        int userId, int accountId, AccountingMonth month, CopyFixedCostsRequest request, CancellationToken ct = default);

    /// <summary>Buchungen, die sich der Position zuordnen lassen: Ausgaben des Kontos ohne bestehende Zuordnung.</summary>
    Task<IReadOnlyList<FixedCostTransactionDto>> GetAssignableTransactionsAsync(
        int userId, int accountId, int fixedCostId, string? search, CancellationToken ct = default);

    Task<FixedCostMonthDto> LinkTransactionAsync(
        int userId, int accountId, int fixedCostId, int transactionId, CancellationToken ct = default);

    Task<FixedCostMonthDto> UnlinkTransactionAsync(
        int userId, int accountId, int fixedCostId, int transactionId, CancellationToken ct = default);

    /// <summary>
    /// Summen für die Monatskennzahlen. Setzt einen bereits geprüften Kontozugriff voraus
    /// und wird deshalb ohne Nutzerkontext aufgerufen.
    /// </summary>
    Task<FixedCostTotals> GetTotalsAsync(int accountId, AccountingMonth month, CancellationToken ct = default);
}
