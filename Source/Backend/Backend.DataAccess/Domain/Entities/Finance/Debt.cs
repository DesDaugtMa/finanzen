using Backend.Domain.Entities.Auth;

namespace Backend.Domain.Entities.Finance;

/// <summary>
/// Ein Schuldeintrag: ein einzelner Vorgang, bei dem der Nutzer einer Person Geld
/// geliehen hat. Der Eintrag führt keinen eigenen Betrag — was offen ist, ergibt sich aus
/// seinen Positionen: den zugeordneten Buchungen und den manuell erfassten Beträgen
/// (jeweils Ausgänge minus Eingänge). Beide zählen gleichberechtigt, denn nicht jeder
/// Verleih läuft über ein Geldkonto.
/// </summary>
/// <remarks>
/// Der Eintrag hängt am Nutzer, nicht an einem Konto: Geliehenes und Zurückgezahltes
/// laufen häufig über verschiedene Geldkonten desselben Nutzers.
/// </remarks>
public class Debt
{
    public int Id { get; set; }

    public int UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>Name der Person, die das Geld schuldet. Freitext — bewusst keine eigene Entität.</summary>
    public required string PersonName { get; set; }

    /// <summary>Worum es geht, z. B. „Urlaub Kroatien“.</summary>
    public required string Title { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Zugeordnete Buchungen aus beliebigen Geldkonten des Nutzers. Ausgaben sind
    /// verliehenes Geld, Einnahmen sind Rückzahlungen.
    /// </summary>
    public ICollection<Transaction> Transactions { get; set; } = [];

    /// <summary>
    /// Manuell erfasste Beträge ohne zugehörige Buchung. Sie gehören ausschließlich zu
    /// diesem Eintrag und werden mit ihm gelöscht.
    /// </summary>
    public ICollection<DebtEntry> Entries { get; set; } = [];
}
