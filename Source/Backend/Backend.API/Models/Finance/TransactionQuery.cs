using Backend.Domain.Enums;
using System.ComponentModel.DataAnnotations;

namespace Backend.Models.Finance;

/// <summary>Sortierkriterien der Transaktionsliste.</summary>
public enum TransactionSort
{
    BookingDate = 1,
    Amount = 2,
    Category = 3,
    Title = 4
}

public enum SortDirection
{
    Ascending = 1,
    Descending = 2
}

/// <summary>Filter, Sortierung und Seitenausschnitt der Transaktionsliste eines Monats.</summary>
public class TransactionQuery
{
    /// <summary>Abrechnungsmonat im Format <c>yyyy-MM</c>.</summary>
    [Required]
    public string Month { get; set; } = string.Empty;

    /// <summary>Volltextsuche über Titel und Notiz.</summary>
    [MaxLength(200)]
    public string? Search { get; set; }

    /// <summary>Einschränkung auf bestimmte Kategorien. Leer bedeutet keine Einschränkung.</summary>
    public int[]? CategoryIds { get; set; }

    /// <summary>Bezieht Buchungen ohne Kategorie zusätzlich zu <see cref="CategoryIds"/> ein.</summary>
    public bool IncludeUncategorized { get; set; }

    /// <summary>Einschränkung auf Einnahmen oder Ausgaben. Null bedeutet beides.</summary>
    public TransactionType? Type { get; set; }

    public TransactionSort Sort { get; set; } = TransactionSort.BookingDate;

    public SortDirection Direction { get; set; } = SortDirection.Descending;

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, MaxPageSize)]
    public int PageSize { get; set; } = 25;

    public const int MaxPageSize = 100;
}
