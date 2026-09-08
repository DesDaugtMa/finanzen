namespace Backend.Models.Finance;

/// <summary>
/// Auswertungen eines Kontos für einen Abrechnungsmonat. Ergänzt <see cref="MonthSummaryDto"/>
/// um die Kennzahlen, die einen Zeitbezug haben (Verlauf, Resttage, Hochrechnung) — die reinen
/// Monatssummen bleiben bewusst dort, damit keine Zahl an zwei Stellen gerechnet wird.
/// </summary>
public class AccountStatisticsDto
{
    /// <summary>Der abgefragte Monat im Format <c>yyyy-MM</c>.</summary>
    public string Month { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;

    /// <summary>Anzahl der Tage des Monats — Bezugsgröße für Verlauf und Resttage.</summary>
    public int DaysInMonth { get; set; }

    /// <summary>Die Lage des Monats zum heutigen Tag. Steuert, welche Kennzahlen überhaupt eine Aussage haben.</summary>
    public MonthPosition Position { get; set; }

    /// <summary>
    /// Der Tag des Monats, an dem „heute" steht (1–31). <c>null</c>, wenn der Monat nicht der
    /// laufende ist.
    /// </summary>
    public int? CurrentDay { get; set; }

    public DailyAllowanceDto DailyAllowance { get; set; } = new();

    public ForecastDto Forecast { get; set; } = new();

    /// <summary>Ein Punkt je Tag des Monats, aufsteigend. Immer <see cref="DaysInMonth"/> Einträge.</summary>
    public IReadOnlyList<BalancePointDto> Trend { get; set; } = [];

    /// <summary>Geplante gegen tatsächliche Ausgaben je Kategorie.</summary>
    public IReadOnlyList<PlanComparisonItemDto> PlanComparison { get; set; } = [];

    /// <summary>Summe aller geplanten Beträge: Budgets plus geplante Fixkosten.</summary>
    public decimal PlannedTotal { get; set; }

    /// <summary>Summe aller tatsächlichen Ausgaben des Monats.</summary>
    public decimal ActualTotal { get; set; }
}

/// <summary>Die Lage eines Abrechnungsmonats relativ zum heutigen Tag.</summary>
public enum MonthPosition
{
    /// <summary>Der Monat ist vorbei — es gibt nichts mehr hochzurechnen.</summary>
    Past = 1,

    /// <summary>Der laufende Monat: ein Teil ist vorbei, ein Teil steht noch aus.</summary>
    Current = 2,

    /// <summary>Der Monat hat noch nicht begonnen.</summary>
    Future = 3
}

/// <summary>Worauf sich der Betrag „pro Tag" bezieht.</summary>
public enum DailyAllowanceMode
{
    /// <summary>Verteilt auf die verbleibenden Tage des laufenden Monats, heute eingeschlossen.</summary>
    RemainingDays = 1,

    /// <summary>Verteilt auf alle Tage eines noch nicht begonnenen Monats.</summary>
    FullMonth = 2,

    /// <summary>Kein Spielraum mehr, sondern die tatsächlich erreichten Ausgaben pro Tag.</summary>
    PastAverage = 3
}

/// <summary>
/// Wie viel pro Tag noch ausgegeben werden kann, ohne den Monat im Minus zu beenden:
/// der Kontostand abzüglich der noch offenen Fixkosten, verteilt auf die restlichen Tage.
/// </summary>
public class DailyAllowanceDto
{
    /// <summary>
    /// Der Betrag pro Tag. Nach unten bei <c>0</c> begrenzt — einen negativen Spielraum gibt es
    /// nicht. Bei <see cref="DailyAllowanceMode.PastAverage"/> stattdessen die tatsächlichen
    /// Ausgaben pro Tag, dann immer positiv.
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>Der Kontostand, auf dem die Rechnung aufsetzt (inklusive noch nicht abgebuchter Ausgaben).</summary>
    public decimal Balance { get; set; }

