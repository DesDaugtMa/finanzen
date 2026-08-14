namespace Backend.Models.Changelog;

/// <summary>
/// Der gesamte Changelog, wie ihn die Anwendung anzeigt: die Versionen als Zeitstrahl,
/// neueste zuerst.
/// </summary>
public class ChangelogDto
{
    /// <summary>
    /// Die jüngste veröffentlichte Version, z. B. <c>1.0.0</c> — die Navigation zeigt sie
    /// am Changelog-Link. <c>null</c>, solange es keinen gültigen Eintrag gibt.
    /// </summary>
    public string? CurrentVersion { get; set; }

    /// <summary>Absteigend nach Veröffentlichungsdatum, bei gleichem Datum nach Version.</summary>
    public IReadOnlyList<ChangelogEntryDto> Entries { get; set; } = [];
}

/// <summary>Eine veröffentlichte Version mit dem, was sich für den Nutzer geändert hat.</summary>
public class ChangelogEntryDto
{
    /// <summary>Versionsnummer ohne führendes <c>v</c>, z. B. <c>1.0.0</c>.</summary>
    public string Version { get; set; } = string.Empty;

    public DateOnly ReleaseDate { get; set; }

    /// <summary>Ein bis zwei Sätze, die das Update zusammenfassen. Kann leer sein.</summary>
    public string Summary { get; set; } = string.Empty;

    /// <summary>Was es vorher nicht gab.</summary>
    public IReadOnlyList<string> Features { get; set; } = [];

    /// <summary>Was es schon gab und jetzt anders oder besser ist.</summary>
    public IReadOnlyList<string> Changes { get; set; } = [];

    /// <summary>Was nicht richtig funktioniert hat und behoben wurde.</summary>
    public IReadOnlyList<string> Bugfixes { get; set; } = [];
}
