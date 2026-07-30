using Backend.Exceptions;
using System.Globalization;

namespace Backend.ValueObjects;

/// <summary>
/// Ein Abrechnungsmonat. Nach außen (API, Frontend) immer als <c>yyyy-MM</c>,
/// in der Datenbank als <see cref="DateOnly"/> mit Tag 1 — beide Formen an einer
/// Stelle ineinander überführt, damit Monatsgrenzen überall identisch gerechnet werden.
/// </summary>
public readonly record struct AccountingMonth(int Year, int Month)
{
    private const string Format = "yyyy-MM";

    /// <summary>Untere Grenze, die versehentliche Tippfehler wie das Jahr 20 abfängt.</summary>
    private const int MinYear = 1900;
    private const int MaxYear = 2999;

    public static AccountingMonth FromDate(DateOnly date) => new(date.Year, date.Month);

    /// <summary>Erster Tag des Monats — so werden <c>AccountingMonth</c> und <c>Budget.Month</c> gespeichert.</summary>
    public DateOnly ToDateOnly() => new(Year, Month, 1);

    /// <summary>Erster Tag des Folgemonats. Grenze für Bereichsabfragen (<c>&gt;= start &amp;&amp; &lt; end</c>).</summary>
    public DateOnly ToExclusiveEnd() => ToDateOnly().AddMonths(1);

    public AccountingMonth AddMonths(int months) => FromDate(ToDateOnly().AddMonths(months));

    public AccountingMonth Previous() => AddMonths(-1);

    public override string ToString() => ToDateOnly().ToString(Format, CultureInfo.InvariantCulture);

    public static bool TryParse(string? value, out AccountingMonth month)
    {
        month = default;

        if (string.IsNullOrWhiteSpace(value))
            return false;

        if (!DateOnly.TryParseExact($"{value.Trim()}-01", "yyyy-MM-dd", CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var parsed))
            return false;

        if (parsed.Year is < MinYear or > MaxYear)
            return false;

        month = FromDate(parsed);
        return true;
    }

    /// <summary>Wie <see cref="TryParse"/>, wirft aber eine Regelverletzung statt still zu scheitern.</summary>
    public static AccountingMonth Parse(string? value)
    {
        if (!TryParse(value, out var month))
            throw new BusinessRuleException("Der Monat muss im Format JJJJ-MM angegeben werden, z. B. 2026-07.");

        return month;
    }
}
