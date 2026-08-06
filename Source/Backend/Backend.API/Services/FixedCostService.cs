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

/// <summary>
/// Fixkosten eines Kontos je Abrechnungsmonat. Eine Position ist ein geplanter Betrag;
/// sobald ihr Buchungen zugeordnet sind, zählt deren Summe statt des Plans — die Kennzahl
/// „frei verfügbar“ folgt damit dem tatsächlichen Geldfluss.
/// </summary>
public sealed class FixedCostService(
    AppDbContext context,
    IAccountAccess accountAccess,
    ILogger<FixedCostService> logger) : IFixedCostService
{
    /// <summary>Nachkommastellen, auf die Beträge vor der Ausgabe gerundet werden.</summary>
    private const int MoneyScale = 2;

    public async Task<FixedCostMonthDto> GetMonthAsync(
        int userId, int accountId, AccountingMonth month, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        return await BuildMonthAsync(account, month, ct);
    }

    public async Task<FixedCostDto> GetAsync(int userId, int accountId, int fixedCostId, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        return await GetDtoAsync(account, fixedCostId, ct);
    }

    public async Task<FixedCostDto> CreateAsync(
        int userId, int accountId, AccountingMonth month, SaveFixedCostRequest request, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        await EnsureCategoryBelongsToAccountAsync(accountId, request.CategoryId, ct);

        var name = NormalizeName(request.Name);
        await EnsureNameIsFreeAsync(accountId, month, name, null, ct);

        var fixedCost = new FixedCost
        {
            AccountId = accountId,
            Month = month.ToDateOnly(),
            Name = name,
            Amount = Round(request.Amount),
            CategoryId = request.CategoryId,
            Note = NormalizeOptional(request.Note)
        };

        context.FixedCosts.Add(fixedCost);
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Fixkosten {FixedCostId} in Konto {AccountId} für {Month} angelegt.", fixedCost.Id, accountId, month);

        return await GetDtoAsync(account, fixedCost.Id, ct);
    }

    public async Task<FixedCostDto> UpdateAsync(
        int userId, int accountId, int fixedCostId, SaveFixedCostRequest request, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        await EnsureCategoryBelongsToAccountAsync(accountId, request.CategoryId, ct);

        var fixedCost = await FindAsync(accountId, fixedCostId, ct);

        var name = NormalizeName(request.Name);
        await EnsureNameIsFreeAsync(accountId, AccountingMonth.FromDate(fixedCost.Month), name, fixedCostId, ct);

        fixedCost.Name = name;
        fixedCost.Amount = Round(request.Amount);
        fixedCost.CategoryId = request.CategoryId;
        fixedCost.Note = NormalizeOptional(request.Note);
        fixedCost.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(ct);

        logger.LogInformation("Fixkosten {FixedCostId} in Konto {AccountId} aktualisiert.", fixedCostId, accountId);

        return await GetDtoAsync(account, fixedCostId, ct);
    }

    public async Task DeleteAsync(int userId, int accountId, int fixedCostId, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var fixedCost = await FindAsync(accountId, fixedCostId, ct);

        // Buchungen sind echte Geldbewegungen und werden nie mitgelöscht — sie verlieren
        // nur ihre Zuordnung und zählen danach wieder als variable Ausgaben.
        var affected = await context.Transactions
            .Where(t => t.FixedCostId == fixedCostId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.FixedCostId, (int?)null), ct);

        context.FixedCosts.Remove(fixedCost);
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Fixkosten {FixedCostId} in Konto {AccountId} gelöscht; {TransactionCount} Buchungen wieder ohne Zuordnung.",
            fixedCostId, accountId, affected);
    }

    public async Task<FixedCostCopyPreviewDto> GetCopyPreviewAsync(
        int userId, int accountId, AccountingMonth month, string? sourceMonth, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var targetStart = month.ToDateOnly();

        var availableMonths = await context.FixedCosts
            .Where(f => f.AccountId == accountId && f.Month != targetStart)
            .Select(f => f.Month)
            .Distinct()
            .OrderByDescending(m => m)
            .ToListAsync(ct);

        // Ohne ausdrückliche Wahl ist der jüngste Monat vor dem Zielmonat die Quelle —
        // in aller Regel der Vormonat, aus dem übernommen werden soll.
        var selected = ResolveSourceMonth(sourceMonth, availableMonths, targetStart);

        var preview = new FixedCostCopyPreviewDto
        {
            TargetMonth = month.ToString(),
            SourceMonth = selected is null ? null : AccountingMonth.FromDate(selected.Value).ToString(),
            AvailableMonths = availableMonths.Select(m => AccountingMonth.FromDate(m).ToString()).ToList(),
            Currency = account.Currency
        };

        if (selected is null)
            return preview;

        var existingNames = await QueryOfMonth(accountId, targetStart)
            .Select(f => f.Name)
            .ToListAsync(ct);

        preview.Items = await QueryOfMonth(accountId, selected.Value)
            .OrderBy(f => f.Name)
            .ThenBy(f => f.Id)
            .Select(f => new FixedCostCopyCandidateDto
            {
                Id = f.Id,
                Name = f.Name,
                Amount = f.Amount,
                CategoryId = f.CategoryId,
                CategoryName = f.Category != null ? f.Category.Name : null,
                CategoryColor = f.Category != null ? f.Category.Color : null,
                CategoryIcon = f.Category != null ? f.Category.Icon : null
            })
            .ToListAsync(ct);

        foreach (var item in preview.Items)
        {
            item.Amount = Round(item.Amount);
            item.AlreadyExists = existingNames.Contains(item.Name, StringComparer.OrdinalIgnoreCase);
        }

        return preview;
    }

    public async Task<FixedCostMonthDto> CopyAsync(
        int userId, int accountId, AccountingMonth month, CopyFixedCostsRequest request, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var ids = request.FixedCostIds.Distinct().ToList();
        var targetStart = month.ToDateOnly();

        var sources = await context.FixedCosts
            .Where(f => f.AccountId == accountId && ids.Contains(f.Id))
            .ToListAsync(ct);

        if (sources.Count != ids.Count)
            throw new NotFoundException("Mindestens eine der gewählten Fixkosten-Positionen");

        if (sources.Any(f => f.Month == targetStart))
            throw new BusinessRuleException("Fixkosten können nicht in denselben Monat übernommen werden.");

        var existingNames = await QueryOfMonth(accountId, targetStart)
            .Select(f => f.Name)
            .ToListAsync(ct);

        // Namensgleiche Positionen werden übersprungen: der Nutzer soll die Übernahme
        // gefahrlos wiederholen können, ohne Dubletten zu erzeugen.
        var copies = sources
            .Where(f => !existingNames.Contains(f.Name, StringComparer.OrdinalIgnoreCase))
            .Select(f => new FixedCost
            {
                AccountId = accountId,
                Month = targetStart,
                Name = f.Name,
                Amount = f.Amount,
                CategoryId = f.CategoryId,
                Note = f.Note
            })
            .ToList();

        if (copies.Count == 0)
            throw new BusinessRuleException("Alle gewählten Positionen gibt es in diesem Monat bereits.");

        context.FixedCosts.AddRange(copies);
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "{Count} Fixkosten nach {Month} für Konto {AccountId} übernommen.", copies.Count, month, accountId);

        return await BuildMonthAsync(account, month, ct);
    }

    public async Task<IReadOnlyList<FixedCostTransactionDto>> GetAssignableTransactionsAsync(
        int userId, int accountId, int fixedCostId, string? search, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        await FindAsync(accountId, fixedCostId, ct);

        // Nur Ausgaben ohne bestehende Zuordnung — Einnahmen sind keine Fixkosten, und
        // eine Buchung gehört zu höchstens einer Position.
        var query = context.Transactions
            .Where(t => t.AccountId == accountId
                        && t.Type == TransactionType.Expense
                        && t.FixedCostId == null);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(t => EF.Functions.ILike(t.Title, pattern));
        }

        var items = await query
            .OrderByDescending(t => t.BookingDate)
            .ThenByDescending(t => t.Id)
            .Take(FinanceValidation.AssignableTransactionLimit)
            .Select(ProjectTransaction)
            .ToListAsync(ct);

        foreach (var item in items)
            item.Amount = Round(item.Amount);

        return items;
    }

    public async Task<FixedCostMonthDto> LinkTransactionAsync(
        int userId, int accountId, int fixedCostId, int transactionId, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var fixedCost = await FindAsync(accountId, fixedCostId, ct);
        var transaction = await FindTransactionAsync(accountId, transactionId, ct);

        EnsureTransactionIsAssignable(transaction, fixedCostId);

        transaction.FixedCostId = fixedCostId;
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Buchung {TransactionId} den Fixkosten {FixedCostId} in Konto {AccountId} zugeordnet.",
            transactionId, fixedCostId, accountId);

        return await BuildMonthAsync(account, AccountingMonth.FromDate(fixedCost.Month), ct);
    }

    public async Task<FixedCostMonthDto> UnlinkTransactionAsync(
        int userId, int accountId, int fixedCostId, int transactionId, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var fixedCost = await FindAsync(accountId, fixedCostId, ct);
        var transaction = await FindTransactionAsync(accountId, transactionId, ct);

        if (transaction.FixedCostId != fixedCostId)
            throw new BusinessRuleException("Diese Buchung gehört nicht zu der gewählten Fixkosten-Position.");

        transaction.FixedCostId = null;
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Zuordnung der Buchung {TransactionId} zu Fixkosten {FixedCostId} in Konto {AccountId} gelöst.",
            transactionId, fixedCostId, accountId);

        return await BuildMonthAsync(account, AccountingMonth.FromDate(fixedCost.Month), ct);
    }

    public async Task<FixedCostTotals> GetTotalsAsync(int accountId, AccountingMonth month, CancellationToken ct = default)
    {
        var rows = await LoadAmountsAsync(accountId, month.ToDateOnly(), ct);

        if (rows.Count == 0)
            return FixedCostTotals.Empty;

        return new FixedCostTotals(
            Planned: Round(rows.Sum(r => r.Planned)),
            Booked: Round(rows.Sum(r => r.Booked)),
            Effective: Round(rows.Sum(EffectiveAmount)),
            Count: rows.Count,
            OpenCount: rows.Count(r => r.TransactionCount == 0));
    }

    // --- Intern ---------------------------------------------------------

    private IQueryable<FixedCost> QueryOfAccount(int accountId)
        => context.FixedCosts.Where(f => f.AccountId == accountId);

    private IQueryable<FixedCost> QueryOfMonth(int accountId, DateOnly monthStart)
        => QueryOfAccount(accountId).Where(f => f.Month == monthStart);

    private async Task<FixedCostMonthDto> BuildMonthAsync(Account account, AccountingMonth month, CancellationToken ct)
    {
        var items = await LoadItemsAsync(account, month, ct);

        return new FixedCostMonthDto
        {
            Month = month.ToString(),
            Currency = account.Currency,
            Items = items,
            TotalPlanned = Round(items.Sum(i => i.Amount)),
            TotalBooked = Round(items.Sum(i => i.BookedAmount)),
            TotalEffective = Round(items.Sum(i => i.EffectiveAmount)),
            OpenCount = items.Count(i => i.Status == FixedCostStatus.Open)
        };
    }

    private async Task<FixedCostDto> GetDtoAsync(Account account, int fixedCostId, CancellationToken ct)
    {
        var items = await LoadItemsAsync(account, null, ct, fixedCostId);
        return items.FirstOrDefault() ?? throw new NotFoundException("Die Fixkosten-Position");
    }

    /// <summary>
    /// Lädt die Positionen eines Monats — oder, mit <paramref name="fixedCostId"/>, eine einzelne.
    /// Beträge und Buchungen kommen in einem Durchgang aus der Datenbank; gerundet wird erst hier.
    /// </summary>
    private async Task<List<FixedCostDto>> LoadItemsAsync(
        Account account, AccountingMonth? month, CancellationToken ct, int? fixedCostId = null)
    {
        var query = QueryOfAccount(account.Id);

        query = fixedCostId is not null
            ? query.Where(f => f.Id == fixedCostId)
            : query.Where(f => f.Month == month!.Value.ToDateOnly());

        var rows = await query
            .OrderBy(f => f.Name)
            .ThenBy(f => f.Id)
            .Select(f => new
            {
                f.Id,
                f.AccountId,
                f.Month,
                f.Name,
                f.Amount,
                f.CategoryId,
                CategoryName = f.Category != null ? f.Category.Name : null,
                CategoryColor = f.Category != null ? f.Category.Color : null,
                CategoryIcon = f.Category != null ? f.Category.Icon : null,
                f.Note,
                BookedAmount = f.Transactions.Sum(t => (decimal?)t.Amount) ?? 0m,
                TransactionCount = f.Transactions.Count(),
                Transactions = f.Transactions
                    .OrderByDescending(t => t.BookingDate)
                    .ThenByDescending(t => t.Id)
                    .Select(t => new FixedCostTransactionDto
                    {
                        Id = t.Id,
                        Title = t.Title,
                        Amount = t.Amount,
                        Currency = t.Currency,
                        BookingDate = t.BookingDate,
                        CategoryName = t.Category != null ? t.Category.Name : null,
                        CategoryColor = t.Category != null ? t.Category.Color : null,
                        CategoryIcon = t.Category != null ? t.Category.Icon : null,
                        AccountingMonthDate = t.AccountingMonth
                    })
                    .ToList()
            })
            .ToListAsync(ct);

        return rows
            .Select(r =>
            {
                var planned = Round(r.Amount);
                var booked = Round(r.BookedAmount);

                foreach (var transaction in r.Transactions)
                    transaction.Amount = Round(transaction.Amount);

                return new FixedCostDto
                {
                    Id = r.Id,
                    AccountId = r.AccountId,
                    Month = AccountingMonth.FromDate(r.Month).ToString(),
                    Name = r.Name,
                    Amount = planned,
                    Currency = account.Currency,
                    CategoryId = r.CategoryId,
                    CategoryName = r.CategoryName,
                    CategoryColor = r.CategoryColor,
                    CategoryIcon = r.CategoryIcon,
                    Note = r.Note,
                    BookedAmount = booked,
                    TransactionCount = r.TransactionCount,
                    EffectiveAmount = EffectiveAmount(planned, booked),
                    Status = DetermineStatus(r.TransactionCount, planned, booked),
                    Transactions = r.Transactions
                };
            })
            .ToList();
    }

    /// <summary>Nur die Beträge — für die Monatskennzahlen, ohne die Buchungen mitzuladen.</summary>
    private async Task<List<AmountRow>> LoadAmountsAsync(int accountId, DateOnly monthStart, CancellationToken ct)
    {
        var rows = await QueryOfMonth(accountId, monthStart)
            .Select(f => new
            {
                Planned = f.Amount,
                Booked = f.Transactions.Sum(t => (decimal?)t.Amount) ?? 0m,
                TransactionCount = f.Transactions.Count()
            })
            .ToListAsync(ct);

        return rows.Select(r => new AmountRow(r.Planned, r.Booked, r.TransactionCount)).ToList();
    }

    /// <summary>
    /// Der Betrag, mit dem eine Position gegen die Einnahmen zählt: das bereits gezahlte
    /// Geld plus die Restverpflichtung. Eine Teilzahlung senkt den Abzug also nicht — der
    /// offene Rest ist weiterhin gebunden. Zusammengefasst: <c>max(geplant, gebucht)</c>,
    /// womit auch eine Zahlung über Plan vollständig zählt.
    /// </summary>
    private static decimal EffectiveAmount(decimal planned, decimal booked)
        => Math.Max(planned, booked);

    private static decimal EffectiveAmount(AmountRow row)
        => EffectiveAmount(row.Planned, row.Booked);

    private static FixedCostStatus DetermineStatus(int transactionCount, decimal planned, decimal booked)
    {
        if (transactionCount == 0)
            return FixedCostStatus.Open;

        if (booked > planned)
            return FixedCostStatus.Exceeded;

        return booked < planned ? FixedCostStatus.Partial : FixedCostStatus.Booked;
    }

    /// <summary>Der jüngste Monat vor dem Ziel; gibt es keinen, der jüngste überhaupt.</summary>
    private static DateOnly? ResolveSourceMonth(string? requested, List<DateOnly> available, DateOnly targetStart)
    {
        if (available.Count == 0)
            return null;

        if (AccountingMonth.TryParse(requested, out var parsed))
        {
            var match = parsed.ToDateOnly();
            if (available.Contains(match))
                return match;
        }

        var previous = available.Where(m => m < targetStart).ToList();
        return previous.Count > 0 ? previous.Max() : available.Max();
    }

    private async Task<FixedCost> FindAsync(int accountId, int fixedCostId, CancellationToken ct)
    {
        var fixedCost = await QueryOfAccount(accountId).FirstOrDefaultAsync(f => f.Id == fixedCostId, ct);

        if (fixedCost is null)
        {
            logger.LogInformation(
                "Fixkosten {FixedCostId} in Konto {AccountId} nicht gefunden.", fixedCostId, accountId);
            throw new NotFoundException("Die Fixkosten-Position");
        }

        return fixedCost;
    }

    private async Task<Transaction> FindTransactionAsync(int accountId, int transactionId, CancellationToken ct)
    {
        var transaction = await context.Transactions
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.AccountId == accountId, ct);

        if (transaction is null)
        {
            logger.LogInformation(
                "Buchung {TransactionId} in Konto {AccountId} nicht gefunden.", transactionId, accountId);
            throw new NotFoundException("Die Buchung");
        }

        return transaction;
    }

    private static void EnsureTransactionIsAssignable(Transaction transaction, int fixedCostId)
    {
        if (transaction.Type != TransactionType.Expense)
            throw new BusinessRuleException("Nur Ausgaben können Fixkosten sein.");

        if (transaction.FixedCostId is not null && transaction.FixedCostId != fixedCostId)
            throw new BusinessRuleException("Diese Buchung ist bereits einer anderen Fixkosten-Position zugeordnet.");
    }

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

    private async Task EnsureNameIsFreeAsync(
        int accountId, AccountingMonth month, string name, int? exceptFixedCostId, CancellationToken ct)
    {
        var exists = await QueryOfMonth(accountId, month.ToDateOnly())
            .AnyAsync(f => f.Id != exceptFixedCostId && f.Name.ToLower() == name.ToLower(), ct);

        if (exists)
            throw new BusinessRuleException($"In diesem Monat gibt es bereits Fixkosten „{name}“.");
    }

    private static string NormalizeName(string name)
    {
        var trimmed = name.Trim();

        if (trimmed.Length == 0)
            throw new BusinessRuleException("Die Fixkosten brauchen einen Namen.");

        return trimmed;
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static decimal Round(decimal value)
        => decimal.Round(value, MoneyScale, MidpointRounding.AwayFromZero);

    private static Expression<Func<Transaction, FixedCostTransactionDto>> ProjectTransaction =>
        t => new FixedCostTransactionDto
        {
            Id = t.Id,
            Title = t.Title,
            Amount = t.Amount,
            Currency = t.Currency,
            BookingDate = t.BookingDate,
            CategoryName = t.Category != null ? t.Category.Name : null,
            CategoryColor = t.Category != null ? t.Category.Color : null,
            CategoryIcon = t.Category != null ? t.Category.Icon : null,
            AccountingMonthDate = t.AccountingMonth
        };

    /// <summary>Geplanter Betrag, gebuchte Summe und Anzahl der Buchungen einer Position.</summary>
    private readonly record struct AmountRow(decimal Planned, decimal Booked, int TransactionCount);
}
