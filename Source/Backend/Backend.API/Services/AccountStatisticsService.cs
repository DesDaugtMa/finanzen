using Backend.Domain.Enums;
using Backend.Infrastructure.Persistence;
using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Backend.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

/// <summary>
/// Die zeitbezogenen Auswertungen eines Kontos: der Verlauf über den Monat, der noch
/// mögliche Betrag pro Tag, die Hochrechnung auf das Monatsende und der Vergleich von
/// Plan und Ist je Kategorie.
///
/// Bewusst getrennt von <see cref="MonthSummaryService"/>: die Monatssummen dort sind
/// stichtagsunabhängig, alles hier hängt am heutigen Tag. Die Summen selbst werden nicht
/// doppelt gerechnet — die Übersicht liest sie weiterhin aus der Zusammenfassung.
/// </summary>
public sealed class AccountStatisticsService(
    AppDbContext context,
    IAccountAccess accountAccess,
    IFixedCostService fixedCostService) : IAccountStatisticsService
{
    private const int MoneyScale = 2;

    /// <summary>Sammelschlüssel für Beträge ohne Kategorie. Echte Kategorie-Ids beginnen bei 1.</summary>
    private const int NoCategoryKey = 0;

    public async Task<AccountStatisticsDto> GetAsync(
        int userId, int accountId, AccountingMonth month, CancellationToken ct = default)
    {
        var account = await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var monthStart = month.ToDateOnly();
        var daysInMonth = DateTime.DaysInMonth(month.Year, month.Month);
        var monthEnd = new DateOnly(month.Year, month.Month, daysInMonth);

        // Der Stichtag steuert Resttage und Hochrechnung. UtcNow wie überall sonst im
        // Projekt — die Abweichung zur lokalen Zeit ist auf den Tageswechsel begrenzt.
        var today = DateOnly.FromDateTime(DateTime.UtcNow);
        var position = DeterminePosition(today, monthStart, monthEnd);
        var currentDay = position == MonthPosition.Current ? today.Day : (int?)null;

        var dailyFlows = await LoadDailyFlowsAsync(accountId, monthStart, ct);
        var trend = BuildTrend(dailyFlows, month, daysInMonth, monthStart, monthEnd);

        var totals = SumFlows(dailyFlows, monthStart, monthEnd, daysInMonth, currentDay);
        var fixedCosts = await fixedCostService.GetTotalsAsync(accountId, month, ct);
        var balance = await CalculateCurrentBalanceAsync(accountId, account.InitialBalance, ct);

        var comparison = await BuildPlanComparisonAsync(accountId, monthStart, ct);

        return new AccountStatisticsDto
        {
            Month = month.ToString(),
            Currency = account.Currency,
            DaysInMonth = daysInMonth,
            Position = position,
            CurrentDay = currentDay,
            DailyAllowance = BuildDailyAllowance(balance, fixedCosts, totals, position, daysInMonth, currentDay),
            Forecast = BuildForecast(totals, fixedCosts, position, daysInMonth, currentDay),
            Trend = trend,
            PlanComparison = comparison,
            PlannedTotal = Round(comparison.Sum(i => i.Planned)),
            ActualTotal = Round(comparison.Sum(i => i.Actual))
        };
    }

    // --- Zeitliche Einordnung -------------------------------------------

    private static MonthPosition DeterminePosition(DateOnly today, DateOnly monthStart, DateOnly monthEnd)
    {
        if (today > monthEnd) return MonthPosition.Past;
        if (today < monthStart) return MonthPosition.Future;
        return MonthPosition.Current;
    }

    // --- Verlauf ---------------------------------------------------------

    /// <summary>Die Buchungen eines Tages, getrennt nach Richtung und Fixkosten-Bindung.</summary>
    private sealed record DailyFlow(DateOnly BookingDate, TransactionType Type, bool IsFixedCost, decimal Amount, int Count);

    /// <summary>
    /// Alle Buchungen des Abrechnungsmonats, je Buchungstag zusammengefasst. Die Gruppierung
    /// läuft in der Datenbank; zurück kommen höchstens ein paar Dutzend Zeilen, die dann in
    /// den Monat einsortiert werden.
    /// </summary>
    private async Task<List<DailyFlow>> LoadDailyFlowsAsync(int accountId, DateOnly monthStart, CancellationToken ct)
    {
        var rows = await context.Transactions
            .Where(t => t.AccountId == accountId && t.AccountingMonth == monthStart)
            .GroupBy(t => new { t.BookingDate, t.Type, IsFixedCost = t.FixedCostId != null })
            .Select(g => new
            {
                g.Key.BookingDate,
                g.Key.Type,
                g.Key.IsFixedCost,
                Amount = g.Sum(t => t.Amount),
                Count = g.Count()
            })
            .ToListAsync(ct);

        return rows
            .Select(r => new DailyFlow(r.BookingDate, r.Type, r.IsFixedCost, r.Amount, r.Count))
            .ToList();
    }

    /// <summary>
    /// Der Tag des Monats, an dem eine Buchung im Verlauf erscheint. Das Rechnungsmonat
    /// entscheidet über die Zugehörigkeit, der Buchungstag über die Stelle — liegt er davor
    /// oder danach, rutscht die Buchung an den Rand des Monats, statt aus dem Verlauf zu fallen.
    /// </summary>
    private static int ClampToDay(DateOnly bookingDate, DateOnly monthStart, DateOnly monthEnd, int daysInMonth)
    {
        if (bookingDate < monthStart) return 1;
        if (bookingDate > monthEnd) return daysInMonth;
        return bookingDate.Day;
    }

    private static List<BalancePointDto> BuildTrend(
        IReadOnlyList<DailyFlow> flows, AccountingMonth month, int daysInMonth, DateOnly monthStart, DateOnly monthEnd)
    {
        var income = new decimal[daysInMonth + 1];
        var expenses = new decimal[daysInMonth + 1];
        var bookings = new int[daysInMonth + 1];

        foreach (var flow in flows)
        {
            var day = ClampToDay(flow.BookingDate, monthStart, monthEnd, daysInMonth);
            bookings[day] += flow.Count;

            if (flow.Type == TransactionType.Income)
                income[day] += flow.Amount;
            else
                expenses[day] += flow.Amount;
        }

        var points = new List<BalancePointDto>(daysInMonth);
        var running = 0m;

        for (var day = 1; day <= daysInMonth; day++)
        {
            running += income[day] - expenses[day];

            points.Add(new BalancePointDto
            {
                Day = day,
                Date = new DateOnly(month.Year, month.Month, day).ToString("yyyy-MM-dd"),
                Income = Round(income[day]),
                Expenses = Round(expenses[day]),
                Value = Round(running),
                HasBookings = bookings[day] > 0
            });
        }

        return points;
    }

    // --- Summen ----------------------------------------------------------

    /// <summary>
    /// Die Monatssummen, wie sie der Verlauf sieht. <paramref name="VariableToDate"/> trennt
    /// die variablen Ausgaben bis einschließlich heute ab — nur sie taugen als Grundlage einer
    /// Hochrechnung, alles danach ist bereits Zukunft.
    /// </summary>
    private sealed record FlowTotals(
        decimal Income,
        decimal Expenses,
        decimal VariableExpenses,
        decimal VariableToDate);

    private static FlowTotals SumFlows(
        IReadOnlyList<DailyFlow> flows, DateOnly monthStart, DateOnly monthEnd, int daysInMonth, int? currentDay)
    {
        var income = 0m;
        var expenses = 0m;
        var variable = 0m;
        var variableToDate = 0m;

        foreach (var flow in flows)
        {
            if (flow.Type == TransactionType.Income)
            {
                income += flow.Amount;
                continue;
            }

            expenses += flow.Amount;
            if (flow.IsFixedCost)
                continue;

            variable += flow.Amount;

            var day = ClampToDay(flow.BookingDate, monthStart, monthEnd, daysInMonth);
            // Ohne laufenden Monat gibt es kein „bis heute“: dann zählt der ganze Monat als vergangen.
            if (currentDay is null || day <= currentDay.Value)
                variableToDate += flow.Amount;
        }

        return new FlowTotals(income, expenses, variable, variableToDate);
    }

    /// <summary>
    /// Monatsübergreifender Kontostand: Anfangssaldo + alle Einnahmen − alle Ausgaben. Noch
    /// nicht abgebuchte Ausgaben zählen voll mit, wie überall sonst auch.
    /// </summary>
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

    // --- Kennzahlen ------------------------------------------------------

    /// <summary>
    /// Der Spielraum pro Tag. Vom Kontostand geht nur die <em>Restverpflichtung</em> der
    /// Fixkosten ab — bereits gebuchte Fixkosten sind im Kontostand schon enthalten und
    /// würden sonst ein zweites Mal abgezogen.
    /// </summary>
    private static DailyAllowanceDto BuildDailyAllowance(
        decimal balance,
        FixedCostTotals fixedCosts,
        FlowTotals totals,
        MonthPosition position,
        int daysInMonth,
        int? currentDay)
    {
        var openFixedCosts = Round(fixedCosts.Effective - fixedCosts.Booked);
        var available = Round(balance - openFixedCosts);

        // Ein abgeschlossener Monat hat keinen Spielraum mehr. Statt einer leeren Kachel
        // zeigt er, was tatsächlich pro Tag ausgegeben wurde — dieselbe Größenordnung,
        // rückblickend gelesen.
        if (position == MonthPosition.Past)
        {
            return new DailyAllowanceDto
            {
                Amount = Round(totals.Expenses / daysInMonth),
                Balance = balance,
                OpenFixedCosts = openFixedCosts,
                Available = available,
                Days = daysInMonth,
                Mode = DailyAllowanceMode.PastAverage
            };
        }

        // Heute zählt mit: der Tag ist noch nicht vorbei und sein Budget noch nicht verbraucht.
        var days = currentDay is null ? daysInMonth : daysInMonth - currentDay.Value + 1;

        return new DailyAllowanceDto
        {
            // Einen negativen Spielraum gibt es nicht — reicht der Kontostand nicht, steht die
            // Unterdeckung in Available und wird dort erklärt, statt die Kachel ins Minus zu ziehen.
            Amount = Math.Max(0m, Round(available / days)),
            Balance = balance,
            OpenFixedCosts = openFixedCosts,
            Available = available,
            Days = days,
            Mode = currentDay is null ? DailyAllowanceMode.FullMonth : DailyAllowanceMode.RemainingDays
        };
    }

    /// <summary>
    /// Das erwartete Ergebnis am Monatsende. Die Fixkosten zählen mit ihrem effektiven Betrag,
    /// die variablen Ausgaben werden aus dem bisherigen Tagesschnitt fortgeschrieben. Bereits
    /// für später erfasste Buchungen setzen dabei die Untergrenze — sie stehen schon fest und
    /// dürfen von einer niedrigen Hochrechnung nicht weggerechnet werden.
    /// </summary>
    private static ForecastDto BuildForecast(
        FlowTotals totals,
        FixedCostTotals fixedCosts,
        MonthPosition position,
        int daysInMonth,
        int? currentDay)
    {
        var baseline = totals.Income - fixedCosts.Effective;

        if (position != MonthPosition.Current || currentDay is null)
        {
            // Vergangener Monat: das Ergebnis steht fest. Zukünftiger Monat: es gibt keinen
            // Verlauf, aus dem sich etwas fortschreiben ließe.
            return new ForecastDto
            {
                Amount = Round(baseline - totals.VariableExpenses),
                ExpectedRemainingExpenses = 0m,
                DailyAverageExpenses = position == MonthPosition.Past
                    ? Round(totals.VariableExpenses / daysInMonth)
                    : 0m,
                RemainingDays = 0,
                IsProjected = false
            };
        }

        var elapsedDays = currentDay.Value;
        var remainingDays = daysInMonth - elapsedDays;
        var dailyAverage = totals.VariableToDate / elapsedDays;
        var alreadyPlanned = totals.VariableExpenses - totals.VariableToDate;
        var expectedRemaining = Math.Max(dailyAverage * remainingDays, alreadyPlanned);

        return new ForecastDto
        {
            Amount = Round(baseline - totals.VariableToDate - expectedRemaining),
            ExpectedRemainingExpenses = Round(expectedRemaining),
            DailyAverageExpenses = Round(dailyAverage),
            RemainingDays = remainingDays,
            IsProjected = remainingDays > 0
        };
    }

    // --- Plan gegen Ist --------------------------------------------------

    /// <summary>
    /// Geplant ist alles, was vorab feststand: das Budget der Kategorie plus ihre geplanten
    /// Fixkosten. Dagegen stehen sämtliche Ausgaben der Kategorie im Monat. Kategorien ohne
    /// Plan und ohne Ausgaben tauchen nicht auf; Buchungen ohne Kategorie bekommen eine eigene
    /// Zeile, damit die Summen mit denen des Monats übereinstimmen.
    /// </summary>
    private async Task<List<PlanComparisonItemDto>> BuildPlanComparisonAsync(
        int accountId, DateOnly monthStart, CancellationToken ct)
    {
        var budgets = await context.Budgets
            .Where(b => b.AccountId == accountId && b.Month == monthStart)
            .Select(b => new { b.CategoryId, b.Amount })
            .ToListAsync(ct);

        var fixedCosts = await context.FixedCosts
            .Where(f => f.AccountId == accountId && f.Month == monthStart)
            .GroupBy(f => f.CategoryId)
            .Select(g => new { CategoryId = g.Key, Amount = g.Sum(f => f.Amount) })
            .ToListAsync(ct);

        var actuals = await context.Transactions
            .Where(t => t.AccountId == accountId
                        && t.AccountingMonth == monthStart
                        && t.Type == TransactionType.Expense)
            .GroupBy(t => t.CategoryId)
            .Select(g => new { CategoryId = g.Key, Amount = g.Sum(t => t.Amount) })
            .ToListAsync(ct);

        // Buchungen ohne Kategorie laufen unter dem Schlüssel 0 — Kategorie-Ids beginnen bei 1,
        // und ein nicht-nullbarer Schlüssel erspart der Zuordnung eine Sonderbehandlung.
        var items = new Dictionary<int, PlanComparisonItemDto>();

        PlanComparisonItemDto Slot(int? categoryId)
        {
            var key = categoryId ?? NoCategoryKey;

            if (!items.TryGetValue(key, out var item))
            {
                item = new PlanComparisonItemDto { CategoryId = categoryId };
                items[key] = item;
            }

            return item;
        }

        foreach (var budget in budgets)
            Slot(budget.CategoryId).Budget += budget.Amount;

        foreach (var fixedCost in fixedCosts)
            Slot(fixedCost.CategoryId).FixedCosts += fixedCost.Amount;

        foreach (var actual in actuals)
            Slot(actual.CategoryId).Actual += actual.Amount;

        await ApplyCategoryLabelsAsync(accountId, items, ct);

        foreach (var item in items.Values)
        {
            item.Budget = Round(item.Budget);
            item.FixedCosts = Round(item.FixedCosts);
            item.Actual = Round(item.Actual);
            item.Planned = Round(item.Budget + item.FixedCosts);
            item.Difference = Round(item.Planned - item.Actual);
        }

        return items.Values
            // Der größte Plan zuerst; wo nichts geplant war, entscheidet die Höhe der Ausgabe.
            .OrderByDescending(i => i.Planned)
            .ThenByDescending(i => i.Actual)
            .ThenBy(i => i.CategoryName, StringComparer.CurrentCulture)
            .ToList();
    }

    /// <summary>Ergänzt Name, Farbe und Icon der beteiligten Kategorien in einer Abfrage.</summary>
    private async Task ApplyCategoryLabelsAsync(
        int accountId, Dictionary<int, PlanComparisonItemDto> items, CancellationToken ct)
    {
        var ids = items.Keys.Where(id => id != NoCategoryKey).ToList();

        var categories = ids.Count == 0
            ? []
            : await context.Categories
                .Where(c => c.AccountId == accountId && ids.Contains(c.Id))
                .Select(c => new { c.Id, c.Name, c.Color, c.Icon })
                .ToDictionaryAsync(c => c.Id, ct);

        foreach (var (categoryId, item) in items)
        {
            if (categories.TryGetValue(categoryId, out var category))
            {
                item.CategoryName = category.Name;
                item.CategoryColor = category.Color;
                item.CategoryIcon = category.Icon;
                continue;
            }

            item.CategoryName = "Ohne Kategorie";
        }
    }

    private static decimal Round(decimal value)
        => decimal.Round(value, MoneyScale, MidpointRounding.AwayFromZero);
}
