using Backend.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Nutzdaten zum Anlegen und Bearbeiten eines manuell erfassten Betrags.</summary>
public class SaveDebtEntryRequest
{
    /// <summary>
    /// <c>Expense</c> heißt verliehen, <c>Income</c> heißt zurückgezahlt. Andere Werte werden
    /// abgewiesen — eine Position ohne klare Richtung würde die Summen unbrauchbar machen.
    /// </summary>
    [Required]
    [EnumDataType(typeof(TransactionType))]
    public TransactionType Direction { get; set; }

    /// <summary>Immer positiv. Die Richtung steckt in <see cref="Direction"/>.</summary>
    [Range(FinanceValidation.MinTransactionAmount, FinanceValidation.MaxAmount,
        ErrorMessage = FinanceValidation.AmountMessage)]
    public decimal Amount { get; set; }

    /// <summary>Wann das Geld geflossen ist. Ohne Angabe gilt der heutige Tag.</summary>
    public DateOnly? EntryDate { get; set; }

    [MaxLength(FinanceValidation.NoteMaxLength)]
    public string? Note { get; set; }
}
