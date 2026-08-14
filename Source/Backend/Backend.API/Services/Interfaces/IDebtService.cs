using Backend.Models.Finance;

namespace Backend.Services.Interfaces;

/// <summary>
/// Schuldeinträge des Nutzers — Geld, das er anderen geliehen hat. Ein Eintrag führt
/// keinen eigenen Betrag: was offen ist, ergibt sich aus den zugeordneten Buchungen.
/// Die Einträge hängen am Nutzer, nicht an einem Konto, denn Verleih und Rückzahlung
/// laufen oft über verschiedene Geldkonten.
/// </summary>
public interface IDebtService
{
    /// <summary>Alle Einträge, gruppiert nach Person, samt Summen.</summary>
    Task<DebtOverviewDto> GetOverviewAsync(int userId, CancellationToken ct = default);

    Task<DebtDto> GetAsync(int userId, int debtId, CancellationToken ct = default);

    Task<DebtDto> CreateAsync(int userId, SaveDebtRequest request, CancellationToken ct = default);

    Task<DebtDto> UpdateAsync(int userId, int debtId, SaveDebtRequest request, CancellationToken ct = default);

    /// <summary>Löscht den Eintrag; zugeordnete Buchungen bleiben erhalten und verlieren nur die Zuordnung.</summary>
    Task DeleteAsync(int userId, int debtId, CancellationToken ct = default);

    /// <summary>
    /// Buchungen, die sich zuordnen lassen: Buchungen aller Konten des Nutzers, die noch
    /// keinem Schuldeintrag zugeordnet sind, keine Fixkosten bezahlen und keine Überweisung
    /// zwischen eigenen Konten sind.
    /// </summary>
    /// <param name="accountId">Optionaler Filter auf ein Geldkonto.</param>
    Task<IReadOnlyList<DebtTransactionDto>> GetAssignableTransactionsAsync(
        int userId, int debtId, string? search, int? accountId, CancellationToken ct = default);

    Task<DebtOverviewDto> LinkTransactionAsync(
        int userId, int debtId, int transactionId, CancellationToken ct = default);

    Task<DebtOverviewDto> UnlinkTransactionAsync(
        int userId, int debtId, int transactionId, CancellationToken ct = default);
}
