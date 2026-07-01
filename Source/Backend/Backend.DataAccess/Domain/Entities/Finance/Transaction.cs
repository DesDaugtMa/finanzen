using Backend.Domain.Enums;

namespace Backend.Domain.Entities.Finance;

public class Transaction
{
    public int Id { get; set; }

    public int AccountId { get; set; }
    public Account Account { get; set; } = null!;

    public int? CategoryId { get; set; }
    public Category? Category { get; set; }

    public TransactionType Type { get; set; }

    /// <summary>Always positive. Type determines direction.</summary>
    public decimal Amount { get; set; }

    public required string Currency { get; set; }
    public required string Title { get; set; }

    public DateOnly BookingDate { get; set; }
    public DateOnly? PurchaseDate { get; set; }

    /// <summary>Day is always 1. Determines which monthly overview this transaction belongs to.</summary>
    public DateOnly AccountingMonth { get; set; }

    public string? Note { get; set; }

    /// <summary>Optional link to the paired transaction of a transfer between accounts.</summary>
    public int? LinkedTransactionId { get; set; }
    public Transaction? LinkedTransaction { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<TransactionAttachment> Attachments { get; set; } = [];
}
