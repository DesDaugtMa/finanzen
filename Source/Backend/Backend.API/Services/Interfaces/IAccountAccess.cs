using Backend.Domain.Entities.Finance;

namespace Backend.Services.Interfaces;

/// <summary>Prüft und liefert Konten, die dem angemeldeten Nutzer gehören.</summary>
public interface IAccountAccess
{
    /// <summary>Alle Konten des Nutzers — Grundlage jeder kontogebundenen Abfrage.</summary>
    IQueryable<Account> QueryOwned(int userId);

    /// <summary>Lädt das Konto oder wirft <c>NotFoundException</c>, wenn es nicht dem Nutzer gehört.</summary>
    Task<Account> RequireOwnedAsync(int userId, int accountId, CancellationToken ct = default);

    /// <summary>Stellt sicher, dass alle genannten Konten dem Nutzer gehören.</summary>
    Task RequireOwnedAsync(int userId, IEnumerable<int> accountIds, CancellationToken ct = default);
}
