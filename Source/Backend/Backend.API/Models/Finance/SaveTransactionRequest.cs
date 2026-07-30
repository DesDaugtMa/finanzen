using Backend.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Nutzdaten zum Anlegen und Bearbeiten einer Buchung.</summary>
public class SaveTransactionRequest
{
    [Required]
    [EnumDataType(typeof(TransactionType), ErrorMessage = "Die Art der Buchung ist ungültig.")]
    public TransactionType Type { get; set; }

    /// <summary>Immer positiv angeben; die Richtung steckt in <see cref="Type"/>.</summary>
    [Range(FinanceValidation.MinTransactionAmount, FinanceValidation.MaxAmount,
        ErrorMessage = FinanceValidation.AmountMessage)]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(FinanceValidation.TitleMaxLength)]
    public string Title { get; set; } = string.Empty;

    /// <summary>Muss eine Kategorie dieses Kontos sein. <c>null</c> bedeutet „ohne Kategorie".</summary>
    public int? CategoryId { get; set; }

    [Required]
    public DateOnly BookingDate { get; set; }

    public DateOnly? PurchaseDate { get; set; }

    /// <summary>Abrechnungsmonat im Format <c>yyyy-MM</c>.</summary>
    [Required]
    public string AccountingMonth { get; set; } = string.Empty;

    [MaxLength(FinanceValidation.NoteMaxLength)]
    public string? Note { get; set; }
}
