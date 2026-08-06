using Backend.Domain.Enums;
using Backend.Infrastructure.Persistence;
using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Backend.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public sealed class MonthSummaryService(
    AppDbContext context,
    IAccountAccess accountAccess,
    IFixedCostService fixedCostService) : IMonthSummaryService
{
    private const int MoneyScale = 2;

    /// <summary>Prozentanteile werden feiner gerundet als Beträge, damit kleine Posten sichtbar bleiben.</summary>
    private const int ShareScale = 2;

    public async Task<MonthSummaryDto> GetAsync(int userId, int accountId, AccountingMonth month, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var monthStart = month.ToDateOnly();

        // Einnahmen, Ausgaben und Anzahl in einem Durchgang — jede Summe läuft als
        // SQL-Aggregat auf decimal, gerundet wird erst für die Ausgabe.
        var monthTotals = await context.Transactions
            .Where(t => t.AccountId == accountId && t.AccountingMonth == monthStart)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Income = g.Where(t => t.Type == TransactionType.Income).Sum(t => (decimal?)t.Amount) ?? 0m,
                Expenses = g.Where(t => t.Type == TransactionType.Expense).Sum(t => (decimal?)t.Amount) ?? 0m,
                // Variable Ausgaben sind alle Ausgaben ohne Fixkosten-Zuordnung — nur sie
                // dürfen zusätzlich zu den Fixkosten vom frei verfügbaren Geld abgehen.
                VariableExpenses = g
                    .Where(t => t.Type == TransactionType.Expense && t.FixedCostId == null)
                    .Sum(t => (decimal?)t.Amount) ?? 0m,
                Count = g.Count()
            })
            .FirstOrDefaultAsync(ct);

        var income = Round(monthTotals?.Income ?? 0m);
        var expenses = Round(monthTotals?.Expenses ?? 0m);
        var variableExpenses = Round(monthTotals?.VariableExpenses ?? 0m);

        var fixedCosts = await fixedCostService.GetTotalsAsync(accountId, month, ct);

        // Frei verfügbar kennt keine negativen Werte: was über die Einnahmen hinausgeht,
        // ist kein „negativer Spielraum“, sondern eine Unterdeckung — sie wird getrennt
        // ausgewiesen, statt die Kennzahl ins Minus laufen zu lassen.
        var uncapped = Round(income - fixedCosts.Effective - variableExpenses);
        var disposable = Math.Max(0m, uncapped);

        var currentBalance = await CalculateCurrentBalanceAsync(accountId, account.InitialBalance, ct);
        var budgets = await context.Budgets
            .Where(b => b.AccountId == accountId && b.Month == monthStart)
            .ToDictionaryAsync(b => b.CategoryId, b => b.Amount, ct);

        var spending = await LoadSpendingAsync(accountId, monthStart, budgets, ct);
        var totalBudget = Round(budgets.Values.Sum());
        var totalSpentBudgeted = Round(spending
            .Where(s => s.CategoryId is not null && budgets.ContainsKey(s.CategoryId.Value))
            .Sum(s => s.Amount));

        return new MonthSummaryDto
        {
            Month = month.ToString(),
            Currency = account.Currency,
            Income = income,
            Expenses = expenses,
            Net = Round(income - expenses),
            CurrentBalance = currentBalance,
            TotalBudget = totalBudget,
            TotalSpentBudgeted = totalSpentBudgeted,
            TotalRemaining = Round(totalBudget - totalSpentBudgeted),
            FixedCostsPlanned = fixedCosts.Planned,
            FixedCostsBooked = fixedCosts.Booked,
            FixedCosts = fixedCosts.Effective,
            FixedCostCount = fixedCosts.Count,
            FixedCostOpenCount = fixedCosts.OpenCount,
            VariableExpenses = variableExpenses,
            Disposable = disposable,
            DisposableShortfall = disposable - uncapped,
            TransactionCount = monthTotals?.Count ?? 0,
            Spending = spending
        };
    }

    /// <summary>Monatsübergreifend: Anfangssaldo + alle Einnahmen − alle Ausgaben.</summary>
    private async Task<decimal> CalculateCurrentBalanceAsync(int accountId, decimal initialBalance, CancellationToken ct)
    {
        var totals = await context.Transactions
            .Where(t => t.AccountId == accountId)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Income = g.Where(t => t.Type == TransactionType.Income).Sum(t => (decimal?)t.Amount) ?? 0m,
                Expenses = g.Where(t => t.Type == TransactionType.Expense).Sum(t => (decimal?)t.Amount) ?? 0m
            })
            .FirstOrDefaultAsync(ct);

        return Round(initialBalance + (totals?.Income ?? 0m) - (totals?.Expenses ?? 0m));
    }

    /// <summary>
    /// Ausgaben je Kategorie, absteigend nach Betrag. Buchungen ohne Kategorie erscheinen
    /// als eigene Zeile, damit die Anteile in Summe wieder 100 % ergeben.
    /// </summary>
    private async Task<List<CategorySpendingDto>> LoadSpendingAsync(
        int accountId, DateOnly monthStart, IReadOnlyDictionary<int, decimal> budgets, CancellationToken ct)
    {
        var rows = await context.Transactions
            .Where(t => t.AccountId == accountId
                        && t.AccountingMonth == monthStart
                        && t.Type == TransactionType.Expense)
            .GroupBy(t => new
            {
                t.CategoryId,
                Name = t.Category != null ? t.Category.Name : null,
                Color = t.Category != null ? t.Category.Color : null,
                Icon = t.Category != null ? t.Category.Icon : null
            })
            .Select(g => new
            {
                g.Key.CategoryId,
                g.Key.Name,
                g.Key.Color,
                g.Key.Icon,
                Amount = g.Sum(t => t.Amount)
            })
            .ToListAsync(ct);

        var total = rows.Sum(r => r.Amount);

        return rows
            .OrderByDescending(r => r.Amount)
            .ThenBy(r => r.Name)
            .Select(r => new CategorySpendingDto
            {
                CategoryId = r.CategoryId,
                CategoryName = r.Name ?? "Ohne Kategorie",
                CategoryColor = r.Color,
                CategoryIcon = r.Icon,
                Amount = Round(r.Amount),
                Share = total == 0m ? 0m : decimal.Round(r.Amount / total * 100m, ShareScale, MidpointRounding.AwayFromZero),
                Budget = r.CategoryId is not null && budgets.TryGetValue(r.CategoryId.Value, out var budget)
                    ? Round(budget)
                    : null
            })
            .ToList();
    }

    private static decimal Round(decimal value)
        => decimal.Round(value, MoneyScale, MidpointRounding.AwayFromZero);
}
