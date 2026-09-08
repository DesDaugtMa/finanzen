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

    /// <summary>
    /// Optionaler Startbetrag beim Anlegen: ist er gesetzt, entsteht zugleich die erste
    /// manuelle Position „verliehen“. Erspart den zweiten Dialog im häufigsten Fall.
    /// Beim Bearbeiten wird das Feld ignoriert — dort werden Positionen einzeln gepflegt.
    /// </summary>
    [Range(FinanceValidation.MinTransactionAmount, FinanceValidation.MaxAmount,
        ErrorMessage = FinanceValidation.AmountMessage)]
    public decimal? InitialAmount { get; set; }

    /// <summary>
    /// Datum des Startbetrags. Ohne Angabe gilt der heutige Tag. Nur zusammen mit
    /// <see cref="InitialAmount"/> von Bedeutung.
    /// </summary>
    public DateOnly? InitialDate { get; set; }
}
