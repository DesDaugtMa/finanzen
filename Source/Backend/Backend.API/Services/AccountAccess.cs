using Backend.Domain.Entities.Finance;
using Backend.Exceptions;
using Backend.Infrastructure.Persistence;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

/// <summary>
/// Einstiegspunkt für alle kontogebundenen Finanz-Dienste. Jede Abfrage läuft
/// über die Prüfung, ob das Konto wirklich dem angemeldeten Nutzer gehört —
/// so kann kein Dienst diese Absicherung vergessen.
/// </summary>
public sealed class AccountAccess(AppDbContext context, ILogger<AccountAccess> logger) : IAccountAccess
{
    public IQueryable<Account> QueryOwned(int userId)
        => context.Accounts.Where(a => a.UserId == userId);

    public async Task<Account> RequireOwnedAsync(int userId, int accountId, CancellationToken ct = default)
    {
        var account = await QueryOwned(userId).FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account is null)
        {
            logger.LogInformation("Konto {AccountId} für Nutzer {UserId} nicht gefunden.", accountId, userId);
            throw new NotFoundException("Das Konto");
        }

        return account;
    }

    public async Task RequireOwnedAsync(int userId, IEnumerable<int> accountIds, CancellationToken ct = default)
    {
        var ids = accountIds.Distinct().ToList();
        if (ids.Count == 0)
            return;

        var found = await QueryOwned(userId).CountAsync(a => ids.Contains(a.Id), ct);

        if (found != ids.Count)
        {
            logger.LogInformation("Mindestens eines der Konten {AccountIds} gehört nicht zu Nutzer {UserId}.", ids, userId);
            throw new NotFoundException("Das Konto");
        }
    }
}
