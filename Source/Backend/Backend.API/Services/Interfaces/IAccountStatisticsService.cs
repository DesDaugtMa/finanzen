using Backend.Models.Finance;
using Backend.ValueObjects;

namespace Backend.Services.Interfaces;

/// <summary>
/// Auswertungen eines Kontos für einen Abrechnungsmonat: Verlauf, Spielraum pro Tag,
/// Hochrechnung und der Vergleich von Plan und Ist.
/// </summary>
public interface IAccountStatisticsService
{
    Task<AccountStatisticsDto> GetAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default);
}
