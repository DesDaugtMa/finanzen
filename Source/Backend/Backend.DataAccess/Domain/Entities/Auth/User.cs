using Backend.Domain.Entities.Finance;

namespace Backend.Domain.Entities.Auth;

public class User
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public string? PasswordHash { get; set; }

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
