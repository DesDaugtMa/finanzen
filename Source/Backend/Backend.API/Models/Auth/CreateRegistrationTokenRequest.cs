using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Auth;

public class CreateRegistrationTokenRequest
{
    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>Optionale Gültigkeitsdauer in Tagen. Null = unbegrenzt gültig.</summary>
    [Range(1, 3650)]
    public int? ExpiresInDays { get; set; }
}
