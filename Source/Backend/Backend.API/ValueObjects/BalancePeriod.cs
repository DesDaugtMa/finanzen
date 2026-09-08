using Backend.Exceptions;
using System.Globalization;

namespace Backend.ValueObjects;

/// <summary>Die zeitliche Körnung eines Bilanzzeitraums.</summary>
public enum BalancePeriodKind
{
    Month,
    Year
}

/// <summary>
/// Der Zeitraum, über den die Übersicht rechnet: entweder ein Abrechnungsmonat
/// (<c>yyyy-MM</c>) oder ein ganzes Jahr (<c>yyyy</c>).
///
/// Beide Fälle liegen bewusst in einem Wertobjekt, weil die Bilanz für beide
/// identisch berechnet wird — nur die Grenzen des Zeitraums unterscheiden sich.
/// Die Abfragen im Service arbeiten deshalb ausschließlich gegen
/// <see cref="Start"/> und <see cref="EndExclusive"/> und kennen den Unterschied
/// zwischen Monat und Jahr gar nicht.
/// </summary>
public readonly record struct BalancePeriod
{
    private const string MonthFormat = "yyyy-MM";

    private BalancePeriod(BalancePeriodKind kind, int year, int month)
    {
        Kind = kind;
        Year = year;
        Month = month;
    }

    public BalancePeriodKind Kind { get; }

    public int Year { get; }

    /// <summary>Der Monat (1–12) bei <see cref="BalancePeriodKind.Month"/>, sonst 1.</summary>
    public int Month { get; }

    public static BalancePeriod ForMonth(AccountingMonth month)
        => new(BalancePeriodKind.Month, month.Year, month.Month);

    public static BalancePeriod ForYear(int year)
    {
        if (!AccountingMonth.IsSupportedYear(year))
            throw new BusinessRuleException($"Das Jahr muss zwischen {AccountingMonth.MinYear} und {AccountingMonth.MaxYear} liegen.");

        return new BalancePeriod(BalancePeriodKind.Year, year, 1);
    }

    /// <summary>Erster Tag des Zeitraums — untere Grenze der Bereichsabfragen.</summary>
    public DateOnly Start => new(Year, Month, 1);

    /// <summary>Erster Tag nach dem Zeitraum — obere, ausschließende Grenze (<c>&gt;= Start &amp;&amp; &lt; EndExclusive</c>).</summary>
    public DateOnly EndExclusive => Kind == BalancePeriodKind.Month
        ? Start.AddMonths(1)
        : Start.AddYears(1);

    /// <summary>
    /// Der unmittelbar davorliegende Zeitraum gleicher Körnung — die Vergleichsgröße
    /// der Übersicht (Vormonat beziehungsweise Vorjahr).
    /// </summary>
    public BalancePeriod Previous() => Kind == BalancePeriodKind.Month
        ? ForMonth(new AccountingMonth(Year, Month).Previous())
        : new BalancePeriod(BalancePeriodKind.Year, Year - 1, 1);

    /// <summary>Der Zeitraum als Schlüssel für die API: <c>2026-07</c> oder <c>2026</c>.</summary>
    public override string ToString() => Kind == BalancePeriodKind.Month
        ? Start.ToString(MonthFormat, CultureInfo.InvariantCulture)
        : Year.ToString(CultureInfo.InvariantCulture);

    /// <summary>
    /// Liest einen Zeitraum aus seiner Textform. Die Länge entscheidet über die
    /// Körnung: vier Zeichen sind ein Jahr, sieben ein Monat.
    /// </summary>
    public static bool TryParse(string? value, out BalancePeriod period)
    {
        period = default;

        var text = value?.Trim();
        if (string.IsNullOrEmpty(text))
            return false;

        if (AccountingMonth.TryParse(text, out var month))
        {
            period = ForMonth(month);
            return true;
        }

        if (!int.TryParse(text, NumberStyles.None, CultureInfo.InvariantCulture, out var year))
            return false;

        if (!AccountingMonth.IsSupportedYear(year))
            return false;

        period = new BalancePeriod(BalancePeriodKind.Year, year, 1);
        return true;
    }

    /// <summary>Wie <see cref="TryParse"/>, wirft aber eine Regelverletzung statt still zu scheitern.</summary>
    public static BalancePeriod Parse(string? value)
    {
        if (!TryParse(value, out var period))
            throw new BusinessRuleException("Der Zeitraum muss als JJJJ-MM (Monat) oder JJJJ (Jahr) angegeben werden, z. B. 2026-07 oder 2026.");

        return period;
    }
}
