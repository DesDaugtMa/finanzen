using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Setzt oder entfernt das Budget einer Kategorie im gewählten Monat.</summary>
public class SetBudgetRequest
{
    /// <summary><c>null</c> entfernt das Budget für diesen Monat wieder.</summary>
    [Range(0d, FinanceValidation.MaxAmount, ErrorMessage = "Das Budget liegt außerhalb des zulässigen Bereichs.")]
    public decimal? Amount { get; set; }
}
