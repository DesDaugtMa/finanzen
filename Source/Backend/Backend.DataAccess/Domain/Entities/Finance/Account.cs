using Backend.Domain.Entities.Auth;
using Backend.Domain.Enums;

namespace Backend.Domain.Entities.Finance;

public class Account
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public required string Name { get; set; }
    public AccountType Type { get; set; }
    public string? Iban { get; set; }
    public string? BankName { get; set; }
    public required string Currency { get; set; }
    public string? Color { get; set; }

    /// <summary>
    /// Saldo des Kontos zum Zeitpunkt der Erfassung in der App. Der aktuelle Kontostand
    /// ergibt sich aus diesem Wert plus allen Einnahmen minus allen Ausgaben.
    /// </summary>
    public decimal InitialBalance { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<Transaction> Transactions { get; set; } = [];
    public ICollection<Budget> Budgets { get; set; } = [];
    public ICollection<Category> Categories { get; set; } = [];
}
