using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Übernimmt die Kategorien eines anderen Kontos des Nutzers.</summary>
public class CopyCategoriesRequest
{
    [Range(1, int.MaxValue)]
    public int SourceAccountId { get; set; }
}
