namespace Backend.Models.Finance;

/// <summary>Ergebnis der Sammel-Aktion „alle offenen Buchungen als abgebucht markieren".</summary>
public class SettleResultDto
{
    /// <summary>Der bearbeitete Abrechnungsmonat im Format <c>yyyy-MM</c>.</summary>
    public string Month { get; set; } = string.Empty;

    /// <summary>Anzahl der Buchungen, die dabei auf „abgebucht" gesetzt wurden.</summary>
    public int SettledCount { get; set; }

    /// <summary>Summe der abgehakten Beträge — genau um so viel sinkt der Kontostand „laut Bank".</summary>
    public decimal SettledAmount { get; set; }
}
