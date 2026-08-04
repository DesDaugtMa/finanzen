using System.Globalization;
using System.Text.Json.Serialization;

namespace Backend.Models.Finance;

/// <summary>Stand einer Fixkosten-Position gegenüber ihren tatsächlichen Buchungen.</summary>
public enum FixedCostStatus
{
    /// <summary>Noch keine Buchung zugeordnet.</summary>
    Open = 1,

    /// <summary>Zugeordnet, aber in Summe weniger als geplant.</summary>
    Partial = 2,

    /// <summary>Genau wie geplant gebucht.</summary>
    Booked = 3,

    /// <summary>Mehr gebucht als geplant.</summary>
    Exceeded = 4
}

/// <summary>Eine geplante Fixkosten-Position eines Monats samt ihrer tatsächlichen Buchungen.</summary>
public class FixedCostDto
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    /// <summary>Monat der Position im Format <c>yyyy-MM</c>.</summary>
    public string Month { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    /// <summary>Geplanter Betrag, immer positiv.</summary>
    public decimal Amount { get; set; }

    public string Currency { get; set; } = string.Empty;

    public int? CategoryId { get; set; }

    public string? CategoryName { get; set; }

    public string? CategoryColor { get; set; }

    public string? CategoryIcon { get; set; }

    public string? Note { get; set; }

    /// <summary>Summe der zugeordneten Buchungen. 0, solange nichts gebucht ist.</summary>
    public decimal BookedAmount { get; set; }

    public int TransactionCount { get; set; }

    /// <summary>
    /// Der Betrag, mit dem die Position in die Monatsrechnung eingeht: die Summe der
    /// zugeordneten Buchungen, sobald es welche gibt, sonst der geplante Betrag.
    /// </summary>
    public decimal EffectiveAmount { get; set; }

    public FixedCostStatus Status { get; set; }

    /// <summary>Die zugeordneten Buchungen, aufsteigend nach Buchungsdatum.</summary>
    public IReadOnlyList<FixedCostTransactionDto> Transactions { get; set; } = [];
}

/// <summary>
/// Eine Buchung in der Kurzform, die der Fixkosten-Bereich braucht — sowohl für die
/// bereits zugeordneten Buchungen als auch für die Auswahl im Zuordnungs-Dialog.
/// </summary>
public class FixedCostTransactionDto
{
    public int Id { get; set; }

    public string Title { get; set; } = string.Empty;

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

    /// <summary>Abrechnungsmonat im Format <c>yyyy-MM</c>. Kann vom Monat der Position abweichen.</summary>
    public string AccountingMonth => AccountingMonthDate.ToString("yyyy-MM", CultureInfo.InvariantCulture);
}
