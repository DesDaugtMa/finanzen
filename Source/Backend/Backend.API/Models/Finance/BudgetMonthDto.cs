namespace Backend.Models.Finance;

/// <summary>Alle Kategorien eines Kontos mit ihrem Budget und Verbrauch im gewählten Monat.</summary>
public class BudgetMonthDto
{
    /// <summary>Der abgefragte Monat im Format <c>yyyy-MM</c>.</summary>
    public string Month { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;

    public IReadOnlyList<BudgetLineDto> Items { get; set; } = [];

    /// <summary>Summe der gesetzten Budgets. Vorschläge zählen bewusst nicht mit.</summary>
    public decimal TotalBudget { get; set; }

    /// <summary>Summe der Ausgaben über alle Kategorien inklusive der nicht budgetierten.</summary>
    public decimal TotalSpent { get; set; }

    /// <summary>Summe der Ausgaben, die auf budgetierte Kategorien entfallen.</summary>
    public decimal TotalSpentBudgeted { get; set; }

    /// <summary><c>TotalBudget − TotalSpentBudgeted</c>. Negativ bedeutet Überschreitung.</summary>
    public decimal TotalRemaining { get; set; }

    /// <summary>Monat, aus dem die Vorschläge stammen (<c>yyyy-MM</c>), oder null wenn es keine gibt.</summary>
    public string? SuggestionSourceMonth { get; set; }

    /// <summary>True, wenn mindestens eine Kategorie ohne Budget einen Vorschlag aus dem Vormonat hat.</summary>
    public bool HasSuggestions { get; set; }
}

/// <summary>Eine Kategorie-Zeile im Budget-Tab.</summary>
public class BudgetLineDto
{
    public int CategoryId { get; set; }

    public string CategoryName { get; set; } = string.Empty;

    public string? CategoryColor { get; set; }

    public string? CategoryIcon { get; set; }

    /// <summary>Gesetztes Budget des Monats oder null, wenn für diesen Monat keines hinterlegt ist.</summary>
    public decimal? Amount { get; set; }

    /// <summary>
    /// Unverbindlicher Vorschlag aus dem Vormonat. Nur gesetzt, wenn <see cref="Amount"/> null ist —
    /// er wird erst durch ausdrückliches Übernehmen gespeichert.
    /// </summary>
    public decimal? SuggestedAmount { get; set; }

    /// <summary>Summe der Ausgaben dieser Kategorie im Monat (Einnahmen zählen nicht gegen ein Budget).</summary>
    public decimal Spent { get; set; }

    /// <summary><c>Amount − Spent</c> oder null ohne Budget. Negativ bedeutet Überschreitung.</summary>
    public decimal? Remaining { get; set; }
}
