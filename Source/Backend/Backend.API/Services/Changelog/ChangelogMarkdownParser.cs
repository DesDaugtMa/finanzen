using System.Globalization;
using System.Text.RegularExpressions;
using Backend.Models.Changelog;

namespace Backend.Services.Changelog;

/// <summary>
/// Übersetzt die <c>CHANGELOG.md</c> in die Struktur, die der Zeitstrahl im Frontend braucht.
///
/// Bewusst ein eigener, eng geschnittener Parser statt einer Markdown-Bibliothek: die Datei
/// folgt einem festen, im Projekt dokumentierten Aufbau (Überschrift <c># vX.Y.Z — TT.MM.JJJJ</c>,
/// danach die Abschnitte <c>**Features:**</c>, <c>**Changes:**</c>, <c>**Bugfixes:**</c> mit
/// Aufzählungspunkten). Gebraucht wird nicht beliebiges Markdown, sondern genau diese Gliederung.
///
/// Der Parser ist absichtlich nachsichtig: Was er nicht versteht, überspringt er und meldet es
/// als Warnung. Ein Tippfehler in einem Eintrag darf niemals die ganze Seite unbenutzbar machen.
/// </summary>
public static partial class ChangelogMarkdownParser
{
    /// <summary>Datumsformat der Überschrift — dasselbe, das der changelog-entry-Skill vorgibt.</summary>
    private const string DateFormat = "dd.MM.yyyy";

    private const string FeaturesHeading = "features";
    private const string ChangesHeading = "changes";
    private const string BugfixesHeading = "bugfixes";

    /// <summary>Welcher Abschnitt gerade gefüllt wird.</summary>
    private enum Section
    {
        None,
        Features,
        Changes,
        Bugfixes
    }

    public static IReadOnlyList<ChangelogEntryDto> Parse(string markdown, ILogger logger)
    {
        var entries = new List<ParsedEntry>();
        ParsedEntry? current = null;
        var section = Section.None;
        var lineNumber = 0;

        foreach (var rawLine in SplitLines(markdown))
        {
            lineNumber++;
            var line = rawLine.Trim();

            if (line.Length == 0) continue;

            if (line.StartsWith('#'))
            {
                current = StartEntry(line, lineNumber, logger);
                section = Section.None;

                if (current is not null) entries.Add(current);
                continue;
            }

            if (current is null)
            {
                logger.LogWarning(
                    "Changelog: Zeile {LineNumber} steht vor der ersten Versionsüberschrift und wird übersprungen.",
                    lineNumber);
                continue;
            }

            var heading = ReadSectionHeading(line);
            if (heading is not null)
            {
                section = heading.Value;

                if (section == Section.None)
                    logger.LogWarning(
                        "Changelog: unbekannter Abschnitt in Zeile {LineNumber} von Version {Version} wird übersprungen.",
                        lineNumber, current.Version);

                continue;
            }

            var bullet = ReadBullet(line);
            if (bullet is not null)
            {
                AddBullet(current, section, bullet, lineNumber, logger);
                continue;
            }

            // Fließtext vor dem ersten Abschnitt ist die Zusammenfassung der Version.
            if (section == Section.None) current.SummaryLines.Add(line);
        }

        return Order(entries);
    }

    /// <summary>
    /// Beginnt eine neue Version. Eine Überschrift, die nicht dem Muster entspricht, liefert
    /// <c>null</c> — die folgenden Zeilen gehören dann zu keinem Eintrag und fallen weg.
    /// </summary>
    private static ParsedEntry? StartEntry(string line, int lineNumber, ILogger logger)
    {
        var match = VersionHeadingPattern().Match(line);

        if (!match.Success)
        {
            logger.LogWarning(
                "Changelog: Überschrift in Zeile {LineNumber} entspricht nicht dem Muster '# vX.Y.Z — TT.MM.JJJJ' und wird übersprungen.",
                lineNumber);
            return null;
        }

        var rawDate = match.Groups["date"].Value;

        if (!DateOnly.TryParseExact(rawDate, DateFormat, CultureInfo.InvariantCulture,
                DateTimeStyles.None, out var releaseDate))
        {
            logger.LogWarning(
                "Changelog: Datum in Zeile {LineNumber} ist kein gültiges Datum im Format {DateFormat} und wird übersprungen.",
                lineNumber, DateFormat);
            return null;
        }

        return new ParsedEntry(match.Groups["version"].Value, releaseDate);
    }

