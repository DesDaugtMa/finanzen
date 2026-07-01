using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Auth;

public class RefreshTokenRequest
{
    [Required]
    public string RefreshToken { get; set; } = string.Empty;
}
