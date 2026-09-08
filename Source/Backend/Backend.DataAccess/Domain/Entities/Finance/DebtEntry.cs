using Backend.Domain.Enums;

namespace Backend.Domain.Entities.Finance;

/// <summary>
/// Ein manuell erfasster Betrag eines Schuldeintrags — Geld, zu dem es keine Buchung auf
/// einem Geldkonto gibt: Bargeld, ein fremdes Konto, ein Vorgang von vor der ersten
/// Erfassung. Er zählt in den Summen des Eintrags gleichberechtigt neben den zugeordneten
/// Buchungen mit.
/// </summary>
/// <remarks>
/// Bewusst eine eigene Position statt eines Betragsfelds am Eintrag: nur so lassen sich
/// mehrere Verleihe und mehrere Rückzahlungen einzeln erfassen, korrigieren und wieder
/// entfernen, und der Verlauf bleibt nachvollziehbar.
/// </remarks>
public class DebtEntry
{
    public int Id { get; set; }

    public int DebtId { get; set; }
    public Debt Debt { get; set; } = null!;

    /// <summary>
    /// <c>Expense</c> heißt verliehen, <c>Income</c> heißt zurückgezahlt — dieselbe Bedeutung
    /// wie bei einer zugeordneten Buchung, damit beide in einer Liste zusammenpassen.
    /// </summary>
    public TransactionType Direction { get; set; }

    /// <summary>Immer positiv. Die Richtung steckt in <see cref="Direction"/>.</summary>
    public decimal Amount { get; set; }

    /// <summary>Wann das Geld geflossen ist — nicht, wann die Position erfasst wurde.</summary>
    public DateOnly EntryDate { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
