namespace Backend.Domain.Entities.Finance;

/// <summary>
/// Kategorie eines Kontos. Kategorien sind kontogebunden und gelten monatsübergreifend;
/// die monatlichen Budgets dazu hängen an <see cref="Budget"/>.
/// </summary>
public class Category
{
    public int Id { get; set; }

    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public required string Name { get; set; }
    public string? Color { get; set; }

    /// <summary>Name eines Bootstrap-Icons ohne Präfix, z. B. <c>cart</c>.</summary>
    public string? Icon { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
}
