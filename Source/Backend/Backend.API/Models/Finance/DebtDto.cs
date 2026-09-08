using Backend.Domain.Enums;
using System.Globalization;
using System.Text.Json.Serialization;

namespace Backend.Models.Finance;

/// <summary>Stand eines Schuldeintrags, abgeleitet aus allen seinen Positionen.</summary>
public enum DebtStatus
{
    /// <summary>Weder eine Buchung noch ein manueller Betrag erfasst — es steht noch nichts fest.</summary>
    Empty = 1,

    /// <summary>Es steht noch Geld aus.</summary>
    Open = 2,

    /// <summary>Vollständig zurückgezahlt.</summary>
    Settled = 3,

    /// <summary>Mehr zurückbekommen als verliehen.</summary>
    Overpaid = 4
}

/// <summary>
/// Ein Schuldeintrag samt seiner Positionen — den zugeordneten Buchungen und den manuell
/// erfassten Beträgen. Alle Beträge sind positiv; die Richtung steckt in der einzelnen
/// Position bzw. in der Bedeutung des jeweiligen Feldes.
/// </summary>
public class DebtDto
{
    public int Id { get; set; }

    public string PersonName { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? Note { get; set; }

    public string Currency { get; set; } = string.Empty;

    /// <summary>
    /// Das verliehene Geld: zugeordnete Ausgaben plus manuell als „verliehen“ erfasste Beträge.
    /// </summary>
    public decimal LentAmount { get; set; }

    /// <summary>
    /// Das bereits Zurückgezahlte: zugeordnete Einnahmen plus manuell als „zurückgezahlt“
    /// erfasste Beträge.
    /// </summary>
    public decimal RepaidAmount { get; set; }

    /// <summary>
    /// Was noch aussteht: <see cref="LentAmount"/> − <see cref="RepaidAmount"/>. Negativ,
    /// wenn mehr zurückgezahlt wurde als verliehen.
    /// </summary>
    public decimal OutstandingAmount { get; set; }

    public int TransactionCount { get; set; }

    /// <summary>Anzahl der manuell erfassten Beträge.</summary>
    public int EntryCount { get; set; }

    /// <summary>Positionen insgesamt — Buchungen und manuelle Beträge zusammen.</summary>
    public int PositionCount => TransactionCount + EntryCount;

    public DebtStatus Status { get; set; }

    /// <summary>Die zugeordneten Buchungen, absteigend nach Buchungsdatum.</summary>
    public IReadOnlyList<DebtTransactionDto> Transactions { get; set; } = [];

    /// <summary>Die manuell erfassten Beträge, absteigend nach Datum.</summary>
    public IReadOnlyList<DebtEntryDto> Entries { get; set; } = [];
}

/// <summary>
/// Ein manuell erfasster Betrag eines Schuldeintrags — Geld ohne zugehörige Buchung auf
/// einem Geldkonto.
/// </summary>
public class DebtEntryDto
{
    public int Id { get; set; }

    /// <summary>
    /// <c>Expense</c> heißt verliehen, <c>Income</c> heißt zurückgezahlt — dieselbe Bedeutung
    /// wie bei einer zugeordneten Buchung.
    /// </summary>
    public TransactionType Direction { get; set; }

    /// <summary>Immer positiv. Die Richtung steckt in <see cref="Direction"/>.</summary>
    public decimal Amount { get; set; }

    /// <summary>Die Währung des Schuldeintrags — eine manuelle Position führt keine eigene.</summary>
    public string Currency { get; set; } = string.Empty;

    public DateOnly EntryDate { get; set; }

    public string? Note { get; set; }
}

/// <summary>
/// Eine Buchung in der Kurzform, die der Schuldner-Bereich braucht — sowohl für die
/// bereits zugeordneten Buchungen als auch für die Auswahl im Zuordnungs-Dialog.
/// </summary>
public class DebtTransactionDto
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    /// <summary>Name des Geldkontos — Einträge laufen über mehrere Konten hinweg.</summary>
    public string AccountName { get; set; } = string.Empty;

    public string? AccountColor { get; set; }

    /// <summary>
    /// <c>Expense</c> heißt verliehen, <c>Income</c> heißt zurückgezahlt. Die Richtung kommt
    /// aus der Buchung selbst und wird nie separat gepflegt.
    /// </summary>
    public TransactionType Direction { get; set; }

    public string Title { get; set; } = string.Empty;

    /// <summary>Immer positiv. Die Richtung steckt in <see cref="Direction"/>.</summary>
    public decimal Amount { get; set; }

    public string Currency { get; set; } = string.Empty;

    public DateOnly BookingDate { get; set; }

    public string? CategoryName { get; set; }

    public string? CategoryColor { get; set; }

    public string? CategoryIcon { get; set; }

    /// <summary>
    /// Interner Wert des Abrechnungsmonats (immer der Erste des Monats). Nach außen
    /// geht ausschließlich <see cref="AccountingMonth"/>.
    /// </summary>
    [JsonIgnore]
    public DateOnly AccountingMonthDate { get; set; }

    /// <summary>Abrechnungsmonat im Format <c>yyyy-MM</c>.</summary>
    public string AccountingMonth => AccountingMonthDate.ToString("yyyy-MM", CultureInfo.InvariantCulture);
}
