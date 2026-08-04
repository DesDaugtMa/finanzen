using Backend.Domain.Enums;
using System.Globalization;
using System.Text.Json.Serialization;

namespace Backend.Models.Finance;

/// <summary>Eine Buchung eines Kontos.</summary>
public class TransactionDto
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    public TransactionType Type { get; set; }

    /// <summary>Immer positiv. Die Richtung steckt in <see cref="Type"/>.</summary>
    public decimal Amount { get; set; }

    public string Currency { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public int? CategoryId { get; set; }

    public string? CategoryName { get; set; }

    public string? CategoryColor { get; set; }

    public string? CategoryIcon { get; set; }

    /// <summary>Zugeordnete Fixkosten-Position, sonst null. Gesetzt heißt: keine variable Ausgabe.</summary>
    public int? FixedCostId { get; set; }

    public string? FixedCostName { get; set; }

    /// <summary>Interner Wert des Fixkosten-Monats; nach außen geht <see cref="FixedCostMonth"/>.</summary>
    [JsonIgnore]
    public DateOnly? FixedCostMonthDate { get; set; }

    /// <summary>
    /// Monat der zugeordneten Fixkosten-Position im Format <c>yyyy-MM</c>, sonst null. Kann vom
    /// Abrechnungsmonat der Buchung abweichen — etwa bei einer Jahresrechnung.
    /// </summary>
    public string? FixedCostMonth => FixedCostMonthDate?.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    public DateOnly BookingDate { get; set; }

    public DateOnly? PurchaseDate { get; set; }

    /// <summary>
    /// Interner Wert des Abrechnungsmonats (immer der Erste des Monats). Wird so aus der
    /// Datenbank projiziert; nach außen geht ausschließlich <see cref="AccountingMonth"/>.
    /// </summary>
    [JsonIgnore]
    public DateOnly AccountingMonthDate { get; set; }

    /// <summary>Abrechnungsmonat im Format <c>yyyy-MM</c>. Bestimmt, in welchem Monat die Buchung erscheint.</summary>
    public string AccountingMonth => AccountingMonthDate.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    public string? Note { get; set; }

    /// <summary>True, wenn die Buchung Teil einer Überweisung zwischen zwei Konten ist.</summary>
    public bool IsTransfer { get; set; }

    /// <summary>Das andere Konto der Überweisung, sonst null.</summary>
    public int? CounterAccountId { get; set; }

    public string? CounterAccountName { get; set; }

    /// <summary>Kategorie der Gegenbuchung — nötig, um eine Überweisung verlustfrei zu bearbeiten.</summary>
    public int? CounterCategoryId { get; set; }

    public DateTime CreatedAt { get; set; }
}
