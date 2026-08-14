using Backend.Config;
using Backend.Exceptions;
using Backend.Models.Changelog;
using Backend.Services.Changelog;
using Backend.Services.Interfaces;

namespace Backend.Services;

/// <summary>
/// Liest die <c>CHANGELOG.md</c> und liefert sie als Zeitstrahl aus.
///
/// Der Dienst ist ein Singleton mit Zwischenspeicher: die Datei ändert sich nur mit einer
/// neuen Auslieferung, sie bei jedem Seitenaufruf erneut von der Platte zu lesen und zu
/// zerlegen wäre reine Arbeit ohne Nutzen. Der Änderungszeitstempel der Datei entscheidet,
/// wann neu gelesen wird — so wirkt eine Änderung auch ohne Neustart der Anwendung.
/// </summary>
public sealed class ChangelogService(
    AppSettings appSettings,
    ILogger<ChangelogService> logger) : IChangelogService, IDisposable
{
    /// <summary>Ein Lauf nach vorne genügt: parallele Anfragen warten, statt dieselbe Datei mehrfach zu zerlegen.</summary>
    private readonly SemaphoreSlim gate = new(1, 1);

    private ChangelogDto? cached;
    private DateTime cachedFileTimestampUtc;

    public async Task<ChangelogDto> GetAsync(CancellationToken ct = default)
    {
        var path = ResolveFilePath();
        var timestamp = ReadTimestamp(path);

        if (TryGetCached(timestamp, out var current)) return current;

        await gate.WaitAsync(ct);

        try
        {
            // Zweite Prüfung innerhalb der Sperre: ein paralleler Aufruf kann inzwischen
            // fertig geworden sein.
            if (TryGetCached(timestamp, out current)) return current;

            var parsed = await LoadAsync(path, ct);

            cached = parsed;
            cachedFileTimestampUtc = timestamp;

            return parsed;
        }
        finally
        {
            gate.Release();
        }
    }

    private bool TryGetCached(DateTime timestamp, out ChangelogDto entry)
    {
        entry = cached!;
        return cached is not null && cachedFileTimestampUtc == timestamp;
    }

    private async Task<ChangelogDto> LoadAsync(string path, CancellationToken ct)
    {
        var markdown = await File.ReadAllTextAsync(path, ct);
        var entries = ChangelogMarkdownParser.Parse(markdown, logger);

        if (entries.Count == 0)
            logger.LogWarning("Changelog: {Path} enthält keinen gültigen Eintrag.", path);
        else
            logger.LogDebug("Changelog: {Count} Versionen aus {Path} gelesen.", entries.Count, path);

        return new ChangelogDto
        {
            CurrentVersion = entries.Count > 0 ? entries[0].Version : null,
            Entries = entries
        };
    }

    /// <summary>
    /// Der Änderungszeitpunkt der Datei — er ist zugleich der Schlüssel des Zwischenspeichers.
    /// Fehlt die Datei, ist das ein Auslieferungsfehler und keine leere Antwort: der Nutzer
    /// bekommt eine klare Meldung statt einer Seite, die stillschweigend nichts zeigt.
    /// </summary>
    private DateTime ReadTimestamp(string path)
    {
        var file = new FileInfo(path);

        if (!file.Exists)
        {
            logger.LogError("Changelog: Datei {Path} wurde nicht gefunden.", path);
            throw new NotFoundException("Der Changelog");
        }

        return file.LastWriteTimeUtc;
    }

    /// <summary>
    /// Ein relativer Pfad wird gegen das Anwendungsverzeichnis aufgelöst. Dorthin kopiert das
    /// Projekt die <c>CHANGELOG.md</c> aus dem Repository-Wurzelverzeichnis beim Bauen — in
    /// der Entwicklung wie in der Veröffentlichung derselbe Ort.
    /// </summary>
    private string ResolveFilePath()
    {
        var configured = appSettings.Changelog.FilePath;

        return Path.IsPathRooted(configured)
            ? configured
            : Path.Combine(AppContext.BaseDirectory, configured);
    }

    public void Dispose() => gate.Dispose();
}
