using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

public class UpdateBankAccountRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(200)]
    public string? BankName { get; set; }

    /// <summary>Darf Leerzeichen enthalten; das Format wird nach der Normalisierung geprüft.</summary>
    [MaxLength(BankAccountValidation.IbanRawMaxLength)]
    public string? Iban { get; set; }

    [RegularExpression(BankAccountValidation.ColorPattern, ErrorMessage = BankAccountValidation.ColorMessage)]
    public string? Color { get; set; }

    [Range(BankAccountValidation.MinBalance, BankAccountValidation.MaxBalance,
        ErrorMessage = BankAccountValidation.BalanceMessage)]
    public decimal InitialBalance { get; set; }
}
