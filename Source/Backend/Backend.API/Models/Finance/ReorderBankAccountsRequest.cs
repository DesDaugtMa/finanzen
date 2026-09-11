using System.ComponentModel.DataAnnotations;
using Backend.Domain.Enums;

namespace Backend.Models.Finance;

/// <summary>
/// Die vollständige, neue Reihenfolge aller Konten einer Kontokategorie des Nutzers,
/// von oben nach unten.
/// </summary>
public class ReorderBankAccountsRequest
{
    [Required]
    [MinLength(1)]
    public int[] AccountIds { get; set; } = [];

    public AccountType AccountType { get; set; }
}
