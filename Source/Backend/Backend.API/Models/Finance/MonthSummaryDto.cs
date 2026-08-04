namespace Backend.Models.Finance;

/// <summary>Kennzahlen eines Kontos für einen Abrechnungsmonat.</summary>
public class MonthSummaryDto
{
    /// <summary>Der abgefragte Monat im Format <c>yyyy-MM</c>.</summary>
    public string Month { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;

    /// <summary>Summe aller Einnahmen des Monats.</summary>
    public decimal Income { get; set; }

    /// <summary>Summe aller Ausgaben des Monats, als positiver Wert.</summary>
    public decimal Expenses { get; set; }

    /// <summary><c>Income − Expenses</c>.</summary>
    public decimal Net { get; set; }

    /// <summary>Monatsübergreifender Kontostand: Anfangssaldo + alle Einnahmen − alle Ausgaben.</summary>
    public decimal CurrentBalance { get; set; }

    /// <summary>Summe der im Monat gesetzten Kategoriebudgets.</summary>
    public decimal TotalBudget { get; set; }

    /// <summary>Ausgaben, die auf budgetierte Kategorien entfallen.</summary>
    public decimal TotalSpentBudgeted { get; set; }

    /// <summary><c>TotalBudget − TotalSpentBudgeted</c>. Negativ bedeutet Überschreitung.</summary>
    public decimal TotalRemaining { get; set; }

    /// <summary>Summe der geplanten Fixkosten des Monats.</summary>
    public decimal FixedCostsPlanned { get; set; }

    /// <summary>Summe der Buchungen, die Fixkosten-Positionen dieses Monats zugeordnet sind.</summary>
    public decimal FixedCostsBooked { get; set; }

    /// <summary>
    /// Die Fixkosten, die gegen die Einnahmen gerechnet werden: je Position die Summe ihrer
    /// Buchungen, sobald es welche gibt, sonst der geplante Betrag.
    /// </summary>
    public decimal FixedCosts { get; set; }

    /// <summary>Anzahl der Fixkosten-Positionen des Monats.</summary>
    public int FixedCostCount { get; set; }

    /// <summary>Fixkosten-Positionen ohne zugeordnete Buchung.</summary>
    public int FixedCostOpenCount { get; set; }

    /// <summary>Ausgaben des Monats ohne Fixkosten-Zuordnung.</summary>
    public decimal VariableExpenses { get; set; }

    /// <summary>
    /// Frei verfügbares Geld: <c>Income − FixedCosts − VariableExpenses</c>. Negativ bedeutet,
    /// dass die Ausgaben des Monats die Einnahmen übersteigen.
    /// </summary>
    public decimal Disposable { get; set; }

    /// <summary>Anzahl der Buchungen im Monat.</summary>
    public int TransactionCount { get; set; }

    /// <summary>Ausgaben je Kategorie, absteigend sortiert. Enthält auch „Ohne Kategorie".</summary>
    public IReadOnlyList<CategorySpendingDto> Spending { get; set; } = [];
}

/// <summary>Ausgaben einer Kategorie im Monat.</summary>
public class CategorySpendingDto
{
    /// <summary>Null steht für Buchungen ohne Kategorie.</summary>
    public int? CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public string? CategoryColor { get; set; }

    public string? CategoryIcon { get; set; }

    public decimal Amount { get; set; }

    /// <summary>Anteil an den Gesamtausgaben des Monats in Prozent (0–100, auf zwei Stellen gerundet).</summary>
    public decimal Share { get; set; }

    /// <summary>Budget der Kategorie in diesem Monat, sofern gesetzt.</summary>
    public decimal? Budget { get; set; }
}
