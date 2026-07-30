using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Richtung einer Überweisung aus Sicht des gerade geöffneten Kontos.</summary>
public enum TransferDirection
{
    /// <summary>Geld verlässt dieses Konto.</summary>
    Outgoing = 1,

    /// <summary>Geld kommt auf diesem Konto an.</summary>
    Incoming = 2
}

/// <summary>
/// Nutzdaten einer Überweisung zwischen zwei Konten. Daraus entstehen zwei fest
/// gekoppelte Buchungen: eine Ausgabe auf dem abgebenden und eine Einnahme auf
/// dem empfangenden Konto.
/// </summary>
public class SaveTransferRequest
{
    [Range(1, int.MaxValue, ErrorMessage = "Bitte wähle ein Gegenkonto aus.")]
    public int CounterAccountId { get; set; }

    [Required]
    [EnumDataType(typeof(TransferDirection), ErrorMessage = "Die Richtung der Überweisung ist ungültig.")]
    public TransferDirection Direction { get; set; }

    [Range(FinanceValidation.MinTransactionAmount, FinanceValidation.MaxAmount,
        ErrorMessage = FinanceValidation.AmountMessage)]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(FinanceValidation.TitleMaxLength)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public DateOnly BookingDate { get; set; }

    public DateOnly? PurchaseDate { get; set; }

    /// <summary>Abrechnungsmonat beider Buchungen im Format <c>yyyy-MM</c>.</summary>
    [Required]
    public string AccountingMonth { get; set; } = string.Empty;

    [MaxLength(FinanceValidation.NoteMaxLength)]
    public string? Note { get; set; }

    /// <summary>Optionale Kategorie auf dem geöffneten Konto.</summary>
    public int? CategoryId { get; set; }

    /// <summary>Optionale Kategorie auf dem Gegenkonto. Muss zu diesem Konto gehören.</summary>
    public int? CounterCategoryId { get; set; }
}
