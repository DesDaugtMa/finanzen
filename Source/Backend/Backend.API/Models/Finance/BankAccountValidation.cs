namespace Backend.Models.Finance;

/// <summary>Gemeinsame Validierungsregeln für das Anlegen und Bearbeiten von Girokonten.</summary>
internal static class BankAccountValidation
{
    /// <summary>Rohlänge inklusive der Leerzeichen, die Nutzer beim Tippen einer IBAN setzen.</summary>
    public const int IbanRawMaxLength = 42;

    public const string ColorPattern = "^#([0-9a-fA-F]{6})$";
    public const string ColorMessage = "Die Farbe muss ein Hex-Wert wie #0f766e sein.";

    public const double MinBalance = -1_000_000_000d;
    public const double MaxBalance = 1_000_000_000d;
    public const string BalanceMessage = "Der Anfangssaldo liegt außerhalb des zulässigen Bereichs.";
}
