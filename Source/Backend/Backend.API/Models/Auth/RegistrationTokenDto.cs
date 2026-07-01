namespace Backend.Models.Auth;

public class RegistrationTokenDto
{
    public string Token { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public bool IsUsed { get; set; }
}
