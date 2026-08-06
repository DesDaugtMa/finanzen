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

    /// <summary>
    /// Optional link to the fixed cost this transaction pays. Set means the transaction
    /// counts as a fixed cost instead of a variable expense.
    /// </summary>
    public int? FixedCostId { get; set; }
    public FixedCost? FixedCost { get; set; }

    /// <summary>
    /// Optional link to the debt this transaction belongs to. An expense is money lent out,
    /// an income is a repayment. Purely informational — the transaction keeps counting in the
    /// account's monthly figures exactly as before.
    /// </summary>
    public int? DebtId { get; set; }
    public Debt? Debt { get; set; }

    /// <summary>Optional link to the paired transaction of a transfer between accounts.</summary>
    public int? LinkedTransactionId { get; set; }
    public Transaction? LinkedTransaction { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<TransactionAttachment> Attachments { get; set; } = [];
}
