namespace Backend.Domain.Entities.Auth;

public class PasswordResetToken
{
    public Guid Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public required string Token { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public bool IsUsed { get; set; } = false;
}
