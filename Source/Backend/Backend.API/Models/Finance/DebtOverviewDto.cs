namespace Backend.Models.Finance;

/// <summary>
/// Alle Schuldeinträge des Nutzers, gruppiert nach Person. Die Gruppierung ist die
/// eigentliche Antwort der Seite: „Wer schuldet mir wie viel?“
/// </summary>
public class DebtOverviewDto
{
    public string Currency { get; set; } = string.Empty;

    /// <summary>Summe alles Verliehenen über alle Einträge.</summary>
    public decimal TotalLent { get; set; }

    /// <summary>Summe alles Zurückgezahlten über alle Einträge.</summary>
    public decimal TotalRepaid { get; set; }

    /// <summary>Was insgesamt noch aussteht — die Leitzahl der Seite.</summary>
    public decimal TotalOutstanding { get; set; }

    public int DebtorCount { get; set; }

    public int DebtCount { get; set; }

    /// <summary>Anzahl der Einträge, bei denen noch Geld aussteht.</summary>
    public int OpenCount { get; set; }

    /// <summary>Personen mit offenem Betrag zuerst, danach nach Name.</summary>
    public IReadOnlyList<DebtorSummaryDto> Debtors { get; set; } = [];
}

/// <summary>Alle Einträge einer Person mit ihren Summen.</summary>
public class DebtorSummaryDto
{
    public string PersonName { get; set; } = string.Empty;

    public string Currency { get; set; } = string.Empty;

    public decimal LentAmount { get; set; }

    public decimal RepaidAmount { get; set; }

    public decimal OutstandingAmount { get; set; }

    public int DebtCount { get; set; }

    /// <summary>Anzahl der Einträge dieser Person, bei denen noch Geld aussteht.</summary>
    public int OpenCount { get; set; }

    public IReadOnlyList<DebtDto> Debts { get; set; } = [];
}
