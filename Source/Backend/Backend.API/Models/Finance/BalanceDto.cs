using Backend.Domain.Enums;
using Backend.ValueObjects;

namespace Backend.Models.Finance;

/// <summary>
/// Die Bilanz eines frei gewählten Zeitraums — die Datenquelle der Startseite.
/// </summary>
/// <remarks>
/// Inhaltlich identisch zur Monatsbilanz, nur dass der Zeitraum ein Monat oder ein
/// ganzes Jahr sein kann. Sämtliche Zahlen und die gesamte Kontoaufschlüsselung
/// beziehen sich auf diesen Zeitraum; einzige Ausnahme sind die Vermögenswerte
/// (<see cref="NetWorth"/>, <c>CurrentBalance</c> je Konto), die immer den heutigen
/// Stand zeigen — ein Kontostand ist eine Zeitpunkt- und keine Zeitraumgröße.
///
/// Umbuchungen zwischen eigenen Konten sind wie überall aus Einnahmen und Ausgaben
/// herausgerechnet.
/// </remarks>
public class PeriodBalanceDto
{
    /// <summary>Der abgefragte Zeitraum als <c>yyyy-MM</c> (Monat) oder <c>yyyy</c> (Jahr).</summary>
    public string Period { get; set; } = string.Empty;

    /// <summary>Die Körnung des Zeitraums — <c>Month</c> oder <c>Year</c>.</summary>
    public BalancePeriodKind Kind { get; set; }

    public string Currency { get; set; } = string.Empty;

    /// <summary>Einnahmen des Zeitraums über alle Konten, ohne Umbuchungen.</summary>
    public decimal Income { get; set; }

    /// <summary>Ausgaben des Zeitraums über alle Konten, ohne Umbuchungen, als positiver Wert.</summary>
    public decimal Expenses { get; set; }

    /// <summary><c>Income − Expenses</c>. Die Bilanz des Zeitraums.</summary>
    public decimal Net { get; set; }

    /// <summary>
    /// Bewegtes Volumen der Umbuchungen zwischen eigenen Konten (je Umbuchung einmal gezählt).
    /// Rein informativ — es steckt weder in <see cref="Income"/> noch in <see cref="Expenses"/>.
    /// </summary>
    public decimal TransferVolume { get; set; }

    /// <summary>Bilanz des vorangehenden Zeitraums gleicher Körnung (Vormonat bzw. Vorjahr).</summary>
    public decimal PreviousNet { get; set; }

    /// <summary>Aktuelles Gesamtvermögen: Summe der heutigen Kontostände aller Kategorien.</summary>
    public decimal NetWorth { get; set; }

    /// <summary>Das Gesamtvermögen ohne die noch nicht abgebuchten Ausgaben.</summary>
    public decimal SettledNetWorth { get; set; }

    /// <summary>Summe aller noch nicht abgebuchten Ausgaben über alle Konten, zeitraumübergreifend.</summary>
    public decimal PendingTotal { get; set; }

    /// <summary>Anzahl der noch nicht abgebuchten Buchungen über alle Konten.</summary>
    public int PendingCount { get; set; }

    /// <summary>Anzahl der berücksichtigten Buchungen im Zeitraum, ohne Umbuchungen.</summary>
    public int TransactionCount { get; set; }

    /// <summary>Die Kontokategorien in fester Reihenfolge; leere Kategorien fehlen.</summary>
    public IReadOnlyList<AccountGroupBalanceDto> Groups { get; set; } = [];
}

/// <summary>
/// Die Monatsbilanz über alle Konten des Nutzers — die Leitzahl der Startseite.
/// </summary>
/// <remarks>
/// Umbuchungen zwischen eigenen Konten sind hier ausgenommen. Sie erscheinen auf dem
/// einen Konto als Ausgabe und auf dem anderen als Einnahme, verändern das Vermögen
/// aber um keinen Cent; würden sie mitzählen, wären Einnahmen und Ausgaben um denselben
/// Betrag überzeichnet. Auf Kontoebene zählen sie unverändert weiter.
/// </remarks>
public class OverallMonthBalanceDto
{
    /// <summary>Der abgefragte Monat im Format <c>yyyy-MM</c>.</summary>
    public string Month { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;

    /// <summary>Einnahmen des Monats über alle Konten, ohne Umbuchungen.</summary>
    public decimal Income { get; set; }

    /// <summary>Ausgaben des Monats über alle Konten, ohne Umbuchungen, als positiver Wert.</summary>
    public decimal Expenses { get; set; }

    /// <summary><c>Income − Expenses</c>. Die Bilanz des Monats.</summary>
    public decimal Net { get; set; }

    /// <summary>
    /// Bewegtes Volumen der Umbuchungen zwischen eigenen Konten (je Umbuchung einmal gezählt).
    /// Rein informativ — es steckt weder in <see cref="Income"/> noch in <see cref="Expenses"/>.
    /// </summary>
    public decimal TransferVolume { get; set; }

    /// <summary>Bilanz des Vormonats, für den Vergleich in der Übersicht.</summary>
    public decimal PreviousNet { get; set; }

    /// <summary>Aktuelles Gesamtvermögen: Summe der Kontostände aller Kontokategorien.</summary>
    public decimal NetWorth { get; set; }

    /// <summary>
    /// Das Gesamtvermögen ohne die noch nicht abgebuchten Ausgaben — also der Stand, den
    /// die Banken gerade anzeigen. Immer <c>NetWorth + PendingTotal</c>.
    /// </summary>
    public decimal SettledNetWorth { get; set; }

    /// <summary>Summe aller noch nicht abgebuchten Ausgaben über alle Konten, monatsübergreifend.</summary>
    public decimal PendingTotal { get; set; }

    /// <summary>Anzahl der noch nicht abgebuchten Buchungen über alle Konten.</summary>
    public int PendingCount { get; set; }

    /// <summary>Anzahl der berücksichtigten Buchungen, ohne Umbuchungen.</summary>
    public int TransactionCount { get; set; }

    /// <summary>Die Kontokategorien in fester Reihenfolge; leere Kategorien fehlen.</summary>
    public IReadOnlyList<AccountGroupBalanceDto> Groups { get; set; } = [];
}

/// <summary>
/// Bilanz und Vermögen einer Kontokategorie im abgefragten Zeitraum. Wird sowohl von
/// der Monatsbilanz als auch von der Zeitraumbilanz verwendet; „Monat“ in den
/// Beschreibungen der Flusszahlen meint dort entsprechend den abgefragten Zeitraum.
/// </summary>
public class AccountGroupBalanceDto
{
    public AccountType Type { get; set; }

