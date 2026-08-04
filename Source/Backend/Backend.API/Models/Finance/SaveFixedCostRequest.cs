using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Nutzdaten zum Anlegen und Bearbeiten einer Fixkosten-Position.</summary>
public class SaveFixedCostRequest
{
    [Required]
    [MaxLength(FinanceValidation.FixedCostNameMaxLength)]
    public string Name { get; set; } = string.Empty;

    /// <summary>Geplanter Betrag, immer positiv — Fixkosten sind stets Ausgaben.</summary>
    [Range(FinanceValidation.MinTransactionAmount, FinanceValidation.MaxAmount,
        ErrorMessage = FinanceValidation.AmountMessage)]
    public decimal Amount { get; set; }

    /// <summary>Muss eine Kategorie dieses Kontos sein. <c>null</c> bedeutet „ohne Kategorie".</summary>
    public int? CategoryId { get; set; }

    [MaxLength(FinanceValidation.NoteMaxLength)]
    public string? Note { get; set; }
}
