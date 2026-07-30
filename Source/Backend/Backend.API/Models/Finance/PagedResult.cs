namespace Backend.Models.Finance;

/// <summary>Ein serverseitig paginierter Ausschnitt einer Liste.</summary>
public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; set; } = [];

    /// <summary>1-basierte Seitennummer.</summary>
    public int Page { get; set; }

    public int PageSize { get; set; }

    /// <summary>Gesamtzahl der Treffer über alle Seiten hinweg.</summary>
    public int TotalCount { get; set; }

    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}
