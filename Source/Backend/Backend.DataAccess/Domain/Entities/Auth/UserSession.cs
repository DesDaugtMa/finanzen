namespace Backend.Domain.Entities.Auth;

public class UserSession
{
    public Guid Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    public string SessionKey { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public string? IpAddress { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
}
