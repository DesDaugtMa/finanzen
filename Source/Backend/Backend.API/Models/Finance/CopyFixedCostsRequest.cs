using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Übernimmt ausgewählte Fixkosten-Positionen aus einem anderen Monat.</summary>
public class CopyFixedCostsRequest
{
    /// <summary>Die zu übernehmenden Positionen. Sie müssen zum selben Konto gehören.</summary>
    [Required]
    [MinLength(1, ErrorMessage = "Bitte wähle mindestens eine Fixkosten-Position aus.")]
    public IReadOnlyList<int> FixedCostIds { get; set; } = [];
}

/// <summary>Vorschau der übernehmbaren Positionen eines Quellmonats.</summary>
public class FixedCostCopyPreviewDto
{
    /// <summary>Der Monat, in den übernommen wird (<c>yyyy-MM</c>).</summary>
    public string TargetMonth { get; set; } = string.Empty;

    /// <summary>Der gerade angezeigte Quellmonat (<c>yyyy-MM</c>), oder null, wenn es keinen gibt.</summary>
    public string? SourceMonth { get; set; }

    /// <summary>Alle Monate mit Fixkosten außer dem Zielmonat, absteigend — die Auswahl der Quelle.</summary>
    public IReadOnlyList<string> AvailableMonths { get; set; } = [];

    public string Currency { get; set; } = string.Empty;

    public IReadOnlyList<FixedCostCopyCandidateDto> Items { get; set; } = [];
}

/// <summary>Eine Position des Quellmonats, wie sie im Übernahme-Dialog erscheint.</summary>
public class FixedCostCopyCandidateDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public decimal Amount { get; set; }

    public int? CategoryId { get; set; }

    public string? CategoryName { get; set; }

    public string? CategoryColor { get; set; }

    public string? CategoryIcon { get; set; }

    /// <summary>True, wenn es im Zielmonat bereits eine Position dieses Namens gibt.</summary>
    public bool AlreadyExists { get; set; }
}