    /// <summary>
    /// Erkennt eine Abschnittszeile wie <c>**Features:**</c>. <c>null</c> heißt „keine
    /// Abschnittszeile“, <see cref="Section.None"/> heißt „Abschnitt, den wir nicht kennen“.
    /// </summary>
    private static Section? ReadSectionHeading(string line)
    {
        var match = SectionHeadingPattern().Match(line);
        if (!match.Success) return null;

        return match.Groups["name"].Value.ToLowerInvariant() switch
        {
            FeaturesHeading => Section.Features,
            ChangesHeading => Section.Changes,
            BugfixesHeading => Section.Bugfixes,
            _ => Section.None
        };
    }

    /// <summary>Text eines Aufzählungspunkts, oder <c>null</c>, wenn die Zeile keiner ist.</summary>
    private static string? ReadBullet(string line)
    {
        var match = BulletPattern().Match(line);
        if (!match.Success) return null;

        var text = match.Groups["text"].Value.Trim();
        return text.Length > 0 ? text : null;
    }

    private static void AddBullet(ParsedEntry entry, Section section, string text, int lineNumber, ILogger logger)
    {
        switch (section)
        {
            case Section.Features:
                entry.Features.Add(text);
                break;
            case Section.Changes:
                entry.Changes.Add(text);
                break;
            case Section.Bugfixes:
                entry.Bugfixes.Add(text);
                break;
            default:
                logger.LogWarning(
                    "Changelog: Aufzählungspunkt in Zeile {LineNumber} gehört zu keinem bekannten Abschnitt und wird übersprungen.",
                    lineNumber);
                break;
        }
    }

    /// <summary>
    /// Neueste Version zuerst. Sortiert wird nach Datum und — bei gleichem Tag — nach
    /// Versionsnummer, damit die Reihenfolge nicht davon abhängt, wo jemand den Eintrag
    /// in die Datei geschrieben hat.
    /// </summary>
    private static IReadOnlyList<ChangelogEntryDto> Order(IEnumerable<ParsedEntry> entries) =>
    [
        .. entries
            .OrderByDescending(entry => entry.ReleaseDate)
            .ThenByDescending(entry => entry.SortableVersion)
            .Select(entry => entry.ToDto())
    ];

    private static IEnumerable<string> SplitLines(string markdown) =>
        markdown.Split('\n').Select(line => line.TrimEnd('\r'));

    /// <summary>Überschrift einer Version; als Trenner sind Geviert-, Halbgeviert- und Bindestrich erlaubt.</summary>
    [GeneratedRegex(@"^#\s*[vV](?<version>\d+\.\d+\.\d+)\s*[—–-]\s*(?<date>\d{2}\.\d{2}\.\d{4})\s*$")]
    private static partial Regex VersionHeadingPattern();

    /// <summary>Abschnittszeile wie <c>**Features:**</c>; der Doppelpunkt darf innen oder außen stehen.</summary>
    [GeneratedRegex(@"^\*\*(?<name>[A-Za-zÄÖÜäöü]+):?\*\*:?$")]
    private static partial Regex SectionHeadingPattern();

    /// <summary>Aufzählungspunkt mit <c>-</c>, <c>*</c> oder <c>+</c>.</summary>
    [GeneratedRegex(@"^[-*+]\s+(?<text>.+)$")]
    private static partial Regex BulletPattern();

    /// <summary>Ein Eintrag im Aufbau — veränderlich, bis seine Zeilen gelesen sind.</summary>
    private sealed class ParsedEntry(string version, DateOnly releaseDate)
    {
        public string Version { get; } = version;

        public DateOnly ReleaseDate { get; } = releaseDate;

        /// <summary>Für die Sortierung: <c>1.10.0</c> muss über <c>1.9.0</c> stehen, nicht darunter.</summary>
        public System.Version SortableVersion { get; } =
            System.Version.TryParse(version, out var parsed) ? parsed : new System.Version(0, 0, 0);

        public List<string> SummaryLines { get; } = [];

        public List<string> Features { get; } = [];

        public List<string> Changes { get; } = [];

        public List<string> Bugfixes { get; } = [];

        public ChangelogEntryDto ToDto() => new()
        {
            Version = Version,
            ReleaseDate = ReleaseDate,
            Summary = string.Join(' ', SummaryLines),
            Features = Features,
            Changes = Changes,
            Bugfixes = Bugfixes
        };
    }
}
