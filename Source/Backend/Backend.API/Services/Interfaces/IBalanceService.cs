using Backend.Models.Finance;
using Backend.ValueObjects;

namespace Backend.Services.Interfaces;

/// <summary>
/// Berechnet die konten-übergreifende Bilanz des Nutzers: die eines frei gewählten
/// Zeitraums samt Aufschlüsselung nach Kontokategorie und die des Jahres samt
/// Monatsverlauf.
/// </summary>
public interface IBalanceService
{
    /// <summary>Bilanz eines Zeitraums (Monat oder Jahr) samt Kontoaufschlüsselung.</summary>
    Task<PeriodBalanceDto> GetPeriodAsync(int userId, BalancePeriod period, CancellationToken ct = default);

    Task<OverallMonthBalanceDto> GetMonthAsync(int userId, AccountingMonth month, CancellationToken ct = default);

    Task<YearBalanceDto> GetYearAsync(int userId, int year, CancellationToken ct = default);
}
