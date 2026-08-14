namespace Backend.Models.Finance;

/// <summary>Alle Fixkosten eines Kontos in einem Abrechnungsmonat samt Summen.</summary>
public class FixedCostMonthDto
{
    /// <summary>Der abgefragte Monat im Format <c>yyyy-MM</c>.</summary>
    public string Month { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;

    public IReadOnlyList<FixedCostDto> Items { get; set; } = [];

    /// <summary>Summe der geplanten Beträge.</summary>
    public decimal TotalPlanned { get; set; }

    /// <summary>Summe der tatsächlich zugeordneten Buchungen.</summary>
    public decimal TotalBooked { get; set; }

    /// <summary>Summe der <see cref="FixedCostDto.EffectiveAmount"/> — die Zahl, die gegen die Einnahmen gerechnet wird.</summary>
    public decimal TotalEffective { get; set; }

    /// <summary>Anzahl der Positionen ohne zugeordnete Buchung.</summary>
    public int OpenCount { get; set; }
}
