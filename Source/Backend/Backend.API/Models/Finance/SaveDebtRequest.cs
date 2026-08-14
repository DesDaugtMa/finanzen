using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Nutzdaten zum Anlegen und Bearbeiten eines Schuldeintrags.</summary>
public class SaveDebtRequest
{
    /// <summary>Name der Person, die das Geld schuldet.</summary>
    [Required]
    [MaxLength(FinanceValidation.DebtPersonNameMaxLength)]
    public string PersonName { get; set; } = string.Empty;

    /// <summary>Worum es geht, z. B. „Urlaub Kroatien“.</summary>
    [Required]
    [MaxLength(FinanceValidation.DebtTitleMaxLength)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(FinanceValidation.NoteMaxLength)]
    public string? Note { get; set; }
}
