using Backend.Models.Changelog;

namespace Backend.Services.Interfaces;

/// <summary>
/// Der Changelog der Anwendung. Er lebt als Markdown-Datei im Projekt und nicht in der
/// Datenbank: geschrieben wird er zur Entwicklungszeit zusammen mit der Änderung, die er
/// beschreibt — damit gehört er zum Stand der Anwendung, den er erklärt.
/// </summary>
public interface IChangelogService
{
    /// <summary>Alle veröffentlichten Versionen, neueste zuerst.</summary>
    Task<ChangelogDto> GetAsync(CancellationToken ct = default);
}