    public string Currency { get; set; } = string.Empty;

    public decimal Income { get; set; }

    public decimal Expenses { get; set; }

    /// <summary><c>Income − Expenses</c> der Konten dieser Kategorie, ohne Umbuchungen.</summary>
    public decimal Net { get; set; }

    /// <summary>Summe der aktuellen Kontostände dieser Kategorie.</summary>
    public decimal Balance { get; set; }

    /// <summary>Summe der Kontostände „laut Bank" dieser Kategorie, ohne die offenen Ausgaben.</summary>
    public decimal SettledBalance { get; set; }

    /// <summary>Summe der noch nicht abgebuchten Ausgaben dieser Kategorie.</summary>
    public decimal PendingTotal { get; set; }

    /// <summary>Anzahl der noch nicht abgebuchten Buchungen dieser Kategorie.</summary>
    public int PendingCount { get; set; }

    public IReadOnlyList<AccountBalanceDto> Accounts { get; set; } = [];
}

/// <summary>
/// Ein einzelnes Konto mit seinem heutigen Kontostand und seiner Bilanz im
/// abgefragten Zeitraum (Monat oder Jahr).
/// </summary>
public class AccountBalanceDto
{
    public int AccountId { get; set; }

    public string Name { get; set; } = string.Empty;

    public AccountType Type { get; set; }

    public string? BankName { get; set; }

    /// <summary>Vollständige IBAN. Die Maskierung für die Anzeige übernimmt das Frontend.</summary>
    public string? Iban { get; set; }

    /// <summary>Akzentfarbe als Hex-Wert oder null für die Standardfarbe.</summary>
    public string? Color { get; set; }

    public string Currency { get; set; } = string.Empty;

    /// <summary>Saldo bei Erfassung des Kontos.</summary>
    public decimal InitialBalance { get; set; }

    /// <summary>Anfangssaldo + alle Einnahmen − alle Ausgaben, monatsübergreifend.</summary>
    public decimal CurrentBalance { get; set; }

    /// <summary>
    /// Der Kontostand „laut Bank": wie <see cref="CurrentBalance"/>, aber ohne die noch
    /// nicht abgebuchten Ausgaben. Immer <c>CurrentBalance + PendingTotal</c>.
    /// </summary>
    public decimal SettledBalance { get; set; }

    /// <summary>Summe der noch nicht abgebuchten Ausgaben dieses Kontos, monatsübergreifend.</summary>
    public decimal PendingTotal { get; set; }

    /// <summary>Anzahl der noch nicht abgebuchten Buchungen dieses Kontos.</summary>
    public int PendingCount { get; set; }

    /// <summary>Einnahmen des Monats auf diesem Konto, ohne Umbuchungen.</summary>
    public decimal Income { get; set; }

    /// <summary>Ausgaben des Monats auf diesem Konto, ohne Umbuchungen, als positiver Wert.</summary>
    public decimal Expenses { get; set; }

    /// <summary><c>Income − Expenses</c>. Die Bilanz des Kontos in diesem Monat.</summary>
    public decimal Net { get; set; }

    public int TransactionCount { get; set; }
}

/// <summary>Die Jahresbilanz über alle Konten samt Verlauf der zwölf Monate.</summary>
public class YearBalanceDto
{
    public int Year { get; set; }

    public string Currency { get; set; } = string.Empty;

    /// <summary>Einnahmen des Jahres über alle Konten, ohne Umbuchungen.</summary>
    public decimal Income { get; set; }

    /// <summary>Ausgaben des Jahres über alle Konten, ohne Umbuchungen, als positiver Wert.</summary>
    public decimal Expenses { get; set; }

    /// <summary><c>Income − Expenses</c>. Die Bilanz des Jahres.</summary>
    public decimal Net { get; set; }

    /// <summary>Durchschnittliche Bilanz je Monat, in dem es überhaupt Buchungen gab.</summary>
    public decimal AverageNet { get; set; }

    /// <summary>Bester Monat des Jahres als <c>yyyy-MM</c>, oder null ohne Buchungen.</summary>
    public string? BestMonth { get; set; }

    /// <summary>Schwächster Monat des Jahres als <c>yyyy-MM</c>, oder null ohne Buchungen.</summary>
    public string? WorstMonth { get; set; }

    /// <summary>Immer genau zwölf Einträge, von Januar bis Dezember, auch ohne Buchungen.</summary>
    public IReadOnlyList<MonthBalancePointDto> Months { get; set; } = [];
}

/// <summary>Ein Monat im Jahresverlauf.</summary>
public class MonthBalancePointDto
{
    /// <summary>Der Monat im Format <c>yyyy-MM</c>.</summary>
    public string Month { get; set; } = string.Empty;

    public decimal Income { get; set; }

    public decimal Expenses { get; set; }

    public decimal Net { get; set; }

    public int TransactionCount { get; set; }
}
