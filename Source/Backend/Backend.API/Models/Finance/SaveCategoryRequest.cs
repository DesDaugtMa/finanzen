using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Nutzdaten zum Anlegen und Bearbeiten einer Kategorie — beide Fälle erwarten dieselben Felder.</summary>
public class SaveCategoryRequest
{
    [Required]
    [MaxLength(CategoryValidation.NameMaxLength)]
    public string Name { get; set; } = string.Empty;

    [RegularExpression(BankAccountValidation.ColorPattern, ErrorMessage = BankAccountValidation.ColorMessage)]
    public string? Color { get; set; }

    [MaxLength(CategoryValidation.IconMaxLength)]
    [RegularExpression(CategoryValidation.IconPattern, ErrorMessage = CategoryValidation.IconMessage)]
    public string? Icon { get; set; }
}
