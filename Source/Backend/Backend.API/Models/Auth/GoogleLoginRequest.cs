using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Auth;

public class GoogleLoginRequest
{
    [Required]
    public string IdToken { get; set; } = string.Empty;

    /// <summary>Optionaler Registrierungs-Token für neue Benutzer (invite-only).</summary>
    public string? RegistrationToken { get; set; }
}
