namespace Backend.Models.Finance;

/// <summary>Eine Kategorie eines Kontos. Gilt monatsübergreifend.</summary>
public class CategoryDto
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>Akzentfarbe als Hex-Wert (z. B. <c>#0f766e</c>) oder null für die Standardfarbe.</summary>
    public string? Color { get; set; }

    /// <summary>Bootstrap-Icon-Name ohne Präfix, z. B. <c>cart</c>.</summary>
    public string? Icon { get; set; }

    /// <summary>Anzahl aller Buchungen dieser Kategorie über alle Monate — Grundlage für die Löschwarnung.</summary>
    public int TransactionCount { get; set; }

    public DateTime CreatedAt { get; set; }
}
