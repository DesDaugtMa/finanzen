using Backend.Models.Finance;
using Backend.ValueObjects;

namespace Backend.Services.Interfaces;

/// <summary>Berechnet die Kennzahlen eines Kontos für einen Abrechnungsmonat.</summary>
public interface IMonthSummaryService
{
    Task<MonthSummaryDto> GetAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default);
}
