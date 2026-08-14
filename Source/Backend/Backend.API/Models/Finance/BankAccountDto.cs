using Backend.Domain.Enums;

namespace Backend.Models.Finance;

/// <summary>Ein Konto des angemeldeten Nutzers inklusive berechnetem Kontostand.</summary>
public class BankAccountDto
{
    public int Id { get; set; }

    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Kontokategorie. Sie gruppiert die Konten in der Übersicht und trennt das
    /// Zahlungsvermögen (Girokonten) vom Anlagevermögen (Depot, Crypto-Wallet).
    /// </summary>
    public AccountType Type { get; set; }

    public string? BankName { get; set; }

    /// <summary>Vollständige IBAN. Die Maskierung für die Anzeige übernimmt das Frontend.</summary>
    public string? Iban { get; set; }

    /// <summary>Akzentfarbe als Hex-Wert (z. B. <c>#0f766e</c>) oder null für die Standardfarbe.</summary>
    public string? Color { get; set; }

    public string Currency { get; set; } = string.Empty;

    /// <summary>Saldo bei Erfassung des Kontos.</summary>
    public decimal InitialBalance { get; set; }

    /// <summary>Anfangssaldo + Summe aller Einnahmen − Summe aller Ausgaben.</summary>
    public decimal CurrentBalance { get; set; }

    public DateTime CreatedAt { get; set; }
}
