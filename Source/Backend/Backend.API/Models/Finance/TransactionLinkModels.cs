using Backend.Domain.Enums;
using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Text.Json.Serialization;

namespace Backend.Models.Finance;

/// <summary>
/// Die Gegenbuchung einer Verknüpfung mit allen Angaben, die das Popup zeigt. Trägt
/// bewusst mehr Felder als <see cref="TransactionDto"/> der Liste: hier geht es darum,
/// eine Buchung eines <em>anderen</em> Kontos vollständig nachvollziehen zu können,
/// ohne dorthin zu wechseln.
/// </summary>
public class LinkedTransactionDto
{
    public int Id { get; set; }

    public int AccountId { get; set; }

    public string AccountName { get; set; } = string.Empty;

    public TransactionType Type { get; set; }

    /// <summary>Immer positiv. Die Richtung steckt in <see cref="Type"/>.</summary>
    public decimal Amount { get; set; }

    public string Currency { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string? CategoryName { get; set; }

    public string? CategoryColor { get; set; }

    public string? CategoryIcon { get; set; }

    public string? FixedCostName { get; set; }

    /// <summary>Interner Wert des Fixkosten-Monats; nach außen geht <see cref="FixedCostMonth"/>.</summary>
    [JsonIgnore]
    public DateOnly? FixedCostMonthDate { get; set; }

    /// <summary>Monat der zugeordneten Fixkosten-Position im Format <c>yyyy-MM</c>, sonst null.</summary>
    public string? FixedCostMonth => FixedCostMonthDate?.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    public DateOnly BookingDate { get; set; }

    public DateOnly? PurchaseDate { get; set; }

    /// <summary>Interner Wert des Abrechnungsmonats; nach außen geht <see cref="AccountingMonth"/>.</summary>
    [JsonIgnore]
    public DateOnly AccountingMonthDate { get; set; }

    /// <summary>Abrechnungsmonat im Format <c>yyyy-MM</c> — der Monat, in dem der Sprung landet.</summary>
    public string AccountingMonth => AccountingMonthDate.ToString("yyyy-MM", CultureInfo.InvariantCulture);

    public string? Note { get; set; }

    public bool IsPending { get; set; }
}

/// <summary>Nutzdaten zum Verknüpfen zweier Buchungen.</summary>
public class LinkTransactionRequest
{
    /// <summary>Die Buchung des anderen Kontos, mit der verknüpft werden soll.</summary>
    [Range(1, int.MaxValue, ErrorMessage = "Bitte wähle eine Buchung aus.")]
    public int CounterTransactionId { get; set; }
}

/// <summary>
/// Sucht Buchungen, die sich mit einer Buchung des geöffneten Kontos verknüpfen lassen.
/// <see cref="Type"/> und <see cref="Amount"/> beschreiben die eigene Seite — sie stammen
/// beim Bearbeiten aus der gespeicherten Buchung und beim Anlegen aus dem Formular, das
/// noch gar nichts gespeichert hat.
/// </summary>
public class LinkCandidateQuery
{
    /// <summary>Das Konto, auf dem gesucht wird. Muss ein anderes als das geöffnete sein.</summary>
    [Range(1, int.MaxValue, ErrorMessage = "Bitte wähle ein Gegenkonto aus.")]
    public int CounterAccountId { get; set; }

    /// <summary>Die Richtung der eigenen Seite. Gesucht wird jeweils die Gegenrichtung.</summary>
    [Required]
    [EnumDataType(typeof(TransactionType), ErrorMessage = "Die Art der Buchung ist ungültig.")]
    public TransactionType Type { get; set; }

    /// <summary>Der Betrag der eigenen Seite. Nur betragsgleiche Buchungen sind Kandidaten.</summary>
    [Range(FinanceValidation.MinTransactionAmount, FinanceValidation.MaxAmount,
        ErrorMessage = FinanceValidation.AmountMessage)]
    public decimal Amount { get; set; }

    /// <summary>Volltextsuche über Bezeichnung und Notiz.</summary>
    [MaxLength(200)]
    public string? Search { get; set; }

    /// <summary>
    /// Die eigene Buchung beim Bearbeiten. Sie kann nie ihr eigener Kandidat sein — die
    /// Angabe schließt sie aus, falls doch einmal beide Konten übereinstimmen sollten.
    /// </summary>
    public int? ExcludeTransactionId { get; set; }
}
