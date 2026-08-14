using Backend.Models.Finance;
using Backend.ValueObjects;

namespace Backend.Services.Interfaces;

/// <summary>
/// Berechnet die konten-übergreifende Bilanz des Nutzers: die des Monats samt
/// Aufschlüsselung nach Kontokategorie und die des Jahres samt Monatsverlauf.
/// </summary>
public interface IBalanceService
{
    Task<OverallMonthBalanceDto> GetMonthAsync(int userId, AccountingMonth month, CancellationToken ct = default);

    Task<YearBalanceDto> GetYearAsync(int userId, int year, CancellationToken ct = default);
}
