using Backend.Domain.Entities.Finance;
using Backend.Domain.Enums;
using Backend.Exceptions;
using Backend.Infrastructure.Persistence;
using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Backend.ValueObjects;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Backend.Services;

public sealed class TransactionService(
    AppDbContext context,
    IAccountAccess accountAccess,
    ILogger<TransactionService> logger) : ITransactionService
{
    private const int MoneyScale = 2;

    public async Task<PagedResult<TransactionDto>> ListAsync(int userId, int accountId, TransactionQuery query, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var month = AccountingMonth.Parse(query.Month);
        var filtered = ApplyFilters(QueryOfAccount(accountId).Where(t => t.AccountingMonth == month.ToDateOnly()), query);

        var totalCount = await filtered.CountAsync(ct);

        var pageSize = Math.Clamp(query.PageSize, 1, TransactionQuery.MaxPageSize);
        var page = await ResolvePageAsync(filtered, query, pageSize, ct);

        var items = await ApplySorting(filtered, query)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(ProjectToDto)
            .ToListAsync(ct);

        return new PagedResult<TransactionDto>
        {
            Items = items.Select(RoundAmount).ToList(),
            Page = page,
            PageSize = pageSize,
            TotalCount = totalCount
        };
    }

    public async Task<TransactionDto> GetAsync(int userId, int accountId, int transactionId, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        return await GetDtoAsync(accountId, transactionId, ct);
    }

    public async Task<TransactionDto> CreateAsync(int userId, int accountId, SaveTransactionRequest request, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        await EnsureCategoryBelongsToAccountAsync(accountId, request.CategoryId, ct);
        await EnsureFixedCostIsAssignableAsync(accountId, request, ct);
        EnsurePendingIsAllowed(account, request);

        var transaction = new Transaction
        {
            IsPending = request.IsPending,
            AccountId = accountId,
            Currency = account.Currency,
            Type = request.Type,
            Amount = Round(request.Amount),
            Title = NormalizeTitle(request.Title),
            CategoryId = request.CategoryId,
            FixedCostId = request.FixedCostId,
            BookingDate = request.BookingDate,
            PurchaseDate = request.PurchaseDate,
            AccountingMonth = AccountingMonth.Parse(request.AccountingMonth).ToDateOnly(),
            Note = NormalizeOptional(request.Note)
        };

        context.Transactions.Add(transaction);
        await context.SaveChangesAsync(ct);

        logger.LogInformation("Buchung {TransactionId} in Konto {AccountId} angelegt.", transaction.Id, accountId);

        return await GetDtoAsync(accountId, transaction.Id, ct);
    }

    public async Task<TransactionDto> UpdateAsync(int userId, int accountId, int transactionId, SaveTransactionRequest request, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        await EnsureCategoryBelongsToAccountAsync(accountId, request.CategoryId, ct);
        await EnsureFixedCostIsAssignableAsync(accountId, request, ct);
        EnsurePendingIsAllowed(account, request);

        var transaction = await FindAsync(accountId, transactionId, ct);

        EnsureLinkStaysValid(transaction, request);

        transaction.IsPending = request.IsPending;
        transaction.Type = request.Type;
        transaction.Amount = Round(request.Amount);
        transaction.Title = NormalizeTitle(request.Title);
        transaction.CategoryId = request.CategoryId;
        transaction.FixedCostId = request.FixedCostId;
        transaction.BookingDate = request.BookingDate;
        transaction.PurchaseDate = request.PurchaseDate;
        transaction.AccountingMonth = AccountingMonth.Parse(request.AccountingMonth).ToDateOnly();
        transaction.Note = NormalizeOptional(request.Note);

        await context.SaveChangesAsync(ct);

        logger.LogInformation("Buchung {TransactionId} in Konto {AccountId} aktualisiert.", transactionId, accountId);

        return await GetDtoAsync(accountId, transactionId, ct);
    }

    public async Task DeleteAsync(int userId, int accountId, int transactionId, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var transaction = await FindAsync(accountId, transactionId, ct);
        var counterpart = await LoadCounterpartAsync(transaction, ct);

        // Beide Seiten sind eigenständige Buchungen: Gelöscht wird nur die gewählte, die
        // Gegenbuchung verliert lediglich ihre Verknüpfung. Sie mit zu löschen hieße, eine
        // unabhängig erfasste Buchung eines anderen Kontos ungefragt zu entfernen.
        if (counterpart is not null)
        {
            // Erst die Verweise lösen, damit die Selbstreferenz das Löschen nicht blockiert.
            transaction.LinkedTransactionId = null;
            counterpart.LinkedTransactionId = null;
            await context.SaveChangesAsync(ct);
        }

        context.Transactions.Remove(transaction);
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Buchung {TransactionId} in Konto {AccountId} gelöscht (Verknüpfung gelöst: {WasLinked}).",
            transactionId, accountId, counterpart is not null);
    }

    public async Task<TransactionDto> SettleAsync(int userId, int accountId, int transactionId, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var transaction = await FindAsync(accountId, transactionId, ct);

        // Bewusst kein Fehler, wenn die Buchung schon abgebucht ist: das Ergebnis ist genau
        // das gewünschte, und zwei Klicks kurz hintereinander sollen den Nutzer nicht anfahren.
        if (transaction.IsPending)
        {
            transaction.IsPending = false;
            await context.SaveChangesAsync(ct);

            logger.LogInformation(
                "Buchung {TransactionId} in Konto {AccountId} als abgebucht markiert.", transactionId, accountId);
        }

        return await GetDtoAsync(accountId, transactionId, ct);
    }

    public async Task<SettleResultDto> SettleMonthAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var pending = await QueryOfAccount(accountId)
            .Where(t => t.IsPending && t.AccountingMonth == month.ToDateOnly())
            .ToListAsync(ct);

        // Die Summe steht vor dem Umschalten fest — danach findet die Abfrage nichts mehr,
        // und der Nutzer soll trotzdem erfahren, um wie viel sein Stand „laut Bank" fällt.
        var settledAmount = Round(pending.Sum(t => t.Amount));

        foreach (var transaction in pending)
            transaction.IsPending = false;

        if (pending.Count > 0)
            await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "{Count} offene Buchungen in Konto {AccountId} für Monat {Month} als abgebucht markiert.",
            pending.Count, accountId, month);

        return new SettleResultDto
        {
            Month = month.ToString(),
            SettledCount = pending.Count,
            SettledAmount = settledAmount
        };
    }

    public async Task<LinkedTransactionDto> GetLinkAsync(int userId, int accountId, int transactionId, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var transaction = await FindAsync(accountId, transactionId, ct);

        if (transaction.LinkedTransactionId is null)
            throw new NotFoundException("Die verknüpfte Buchung");

        return await GetLinkedDtoAsync(transaction.LinkedTransactionId.Value, ct);
    }

    public async Task<IReadOnlyList<LinkedTransactionDto>> ListLinkCandidatesAsync(
        int userId, int accountId, LinkCandidateQuery query, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        if (query.CounterAccountId == accountId)
            throw new BusinessRuleException("Eine Verknüpfung braucht zwei verschiedene Konten.");

        var counterAccount = await accountAccess.RequireOwnedAsync(userId, query.CounterAccountId, ct);

        if (!string.Equals(account.Currency, counterAccount.Currency, StringComparison.OrdinalIgnoreCase))
            throw new CurrencyMismatchException(account.Currency, counterAccount.Currency);

        var wantedType = Opposite(query.Type);
        var wantedAmount = Round(query.Amount);

        var candidates = QueryOfAccount(counterAccount.Id)
            .Where(t => t.LinkedTransactionId == null
                        && t.Type == wantedType
                        && t.Amount == wantedAmount);

        if (query.ExcludeTransactionId is { } excluded)
            candidates = candidates.Where(t => t.Id != excluded);

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var pattern = $"%{query.Search.Trim()}%";
            candidates = candidates.Where(t => EF.Functions.ILike(t.Title, pattern)
                                               || (t.Note != null && EF.Functions.ILike(t.Note, pattern)));
        }

        // Bewusst über alle Monate: Die Gegenbuchung einer Umbuchung landet häufig erst im
        // Folgemonat auf dem Konto. Die Obergrenze hält die Auswahlliste trotzdem überschaubar.
        return await candidates
            .OrderByDescending(t => t.BookingDate)
            .ThenByDescending(t => t.Id)
            .Take(FinanceValidation.AssignableTransactionLimit)
            .Select(ProjectToLinkedDto)
            .ToListAsync(ct);
    }

    public async Task<LinkedTransactionDto> LinkAsync(
        int userId, int accountId, int transactionId, LinkTransactionRequest request, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var transaction = await FindAsync(accountId, transactionId, ct);

        var counterpart = await context.Transactions
            .FirstOrDefaultAsync(t => t.Id == request.CounterTransactionId, ct)
            ?? throw new NotFoundException("Die zu verknüpfende Buchung");

        var counterAccount = await accountAccess.RequireOwnedAsync(userId, counterpart.AccountId, ct);

        EnsureLinkIsAllowed(transaction, counterpart, account, counterAccount);

        transaction.LinkedTransactionId = counterpart.Id;
        counterpart.LinkedTransactionId = transaction.Id;
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Buchung {TransactionId} (Konto {AccountId}) mit Buchung {CounterTransactionId} (Konto {CounterAccountId}) verknüpft.",
            transaction.Id, account.Id, counterpart.Id, counterAccount.Id);

        return await GetLinkedDtoAsync(counterpart.Id, ct);
    }

    public async Task UnlinkAsync(int userId, int accountId, int transactionId, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var transaction = await FindAsync(accountId, transactionId, ct);
        var counterpart = await LoadCounterpartAsync(transaction, ct);

        // Kein Fehler, wenn gar keine Verknüpfung besteht: Das Ergebnis ist genau das
        // gewünschte, und ein zweiter Klick soll den Nutzer nicht anfahren.
        if (transaction.LinkedTransactionId is null)
            return;

        transaction.LinkedTransactionId = null;

        if (counterpart is not null)
            counterpart.LinkedTransactionId = null;

        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Verknüpfung der Buchung {TransactionId} in Konto {AccountId} gelöst.", transactionId, accountId);
    }

    // --- Abfragen -------------------------------------------------------

    private IQueryable<Transaction> QueryOfAccount(int accountId)
        => context.Transactions.Where(t => t.AccountId == accountId);

    private static IQueryable<Transaction> ApplyFilters(IQueryable<Transaction> query, TransactionQuery filter)
    {
        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var pattern = $"%{filter.Search.Trim()}%";
            query = query.Where(t => EF.Functions.ILike(t.Title, pattern)
                                     || (t.Note != null && EF.Functions.ILike(t.Note, pattern)));
        }

        if (filter.Type is not null)
            query = query.Where(t => t.Type == filter.Type);

        var categoryIds = filter.CategoryIds?.Where(id => id > 0).Distinct().ToArray() ?? [];

        if (categoryIds.Length > 0 && filter.IncludeUncategorized)
            query = query.Where(t => t.CategoryId == null || categoryIds.Contains(t.CategoryId.Value));
        else if (categoryIds.Length > 0)
            query = query.Where(t => t.CategoryId != null && categoryIds.Contains(t.CategoryId.Value));
        else if (filter.IncludeUncategorized)
            query = query.Where(t => t.CategoryId == null);

        return query;
    }

    /// <summary>
    /// Sortiert nach dem gewählten Kriterium und immer zusätzlich nach Id, damit die
    /// Reihenfolge über Seitengrenzen hinweg stabil bleibt.
    /// </summary>
    private static IQueryable<Transaction> ApplySorting(IQueryable<Transaction> query, TransactionQuery filter)
    {
        var descending = filter.Direction == SortDirection.Descending;

        Expression<Func<Transaction, object?>> key = filter.Sort switch
        {
            TransactionSort.Amount => t => t.Amount,
            TransactionSort.Category => t => t.Category!.Name,
            TransactionSort.Title => t => t.Title,
            _ => t => t.BookingDate
        };

        var ordered = descending ? query.OrderByDescending(key) : query.OrderBy(key);

        return descending ? ordered.ThenByDescending(t => t.Id) : ordered.ThenBy(t => t.Id);
    }

    /// <summary>
    /// Bestimmt die auszuliefernde Seite. Ist eine Buchung angefordert, die sichtbar sein
    /// soll, gewinnt ihre Position — nur so landet ein Sprung von der Gegenbuchung auch
    /// dann auf der richtigen Seite, wenn die Buchung weit unten in der Liste steht.
    /// Geladen werden dafür nur die IDs des Monats, nicht die Buchungen selbst.
    /// </summary>
    private async Task<int> ResolvePageAsync(
        IQueryable<Transaction> filtered, TransactionQuery query, int pageSize, CancellationToken ct)
    {
        var requestedPage = Math.Max(query.Page, 1);

        if (query.FocusTransactionId is not { } focusId)
            return requestedPage;

        var orderedIds = await ApplySorting(filtered, query).Select(t => t.Id).ToListAsync(ct);
        var index = orderedIds.IndexOf(focusId);

        return index < 0 ? requestedPage : (index / pageSize) + 1;
    }

    private async Task<Transaction> FindAsync(int accountId, int transactionId, CancellationToken ct)
    {
        var transaction = await QueryOfAccount(accountId).FirstOrDefaultAsync(t => t.Id == transactionId, ct);

        if (transaction is null)
        {
            logger.LogInformation("Buchung {TransactionId} in Konto {AccountId} nicht gefunden.", transactionId, accountId);
            throw new NotFoundException("Die Buchung");
        }

        return transaction;
    }

    private async Task<Transaction?> LoadCounterpartAsync(Transaction transaction, CancellationToken ct)
        => transaction.LinkedTransactionId is null
            ? null
            : await context.Transactions.FirstOrDefaultAsync(t => t.Id == transaction.LinkedTransactionId, ct);

    private async Task<TransactionDto> GetDtoAsync(int accountId, int transactionId, CancellationToken ct)
    {
        var dto = await QueryOfAccount(accountId)
            .Where(t => t.Id == transactionId)
            .Select(ProjectToDto)
            .FirstOrDefaultAsync(ct);

        return dto is null ? throw new NotFoundException("Die Buchung") : RoundAmount(dto);
    }

    // --- Verknüpfungen --------------------------------------------------

    /// <summary>
    /// Prüft die vier Regeln einer Verknüpfung: zwei verschiedene Konten desselben Nutzers,
    /// entgegengesetzte Richtungen, beide Seiten noch frei, gleiche Währung und gleicher Betrag.
    /// Zusammen ergeben sie genau das gewünschte Bild — eine Ausgabe auf dem einen Konto
    /// entspricht der Einnahme auf dem anderen.
    /// </summary>
    private static void EnsureLinkIsAllowed(
        Transaction transaction, Transaction counterpart, Account account, Account counterAccount)
    {
        if (transaction.Id == counterpart.Id || account.Id == counterAccount.Id)
            throw new BusinessRuleException("Eine Verknüpfung braucht zwei Buchungen auf verschiedenen Konten.");

        if (transaction.LinkedTransactionId is not null)
            throw new BusinessRuleException("Diese Buchung ist bereits verknüpft. Löse die bestehende Verknüpfung zuerst.");

        if (counterpart.LinkedTransactionId is not null)
            throw new BusinessRuleException("Die gewählte Buchung ist bereits mit einer anderen Buchung verknüpft.");

        if (transaction.Type == counterpart.Type)
            throw new BusinessRuleException("Verknüpfen lassen sich nur eine Einnahme und eine Ausgabe.");

        if (!string.Equals(account.Currency, counterAccount.Currency, StringComparison.OrdinalIgnoreCase))
            throw new CurrencyMismatchException(account.Currency, counterAccount.Currency);

        if (transaction.Amount != counterpart.Amount)
            throw new BusinessRuleException("Verknüpfen lassen sich nur Buchungen mit demselben Betrag.");
    }

    /// <summary>
    /// Hält eine bestehende Verknüpfung gültig. Beide Seiten sind sonst eigenständig — nur
    /// Richtung und Betrag tragen die Verknüpfung und dürfen sich nicht hinter ihrem Rücken
    /// ändern, sonst stünden am Ende zwei Ausgaben oder zwei ungleiche Beträge gekoppelt da.
    /// </summary>
    private static void EnsureLinkStaysValid(Transaction transaction, SaveTransactionRequest request)
    {
        if (transaction.LinkedTransactionId is null)
            return;

        if (transaction.Type != request.Type)
            throw new BusinessRuleException(
                "Die Art einer verknüpften Buchung lässt sich nicht ändern. Löse zuerst die Verknüpfung.");

        if (transaction.Amount != Round(request.Amount))
            throw new BusinessRuleException(
                "Der Betrag einer verknüpften Buchung lässt sich nicht ändern. Löse zuerst die Verknüpfung.");
    }

    private async Task<LinkedTransactionDto> GetLinkedDtoAsync(int transactionId, CancellationToken ct)
    {
        var dto = await context.Transactions
            .Where(t => t.Id == transactionId)
            .Select(ProjectToLinkedDto)
            .FirstOrDefaultAsync(ct);

        if (dto is null)
            throw new NotFoundException("Die verknüpfte Buchung");

        dto.Amount = Round(dto.Amount);
        return dto;
    }

    private static TransactionType Opposite(TransactionType type)
        => type == TransactionType.Expense ? TransactionType.Income : TransactionType.Expense;

    // --- Hilfen ---------------------------------------------------------

    private async Task EnsureCategoryBelongsToAccountAsync(int accountId, int? categoryId, CancellationToken ct)
    {
        if (categoryId is null)
            return;

        var exists = await context.Categories.AnyAsync(c => c.Id == categoryId && c.AccountId == accountId, ct);

        if (!exists)
        {
            logger.LogInformation("Kategorie {CategoryId} gehört nicht zu Konto {AccountId}.", categoryId, accountId);
            throw new NotFoundException("Die Kategorie");
        }
    }

    /// <summary>
    /// Prüft die Zuordnung zu einer Fixkosten-Position: Sie muss zum Konto gehören, und
    /// nur Ausgaben können Fixkosten sein.
    /// </summary>
    private async Task EnsureFixedCostIsAssignableAsync(int accountId, SaveTransactionRequest request, CancellationToken ct)
    {
        if (request.FixedCostId is null)
            return;

        if (request.Type != TransactionType.Expense)
            throw new BusinessRuleException("Nur Ausgaben können Fixkosten sein.");

        var exists = await context.FixedCosts
            .AnyAsync(f => f.Id == request.FixedCostId && f.AccountId == accountId, ct);

        if (!exists)
        {
            logger.LogInformation(
                "Fixkosten {FixedCostId} gehören nicht zu Konto {AccountId}.", request.FixedCostId, accountId);
            throw new NotFoundException("Die Fixkosten-Position");
        }
    }

    /// <summary>
    /// Prüft, ob die Buchung offen bleiben darf. „Noch nicht abgebucht" beschreibt eine
    /// angestoßene, aber noch nicht vollzogene Belastung eines Zahlungskontos — bei einem
    /// Depot oder Wallet gibt es dieses Zwischenstadium nicht, und eine Einnahme belastet
    /// das Konto ohnehin nicht.
    /// </summary>
    private static void EnsurePendingIsAllowed(Account account, SaveTransactionRequest request)
    {
        if (!request.IsPending)
            return;

        if (account.Type != AccountType.CheckingAccount)
            throw new BusinessRuleException("Nur Buchungen auf Girokonten können als noch nicht abgebucht markiert werden.");

        if (request.Type != TransactionType.Expense)
            throw new BusinessRuleException("Nur Ausgaben können als noch nicht abgebucht markiert werden.");
    }

    private static Expression<Func<Transaction, TransactionDto>> ProjectToDto =>
        t => new TransactionDto
        {
            Id = t.Id,
            AccountId = t.AccountId,
            Type = t.Type,
            Amount = t.Amount,
            Currency = t.Currency,
            Title = t.Title,
            CategoryId = t.CategoryId,
            CategoryName = t.Category != null ? t.Category.Name : null,
            CategoryColor = t.Category != null ? t.Category.Color : null,
            CategoryIcon = t.Category != null ? t.Category.Icon : null,
            FixedCostId = t.FixedCostId,
            FixedCostName = t.FixedCost != null ? t.FixedCost.Name : null,
            FixedCostMonthDate = t.FixedCost != null ? (DateOnly?)t.FixedCost.Month : null,
            BookingDate = t.BookingDate,
            PurchaseDate = t.PurchaseDate,
            AccountingMonthDate = t.AccountingMonth,
            Note = t.Note,
            IsPending = t.IsPending,
            IsLinked = t.LinkedTransactionId != null,
            LinkedTransactionId = t.LinkedTransactionId,
            LinkedAccountId = t.LinkedTransaction != null ? t.LinkedTransaction.AccountId : null,
            LinkedAccountName = t.LinkedTransaction != null ? t.LinkedTransaction.Account.Name : null,
            CreatedAt = t.CreatedAt
        };

    private static Expression<Func<Transaction, LinkedTransactionDto>> ProjectToLinkedDto =>
        t => new LinkedTransactionDto
        {
            Id = t.Id,
            AccountId = t.AccountId,
            AccountName = t.Account.Name,
            Type = t.Type,
            Amount = t.Amount,
            Currency = t.Currency,
            Title = t.Title,
            CategoryName = t.Category != null ? t.Category.Name : null,
            CategoryColor = t.Category != null ? t.Category.Color : null,
            CategoryIcon = t.Category != null ? t.Category.Icon : null,
            FixedCostName = t.FixedCost != null ? t.FixedCost.Name : null,
            FixedCostMonthDate = t.FixedCost != null ? (DateOnly?)t.FixedCost.Month : null,
            BookingDate = t.BookingDate,
            PurchaseDate = t.PurchaseDate,
            AccountingMonthDate = t.AccountingMonth,
            Note = t.Note,
            IsPending = t.IsPending
        };

    private static TransactionDto RoundAmount(TransactionDto dto)
    {
        dto.Amount = Round(dto.Amount);
        return dto;
    }

    private static decimal Round(decimal value)
        => decimal.Round(value, MoneyScale, MidpointRounding.AwayFromZero);

    private static string NormalizeTitle(string title)
    {
        var trimmed = title.Trim();

        if (trimmed.Length == 0)
            throw new BusinessRuleException("Die Buchung braucht eine Bezeichnung.");

        return trimmed;
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