    /// <summary>
    /// Die Restverpflichtung aus den Fixkosten des Monats: je Position <c>max(0, geplant − gebucht)</c>.
    /// Bereits gebuchte Fixkosten sind im Kontostand schon abgezogen und zählen deshalb nicht erneut.
    /// </summary>
    public decimal OpenFixedCosts { get; set; }

    /// <summary>
    /// <c>Balance − OpenFixedCosts</c>, ungekappt. Negativ bedeutet: der Kontostand deckt die
    /// offenen Fixkosten nicht mehr.
    /// </summary>
    public decimal Available { get; set; }

    /// <summary>Die Tage, auf die <see cref="Available"/> verteilt wird. Nie <c>0</c>.</summary>
    public int Days { get; set; }

    public DailyAllowanceMode Mode { get; set; }
}

/// <summary>
/// Das erwartete Ergebnis am Monatsende: was von den Einnahmen übrig bleibt, nachdem die
/// Fixkosten und die hochgerechneten variablen Ausgaben abgezogen sind.
/// </summary>
public class ForecastDto
{
    /// <summary>
    /// <c>Einnahmen − Fixkosten − bisherige variable Ausgaben − erwarteter Rest</c>. Kann negativ
    /// sein; anders als beim frei verfügbaren Geld ist ein Minus hier die eigentliche Aussage.
    /// </summary>
    public decimal Amount { get; set; }

    /// <summary>Die für den Rest des Monats erwarteten variablen Ausgaben.</summary>
    public decimal ExpectedRemainingExpenses { get; set; }

    /// <summary>Bisherige variable Ausgaben pro vergangenem Tag — die Grundlage der Hochrechnung.</summary>
    public decimal DailyAverageExpenses { get; set; }

    /// <summary>Die Tage nach heute, für die hochgerechnet wird.</summary>
    public int RemainingDays { get; set; }

    /// <summary>
    /// <c>false</c>, wenn nichts hochgerechnet wurde — bei einem abgeschlossenen Monat ist
    /// <see cref="Amount"/> dann das tatsächliche Ergebnis.
    /// </summary>
    public bool IsProjected { get; set; }
}

/// <summary>Ein Tag im Verlauf des Monats.</summary>
public class BalancePointDto
{
    /// <summary>Tag des Monats, 1-basiert.</summary>
    public int Day { get; set; }

    /// <summary>Das Datum als <c>yyyy-MM-dd</c>.</summary>
    public string Date { get; set; } = string.Empty;

    /// <summary>Einnahmen dieses Tages.</summary>
    public decimal Income { get; set; }

    /// <summary>Ausgaben dieses Tages, als positiver Wert.</summary>
    public decimal Expenses { get; set; }

    /// <summary>Bilanz des Monats bis einschließlich dieses Tages. Startet bei <c>0</c>.</summary>
    public decimal Value { get; set; }

    /// <summary><c>true</c>, wenn an diesem Tag mindestens eine Buchung liegt.</summary>
    public bool HasBookings { get; set; }
}

/// <summary>Geplante gegen tatsächliche Ausgaben einer Kategorie.</summary>
public class PlanComparisonItemDto
{
    /// <summary>Null steht für Buchungen ohne Kategorie.</summary>
    public int? CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public string? CategoryColor { get; set; }

    public string? CategoryIcon { get; set; }

    /// <summary>Budget der Kategorie in diesem Monat, sofern gesetzt.</summary>
    public decimal Budget { get; set; }

    /// <summary>Geplante Fixkosten dieser Kategorie in diesem Monat.</summary>
    public decimal FixedCosts { get; set; }

    /// <summary><c>Budget + FixedCosts</c> — der geplante Rahmen der Kategorie.</summary>
    public decimal Planned { get; set; }

    /// <summary>Tatsächliche Ausgaben der Kategorie im Monat.</summary>
    public decimal Actual { get; set; }

    /// <summary><c>Planned − Actual</c>. Negativ bedeutet Überschreitung.</summary>
    public decimal Difference { get; set; }
}
