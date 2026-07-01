namespace Backend.Models.Auth;

public class SessionDto
{
    public Guid Id { get; set; }
    public string? UserAgent { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastSeenAt { get; set; }
    public DateTime ExpiresAt { get; set; }

    /// <summary>True, wenn diese Session zum aktuellen Refresh-Token gehört.</summary>
    public bool IsCurrent { get; set; }
}
