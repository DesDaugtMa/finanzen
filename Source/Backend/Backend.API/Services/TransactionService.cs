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

        var page = Math.Max(query.Page, 1);
        var pageSize = Math.Clamp(query.PageSize, 1, TransactionQuery.MaxPageSize);

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

        var transaction = new Transaction
        {
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
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        await EnsureCategoryBelongsToAccountAsync(accountId, request.CategoryId, ct);
        await EnsureFixedCostIsAssignableAsync(accountId, request, ct);

        var transaction = await FindAsync(accountId, transactionId, ct);
        var counterpart = await LoadCounterpartAsync(transaction, ct);

        // Die Richtung eines Überweisungspaares lässt sich nur über den Überweisungs-Dialog
        // drehen — sonst entstünden zwei Ausgaben oder zwei Einnahmen.
        if (counterpart is not null && transaction.Type != request.Type)
            throw new BusinessRuleException("Die Art einer Überweisung lässt sich nur über den Überweisungs-Dialog ändern.");

        transaction.Type = request.Type;
        transaction.Amount = Round(request.Amount);
        transaction.Title = NormalizeTitle(request.Title);
        transaction.CategoryId = request.CategoryId;
        transaction.FixedCostId = request.FixedCostId;
        transaction.BookingDate = request.BookingDate;
        transaction.PurchaseDate = request.PurchaseDate;
        transaction.AccountingMonth = AccountingMonth.Parse(request.AccountingMonth).ToDateOnly();
        transaction.Note = NormalizeOptional(request.Note);

        // Strenge Kopplung: Betrag, Titel und Datumsangaben gelten für beide Seiten,
        // Kategorie und Notiz bleiben je Konto eigenständig.
        if (counterpart is not null)
            SyncSharedFields(transaction, counterpart);

        await context.SaveChangesAsync(ct);

        logger.LogInformation("Buchung {TransactionId} in Konto {AccountId} aktualisiert.", transactionId, accountId);

        return await GetDtoAsync(accountId, transactionId, ct);
    }

    public async Task DeleteAsync(int userId, int accountId, int transactionId, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var transaction = await FindAsync(accountId, transactionId, ct);
        var counterpart = await LoadCounterpartAsync(transaction, ct);

        if (counterpart is not null)
        {
            // Erst die Verweise lösen, damit die Selbstreferenz das Löschen nicht blockiert.
            transaction.LinkedTransactionId = null;
            counterpart.LinkedTransactionId = null;
            await context.SaveChangesAsync(ct);

            context.Transactions.Remove(counterpart);
        }

        context.Transactions.Remove(transaction);
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Buchung {TransactionId} in Konto {AccountId} gelöscht (Überweisung: {IsTransfer}).",
            transactionId, accountId, counterpart is not null);
    }

    public async Task<TransactionDto> CreateTransferAsync(int userId, int accountId, SaveTransferRequest request, CancellationToken ct = default)
    {
        var (account, counterAccount) = await LoadTransferAccountsAsync(userId, accountId, request, ct);

        await EnsureCategoryBelongsToAccountAsync(account.Id, request.CategoryId, ct);
        await EnsureCategoryBelongsToAccountAsync(counterAccount.Id, request.CounterCategoryId, ct);

        var near = BuildTransferLeg(account, request, isCounterpart: false);
        var far = BuildTransferLeg(counterAccount, request, isCounterpart: true);

        context.Transactions.AddRange(near, far);
        await context.SaveChangesAsync(ct);

        // Die gegenseitige Verknüpfung braucht die vergebenen IDs, daher ein zweiter Durchgang.
        near.LinkedTransactionId = far.Id;
        far.LinkedTransactionId = near.Id;
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Überweisung {TransactionId} von Konto {AccountId} nach Konto {CounterAccountId} angelegt.",
            near.Id, account.Id, counterAccount.Id);

        return await GetDtoAsync(accountId, near.Id, ct);
    }

    public async Task<TransactionDto> UpdateTransferAsync(int userId, int accountId, int transactionId, SaveTransferRequest request, CancellationToken ct = default)
    {
        var (account, counterAccount) = await LoadTransferAccountsAsync(userId, accountId, request, ct);

        var near = await FindAsync(accountId, transactionId, ct);
        var far = await LoadCounterpartAsync(near, ct)
            ?? throw new BusinessRuleException("Diese Buchung ist keine Überweisung.");

        await EnsureCategoryBelongsToAccountAsync(account.Id, request.CategoryId, ct);
        await EnsureCategoryBelongsToAccountAsync(counterAccount.Id, request.CounterCategoryId, ct);

        // Wechselt das Gegenkonto, wandert die Gegenbuchung mit — inklusive ihrer Kategorie,
        // die sonst auf eine Kategorie des alten Kontos zeigen würde.
        if (far.AccountId != counterAccount.Id)
        {
            far.AccountId = counterAccount.Id;
            far.Currency = counterAccount.Currency;
        }

        ApplyTransferFields(near, request, isCounterpart: false);
        ApplyTransferFields(far, request, isCounterpart: true);

        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Überweisung {TransactionId} von Konto {AccountId} aktualisiert.", transactionId, accountId);

        return await GetDtoAsync(accountId, transactionId, ct);
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

    // --- Überweisungen --------------------------------------------------

    private async Task<(Account Account, Account CounterAccount)> LoadTransferAccountsAsync(
        int userId, int accountId, SaveTransferRequest request, CancellationToken ct)
    {
        if (request.CounterAccountId == accountId)
            throw new BusinessRuleException("Eine Überweisung braucht zwei verschiedene Konten.");

        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        var counterAccount = await accountAccess.RequireOwnedAsync(userId, request.CounterAccountId, ct);

        if (!string.Equals(account.Currency, counterAccount.Currency, StringComparison.OrdinalIgnoreCase))
            throw new CurrencyMismatchException(account.Currency, counterAccount.Currency);

        return (account, counterAccount);
    }

    private static Transaction BuildTransferLeg(Account account, SaveTransferRequest request, bool isCounterpart)
    {
        var transaction = new Transaction
        {
            AccountId = account.Id,
            Currency = account.Currency,
            Title = NormalizeTitle(request.Title),
            Type = TransactionType.Income
        };

        ApplyTransferFields(transaction, request, isCounterpart);
        return transaction;
    }

    /// <summary>
    /// Überträgt die gemeinsamen Felder auf eine Seite der Überweisung. Der Typ ergibt
    /// sich aus der Richtung: Die abgebende Seite ist eine Ausgabe, die empfangende eine Einnahme.
    /// </summary>
    private static void ApplyTransferFields(Transaction transaction, SaveTransferRequest request, bool isCounterpart)
    {
        var outgoingOnNearSide = request.Direction == TransferDirection.Outgoing;
        var isExpense = isCounterpart ? !outgoingOnNearSide : outgoingOnNearSide;

        transaction.Type = isExpense ? TransactionType.Expense : TransactionType.Income;
        transaction.Amount = Round(request.Amount);
        transaction.Title = NormalizeTitle(request.Title);
        transaction.BookingDate = request.BookingDate;
        transaction.PurchaseDate = request.PurchaseDate;
        transaction.AccountingMonth = AccountingMonth.Parse(request.AccountingMonth).ToDateOnly();
        transaction.Note = NormalizeOptional(request.Note);
        transaction.CategoryId = isCounterpart ? request.CounterCategoryId : request.CategoryId;
    }

    private static void SyncSharedFields(Transaction source, Transaction target)
    {
        target.Amount = source.Amount;
        target.Title = source.Title;
        target.BookingDate = source.BookingDate;
        target.PurchaseDate = source.PurchaseDate;
        target.AccountingMonth = source.AccountingMonth;
    }

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
            IsTransfer = t.LinkedTransactionId != null,
            CounterAccountId = t.LinkedTransaction != null ? t.LinkedTransaction.AccountId : null,
            CounterAccountName = t.LinkedTransaction != null ? t.LinkedTransaction.Account.Name : null,
            CounterCategoryId = t.LinkedTransaction != null ? t.LinkedTransaction.CategoryId : null,
            CreatedAt = t.CreatedAt
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
