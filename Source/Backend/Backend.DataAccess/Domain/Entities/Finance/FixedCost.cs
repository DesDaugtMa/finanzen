namespace Backend.Domain.Entities.Finance;

/// <summary>
/// Eine geplante Fixkosten-Position eines Kontos für genau einen Abrechnungsmonat.
/// Fixkosten sind bewusst monatsgebunden — derselbe Posten kann im Folgemonat einen
/// anderen Betrag haben; übernommen wird er über eine Kopie, nicht über eine Vorlage.
/// </summary>
public class FixedCost
{
    public int Id { get; set; }

    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public int? CategoryId { get; set; }
    public Category? Category { get; set; }

    /// <summary>Day is always 1. Represents the accounting month this fixed cost is planned for.</summary>
    public DateOnly Month { get; set; }

    public required string Name { get; set; }

    /// <summary>Geplanter Betrag, immer positiv. Fixkosten sind stets Ausgaben.</summary>
    public decimal Amount { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Tatsächliche Buchungen zu diesem Posten — mehrere, z. B. bei Teilzahlungen.</summary>
    public ICollection<Transaction> Transactions { get; set; } = [];
}
