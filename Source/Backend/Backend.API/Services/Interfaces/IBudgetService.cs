using Backend.Models.Finance;
using Backend.ValueObjects;

namespace Backend.Services.Interfaces;

/// <summary>Verwaltet die Monatsbudgets je Kategorie eines Kontos.</summary>
public interface IBudgetService
{
    /// <summary>Alle Kategorien mit Budget, Vormonats-Vorschlag und Verbrauch des Monats.</summary>
    Task<BudgetMonthDto> GetMonthAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default);

    /// <summary>Setzt oder entfernt das Budget einer Kategorie und liefert den neu gerechneten Monat zurück.</summary>
    Task<BudgetMonthDto> SetAsync(int userId, int accountId, int categoryId, AccountingMonth month,
        SetBudgetRequest request, CancellationToken ct = default);

    /// <summary>Speichert die Vorschläge aus dem Vormonat für alle Kategorien, die im Monat kein Budget haben.</summary>
    Task<BudgetMonthDto> ApplySuggestionsAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default);
}
