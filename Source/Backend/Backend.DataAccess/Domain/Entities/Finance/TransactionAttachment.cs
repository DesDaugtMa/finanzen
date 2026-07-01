namespace Backend.Domain.Entities.Finance;

public class TransactionAttachment
{
    public int Id { get; set; }

    public int TransactionId { get; set; }
    public Transaction Transaction { get; set; } = null!;

    public required string FileName { get; set; }
    public required string ContentType { get; set; }
    public required string StoragePath { get; set; }
    public long FileSize { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
