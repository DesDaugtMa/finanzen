namespace Backend.Services.Interfaces;

public interface ICurrentUser
{
    /// <summary>Id des aktuell authentifizierten Benutzers, oder null wenn anonym.</summary>
    int? UserId { get; }
}
