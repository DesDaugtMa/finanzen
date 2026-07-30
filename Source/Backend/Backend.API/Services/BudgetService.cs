using Backend.Domain.Entities.Finance;
using Backend.Domain.Enums;
using Backend.Exceptions;
using Backend.Infrastructure.Persistence;
using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Backend.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public sealed class BudgetService(
    AppDbContext context,
    IAccountAccess accountAccess,
    ILogger<BudgetService> logger) : IBudgetService
{
    /// <summary>Nachkommastellen, auf die Beträge vor der Ausgabe gerundet werden.</summary>
    private const int MoneyScale = 2;

    public async Task<BudgetMonthDto> GetMonthAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        return await BuildMonthAsync(account, month, ct);
    }

    public async Task<BudgetMonthDto> SetAsync(int userId, int accountId, int categoryId, AccountingMonth month,
        SetBudgetRequest request, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);
        await EnsureCategoryBelongsToAccountAsync(accountId, categoryId, ct);

        var existing = await context.Budgets
            .FirstOrDefaultAsync(b => b.AccountId == accountId && b.CategoryId == categoryId && b.Month == month.ToDateOnly(), ct);

        if (request.Amount is null)
        {
            if (existing is not null)
            {
                context.Budgets.Remove(existing);
                await context.SaveChangesAsync(ct);
                logger.LogInformation(
                    "Budget für Kategorie {CategoryId} in Konto {AccountId} für {Month} entfernt.",
                    categoryId, accountId, month);
            }
        }
        else
        {
            var amount = Round(request.Amount.Value);

            if (existing is null)
            {
                context.Budgets.Add(new Budget
                {
                    AccountId = accountId,
                    CategoryId = categoryId,
                    Month = month.ToDateOnly(),
                    Amount = amount
                });
            }
            else
            {
                existing.Amount = amount;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            await context.SaveChangesAsync(ct);
            logger.LogInformation(
                "Budget für Kategorie {CategoryId} in Konto {AccountId} für {Month} gesetzt.",
                categoryId, accountId, month);
        }

        return await BuildMonthAsync(account, month, ct);
    }

    public async Task<BudgetMonthDto> ApplySuggestionsAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var categoryIds = await QueryCategories(accountId).Select(c => c.Id).ToListAsync(ct);
        var current = await LoadBudgetsAsync(accountId, month, ct);
        var previous = await LoadBudgetsAsync(accountId, month.Previous(), ct);

        var additions = categoryIds
            .Where(id => !current.ContainsKey(id) && previous.ContainsKey(id))
            .Select(id => new Budget
            {
                AccountId = accountId,
                CategoryId = id,
                Month = month.ToDateOnly(),
                Amount = previous[id]
            })
            .ToList();

        if (additions.Count == 0)
            throw new BusinessRuleException("Für diesen Monat gibt es keine offenen Vorschläge aus dem Vormonat.");

        context.Budgets.AddRange(additions);
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "{Count} Budgets aus {SourceMonth} nach {Month} für Konto {AccountId} übernommen.",
            additions.Count, month.Previous(), month, accountId);

        return await BuildMonthAsync(account, month, ct);
    }

    // --- Intern ---------------------------------------------------------

    /// <summary>
    /// Setzt den Monat aus drei Quellen zusammen: den Kategorien des Kontos, den
    /// gesetzten Budgets und den tatsächlichen Ausgaben. Die Aggregation läuft als
    /// SQL-Summe auf <c>decimal</c>, gerundet wird erst am Ende.
    /// </summary>
    private async Task<BudgetMonthDto> BuildMonthAsync(Account account, AccountingMonth month, CancellationToken ct)
    {
        var categories = await QueryCategories(account.Id)
            .OrderBy(c => c.Name)
            .ThenBy(c => c.Id)
            .Select(c => new { c.Id, c.Name, c.Color, c.Icon })
            .ToListAsync(ct);

        var budgets = await LoadBudgetsAsync(account.Id, month, ct);
        var previousBudgets = await LoadBudgetsAsync(account.Id, month.Previous(), ct);
        var spending = await LoadSpendingAsync(account.Id, month, ct);

        var items = categories
            .Select(c =>
            {
                var amount = budgets.TryGetValue(c.Id, out var budget) ? Round(budget) : (decimal?)null;
                var spent = Round(spending.GetValueOrDefault(c.Id));

                return new BudgetLineDto
                {
                    CategoryId = c.Id,
                    CategoryName = c.Name,
                    CategoryColor = c.Color,
                    CategoryIcon = c.Icon,
                    Amount = amount,
                    // Der Vorschlag ist bewusst nur eine Anzeige: erst „Übernehmen“ schreibt ihn fest.
                    SuggestedAmount = amount is null && previousBudgets.TryGetValue(c.Id, out var previous)
                        ? Round(previous)
                        : null,
                    Spent = spent,
                    Remaining = amount is null ? null : Round(amount.Value - spent)
                };
            })
            .ToList();

        var totalBudget = items.Sum(i => i.Amount ?? 0m);
        var totalSpent = items.Sum(i => i.Spent);
        var totalSpentBudgeted = items.Where(i => i.Amount is not null).Sum(i => i.Spent);

        return new BudgetMonthDto
        {
            Month = month.ToString(),
            Currency = account.Currency,
            Items = items,
            TotalBudget = Round(totalBudget),
            // Ausgaben ohne Kategorie tauchen in keiner Zeile auf, gehören aber zur Monatssumme.
            TotalSpent = Round(totalSpent + spending.GetValueOrDefault(0)),
            TotalSpentBudgeted = Round(totalSpentBudgeted),
            TotalRemaining = Round(totalBudget - totalSpentBudgeted),
            SuggestionSourceMonth = month.Previous().ToString(),
            HasSuggestions = items.Any(i => i.SuggestedAmount is not null)
        };
    }

    private IQueryable<Category> QueryCategories(int accountId)
        => context.Categories.Where(c => c.AccountId == accountId);

    private async Task<Dictionary<int, decimal>> LoadBudgetsAsync(int accountId, AccountingMonth month, CancellationToken ct)
        => await context.Budgets
            .Where(b => b.AccountId == accountId && b.Month == month.ToDateOnly())
            .ToDictionaryAsync(b => b.CategoryId, b => b.Amount, ct);

    /// <summary>
    /// Ausgaben je Kategorie im Monat. Einnahmen zählen nicht gegen ein Budget.
    /// Buchungen ohne Kategorie laufen unter dem Schlüssel <c>0</c>.
    /// </summary>
    private async Task<Dictionary<int, decimal>> LoadSpendingAsync(int accountId, AccountingMonth month, CancellationToken ct)
        => await context.Transactions
            .Where(t => t.AccountId == accountId
                        && t.AccountingMonth == month.ToDateOnly()
                        && t.Type == TransactionType.Expense)
            .GroupBy(t => t.CategoryId)
            .Select(g => new { CategoryId = g.Key ?? 0, Amount = g.Sum(t => t.Amount) })
            .ToDictionaryAsync(x => x.CategoryId, x => x.Amount, ct);

    private async Task EnsureCategoryBelongsToAccountAsync(int accountId, int categoryId, CancellationToken ct)
    {
        var exists = await QueryCategories(accountId).AnyAsync(c => c.Id == categoryId, ct);

        if (!exists)
        {
            logger.LogInformation("Kategorie {CategoryId} gehört nicht zu Konto {AccountId}.", categoryId, accountId);
            throw new NotFoundException("Die Kategorie");
        }
    }

    private static decimal Round(decimal value)
        => decimal.Round(value, MoneyScale, MidpointRounding.AwayFromZero);
}
