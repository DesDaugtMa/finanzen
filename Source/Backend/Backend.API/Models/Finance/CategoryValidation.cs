namespace Backend.Models.Finance;

/// <summary>Gemeinsame Validierungsregeln für das Anlegen und Bearbeiten von Kategorien.</summary>
internal static class CategoryValidation
{
    public const int NameMaxLength = 100;

    public const int IconMaxLength = 100;

    /// <summary>Nur Bootstrap-Icon-Namen (Kleinbuchstaben, Ziffern, Bindestrich).</summary>
    public const string IconPattern = "^[a-z0-9-]+$";
    public const string IconMessage = "Das Symbol hat kein gültiges Format.";
}
