using Backend.Domain.Entities.Finance;

namespace Backend.Domain.Entities.Auth;

public class User
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public required string DisplayName { get; set; }
    public string? PasswordHash { get; set; }

    /// <summary>Externer Auth-Anbieter, z. B. "Google". Null bei reiner E-Mail/Passwort-Anmeldung.</summary>
    public string? AuthProvider { get; set; }

    /// <summary>Stabile Nutzer-ID beim externen Anbieter (z. B. Google "sub").</summary>
    public string? ProviderId { get; set; }

    public bool EmailVerified { get; set; } = false;

    public int RoleId { get; set; }
    public Role Role { get; set; } = null!;

    public bool IsBlocked { get; set; } = false;
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    public ICollection<UserSession> Sessions { get; set; } = [];
    public ICollection<Account> Accounts { get; set; } = [];
    public ICollection<Category> Categories { get; set; } = [];
}
