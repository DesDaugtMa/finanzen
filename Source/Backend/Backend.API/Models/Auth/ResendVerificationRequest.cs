using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Auth;

public class ResendVerificationRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;
}
