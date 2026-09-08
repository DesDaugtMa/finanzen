using Backend.Domain.Enums;
using Backend.Exceptions;
using Backend.Infrastructure.Persistence;
using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Backend.ValueObjects;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

/// <summary>
/// Die konten-übergreifende Bilanz. Alle Summen laufen als SQL-Aggregat auf
/// <c>decimal</c>; gerundet wird ausschließlich am Ende für die Ausgabe, damit
/// sich Rundungsfehler nicht über die Zwischenschritte aufsummieren.
/// </summary>
public sealed class BalanceService(
    AppDbContext context,
    IAccountAccess accountAccess,
    ILogger<BalanceService> logger) : IBalanceService
{
    private const string DefaultCurrency = "EUR";

    private const int MoneyScale = 2;

    /// <summary>Die Kontokategorien in der Reihenfolge, in der die Übersicht sie zeigt.</summary>
    private static readonly AccountType[] GroupOrder =
    [
        AccountType.CheckingAccount,
        AccountType.SavingsAccount,
        AccountType.Depot,
        AccountType.CryptoWallet
    ];

    private const int MonthsPerYear = 12;

    public async Task<OverallMonthBalanceDto> GetMonthAsync(int userId, AccountingMonth month, CancellationToken ct = default)
    {
        var result = await ComputeAsync(userId, BalancePeriod.ForMonth(month), ct);

        if (result is null)
        {
            logger.LogInformation("Monatsbilanz {Month} für Nutzer {UserId}: keine Konten vorhanden.", month, userId);
            return new OverallMonthBalanceDto { Month = month.ToString(), Currency = DefaultCurrency };
        }

        logger.LogDebug(
            "Monatsbilanz {Month} für Nutzer {UserId} über {AccountCount} Konten berechnet.",
            month, userId, result.Entries.Count);

        return new OverallMonthBalanceDto
        {
            Month = month.ToString(),
            Currency = result.Currency,
            Income = result.Income,
            Expenses = result.Expenses,
            Net = result.Net,
            TransferVolume = result.TransferVolume,
            PreviousNet = result.PreviousNet,
            NetWorth = result.NetWorth,
            SettledNetWorth = result.SettledNetWorth,
            PendingTotal = result.PendingTotal,
            PendingCount = result.PendingCount,
            TransactionCount = result.TransactionCount,
            Groups = result.Groups
        };
    }

    public async Task<PeriodBalanceDto> GetPeriodAsync(int userId, BalancePeriod period, CancellationToken ct = default)
    {
        var result = await ComputeAsync(userId, period, ct);

        if (result is null)
        {
            logger.LogInformation("Zeitraumbilanz {Period} für Nutzer {UserId}: keine Konten vorhanden.", period, userId);
            return new PeriodBalanceDto { Period = period.ToString(), Kind = period.Kind, Currency = DefaultCurrency };
        }

        logger.LogDebug(
            "Zeitraumbilanz {Period} für Nutzer {UserId} über {AccountCount} Konten berechnet.",
            period, userId, result.Entries.Count);

        return new PeriodBalanceDto
        {
            Period = period.ToString(),
            Kind = period.Kind,
            Currency = result.Currency,
            Income = result.Income,
            Expenses = result.Expenses,
            Net = result.Net,
            TransferVolume = result.TransferVolume,
            PreviousNet = result.PreviousNet,
            NetWorth = result.NetWorth,
            SettledNetWorth = result.SettledNetWorth,
            PendingTotal = result.PendingTotal,
            PendingCount = result.PendingCount,
            TransactionCount = result.TransactionCount,
            Groups = result.Groups
        };
    }

    public async Task<YearBalanceDto> GetYearAsync(int userId, int year, CancellationToken ct = default)
    {
        if (!AccountingMonth.IsSupportedYear(year))
            throw new BusinessRuleException($"Das Jahr muss zwischen {AccountingMonth.MinYear} und {AccountingMonth.MaxYear} liegen.");

        var accountIds = await accountAccess.QueryOwned(userId).Select(a => a.Id).ToListAsync(ct);
        var currency = await LoadCurrencyAsync(userId, ct);

        var months = accountIds.Count == 0
            ? EmptyYearPoints(year)
            : await LoadYearPointsAsync(accountIds, year, ct);

        logger.LogDebug("Jahresbilanz {Year} für Nutzer {UserId} über {AccountCount} Konten berechnet.",
            year, userId, accountIds.Count);

        return BuildYear(year, currency, months);
    }

    // --- Zeitraum (Monat oder Jahr) --------------------------------------

    /// <summary>
    /// Das fertig gerechnete Ergebnis eines Zeitraums, bevor es in das jeweilige
    /// DTO gegossen wird. Monats- und Zeitraumbilanz unterscheiden sich nur in der
    /// Hülle, nicht in der Rechnung — deshalb liegt sie genau einmal hier.
    /// </summary>
    private sealed record PeriodResult(
        string Currency,
        IReadOnlyList<AccountBalanceDto> Entries,
        IReadOnlyList<AccountGroupBalanceDto> Groups,
        decimal Income,
        decimal Expenses,
        decimal Net,
        decimal TransferVolume,
        decimal PreviousNet,
        decimal NetWorth,
        decimal SettledNetWorth,
        decimal PendingTotal,
        int PendingCount,
        int TransactionCount);

    /// <summary>
    /// Berechnet die Bilanz eines Zeitraums samt Kontoaufschlüsselung.
    /// Gibt <c>null</c> zurück, wenn der Nutzer noch kein Konto hat — dann gibt es
    /// nichts zu rechnen und der Aufrufer liefert seine leere Hülle aus.
    /// </summary>
    private async Task<PeriodResult?> ComputeAsync(int userId, BalancePeriod period, CancellationToken ct)
    {
        var accounts = await LoadAccountsAsync(userId, ct);

        if (accounts.Count == 0)
            return null;

        var accountIds = accounts.Select(a => a.AccountId).ToList();
        var previous = period.Previous();

        var current = await LoadTotalsPerAccountAsync(accountIds, period, ct);
        var previousNet = await LoadNetAsync(accountIds, previous, ct);
        var transferVolume = await LoadTransferVolumeAsync(accountIds, period, ct);

        var entries = accounts
            .Select(a => BuildAccountBalance(a, current.GetValueOrDefault(a.AccountId)))
            .ToList();

        return new PeriodResult(
            Currency: accounts[0].Currency,
            Entries: entries,
            Groups: BuildGroups(entries),
            Income: Round(entries.Sum(e => e.Income)),
            Expenses: Round(entries.Sum(e => e.Expenses)),
            Net: Round(entries.Sum(e => e.Net)),
            TransferVolume: Round(transferVolume),
            PreviousNet: Round(previousNet),
            NetWorth: Round(entries.Sum(e => e.CurrentBalance)),
            SettledNetWorth: Round(entries.Sum(e => e.SettledBalance)),
            PendingTotal: Round(entries.Sum(e => e.PendingTotal)),
            PendingCount: entries.Sum(e => e.PendingCount),
            TransactionCount: entries.Sum(e => e.TransactionCount));
    }

    private sealed record AccountRow(
        int AccountId,
        string Name,
        AccountType Type,
        string? BankName,
        string? Iban,
        string? Color,
        string Currency,
        decimal InitialBalance,
        decimal CurrentBalance,
        decimal PendingTotal,
        int PendingCount);

    /// <summary>Summen eines Kontos in einem Zeitraum, ohne Umbuchungen zwischen eigenen Konten.</summary>
    private sealed record FlowTotals(decimal Income, decimal Expenses, int TransactionCount)
    {
        public static readonly FlowTotals Empty = new(0m, 0m, 0);
    }

    /// <summary>
    /// Alle Konten des Nutzers mit ihrem monatsübergreifenden Kontostand. Umbuchungen
    /// zählen hier bewusst mit: sie verschieben Geld zwischen den Konten und verändern
    /// damit sehr wohl den einzelnen Kontostand.
    ///
    /// Noch nicht abgebuchte Ausgaben zählen ebenfalls voll mit — der Kontostand soll den
    /// Stand nach der Abbuchung zeigen. Ihre Summe wird zusätzlich mitgeführt, damit sich
    /// daraus der zweite Stand „laut Bank" ohne weitere Abfrage ergibt.
    /// </summary>
    private async Task<List<AccountRow>> LoadAccountsAsync(int userId, CancellationToken ct)
        => await accountAccess.QueryOwned(userId)
            .OrderBy(a => a.Type)
            .ThenBy(a => a.Name)
            .ThenBy(a => a.Id)
            .Select(a => new AccountRow(
                a.Id,
                a.Name,
                a.Type,
                a.BankName,
                a.Iban,
                a.Color,
                a.Currency,
                a.InitialBalance,
                a.InitialBalance
                    + a.Transactions.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount)
                    - a.Transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
                a.Transactions.Where(t => t.IsPending).Sum(t => t.Amount),
                a.Transactions.Count(t => t.IsPending)))
            .ToListAsync(ct);

    private async Task<Dictionary<int, FlowTotals>> LoadTotalsPerAccountAsync(
        IReadOnlyCollection<int> accountIds, BalancePeriod period, CancellationToken ct)
    {
        var rows = await QueryInPeriod(accountIds, period)
            .GroupBy(t => t.AccountId)
            .Select(g => new
            {
                AccountId = g.Key,
                Income = g.Where(t => t.Type == TransactionType.Income).Sum(t => (decimal?)t.Amount) ?? 0m,
                Expenses = g.Where(t => t.Type == TransactionType.Expense).Sum(t => (decimal?)t.Amount) ?? 0m,
                Count = g.Count()
            })
            .ToListAsync(ct);

        return rows.ToDictionary(r => r.AccountId, r => new FlowTotals(r.Income, r.Expenses, r.Count));
    }

    private async Task<decimal> LoadNetAsync(IReadOnlyCollection<int> accountIds, BalancePeriod period, CancellationToken ct)
    {
        var totals = await QueryInPeriod(accountIds, period)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Income = g.Where(t => t.Type == TransactionType.Income).Sum(t => (decimal?)t.Amount) ?? 0m,
                Expenses = g.Where(t => t.Type == TransactionType.Expense).Sum(t => (decimal?)t.Amount) ?? 0m
            })
            .FirstOrDefaultAsync(ct);

        return (totals?.Income ?? 0m) - (totals?.Expenses ?? 0m);
    }

    /// <summary>
    /// Bewegtes Volumen der Umbuchungen. Gezählt wird nur die Ausgabenseite, denn jede
    /// Umbuchung besteht aus genau einem Ausgangs- und einem Eingangssatz — über beide
    /// Seiten zu summieren würde jeden Betrag doppelt ausweisen.
    /// </summary>
    private async Task<decimal> LoadTransferVolumeAsync(
        IReadOnlyCollection<int> accountIds, BalancePeriod period, CancellationToken ct)
        => await context.Transactions
            .Where(t => accountIds.Contains(t.AccountId)
                        && t.AccountingMonth >= period.Start
                        && t.AccountingMonth < period.EndExclusive
                        && t.LinkedTransactionId != null
                        && t.Type == TransactionType.Expense)
            .SumAsync(t => (decimal?)t.Amount, ct) ?? 0m;

    /// <summary>Die bilanzrelevanten Buchungen innerhalb der Grenzen eines Zeitraums.</summary>
    private IQueryable<Domain.Entities.Finance.Transaction> QueryInPeriod(
        IReadOnlyCollection<int> accountIds, BalancePeriod period)
        => QueryBalanceRelevant(accountIds)
            .Where(t => t.AccountingMonth >= period.Start && t.AccountingMonth < period.EndExclusive);

    /// <summary>
    /// Die für eine konten-übergreifende Bilanz zählenden Buchungen: alles außer
    /// Umbuchungen zwischen eigenen Konten. Diese verschieben Geld nur von einer Tasche
    /// in die andere und dürfen die Einnahmen- und Ausgabenseite nicht aufblähen.
    /// </summary>
    private IQueryable<Domain.Entities.Finance.Transaction> QueryBalanceRelevant(IReadOnlyCollection<int> accountIds)
        => context.Transactions.Where(t => accountIds.Contains(t.AccountId) && t.LinkedTransactionId == null);

    private static AccountBalanceDto BuildAccountBalance(AccountRow account, FlowTotals? totals)
    {
        var flow = totals ?? FlowTotals.Empty;

        return new AccountBalanceDto
        {
            AccountId = account.AccountId,
            Name = account.Name,
            Type = account.Type,
            BankName = account.BankName,
            Iban = account.Iban,
            Color = account.Color,
            Currency = account.Currency,
            InitialBalance = Round(account.InitialBalance),
            CurrentBalance = Round(account.CurrentBalance),
            // Die offenen Ausgaben sind im Kontostand schon abgezogen; für den Stand „laut
            // Bank" kommen sie deshalb wieder drauf.
            SettledBalance = Round(account.CurrentBalance + account.PendingTotal),
            PendingTotal = Round(account.PendingTotal),
            PendingCount = account.PendingCount,
            Income = Round(flow.Income),
            Expenses = Round(flow.Expenses),
            Net = Round(flow.Income - flow.Expenses),
            TransactionCount = flow.TransactionCount
        };
    }

    /// <summary>Gruppiert die Konten nach Kategorie. Kategorien ohne Konto fallen heraus.</summary>
    private static IReadOnlyList<AccountGroupBalanceDto> BuildGroups(IReadOnlyCollection<AccountBalanceDto> entries)
        => GroupOrder
            .Select(type => new { Type = type, Accounts = entries.Where(e => e.Type == type).ToList() })
            .Where(g => g.Accounts.Count > 0)
            .Select(g => new AccountGroupBalanceDto
            {
                Type = g.Type,
                Currency = g.Accounts[0].Currency,
                Income = Round(g.Accounts.Sum(a => a.Income)),
                Expenses = Round(g.Accounts.Sum(a => a.Expenses)),
                Net = Round(g.Accounts.Sum(a => a.Net)),
                Balance = Round(g.Accounts.Sum(a => a.CurrentBalance)),
                SettledBalance = Round(g.Accounts.Sum(a => a.SettledBalance)),
                PendingTotal = Round(g.Accounts.Sum(a => a.PendingTotal)),
                PendingCount = g.Accounts.Sum(a => a.PendingCount),
                Accounts = g.Accounts
            })
            .ToList();

    // --- Jahresverlauf ---------------------------------------------------

    private async Task<string> LoadCurrencyAsync(int userId, CancellationToken ct)
        => await accountAccess.QueryOwned(userId)
            .OrderBy(a => a.Type)
            .ThenBy(a => a.Name)
            .ThenBy(a => a.Id)
            .Select(a => a.Currency)
            .FirstOrDefaultAsync(ct) ?? DefaultCurrency;

    /// <summary>
    /// Die zwölf Monate des Jahres. Monate ohne Buchungen kommen aus der Datenbank
    /// gar nicht zurück, werden hier aber als Nullpunkte ergänzt — der Verlauf soll
    /// eine lückenlose Zeitachse zeigen und keine zusammengeschobene Auswahl.
    /// </summary>
    private async Task<List<MonthBalancePointDto>> LoadYearPointsAsync(
        IReadOnlyCollection<int> accountIds, int year, CancellationToken ct)
    {
        var start = new DateOnly(year, 1, 1);
        var end = start.AddYears(1);

        var rows = await QueryBalanceRelevant(accountIds)
            .Where(t => t.AccountingMonth >= start && t.AccountingMonth < end)
            .GroupBy(t => t.AccountingMonth)
            .Select(g => new
            {
                Month = g.Key,
                Income = g.Where(t => t.Type == TransactionType.Income).Sum(t => (decimal?)t.Amount) ?? 0m,
                Expenses = g.Where(t => t.Type == TransactionType.Expense).Sum(t => (decimal?)t.Amount) ?? 0m,
                Count = g.Count()
            })
            .ToListAsync(ct);

        var byMonth = rows.ToDictionary(r => r.Month.Month);

        return Enumerable.Range(1, MonthsPerYear)
            .Select(number =>
            {
                var key = new AccountingMonth(year, number).ToString();

                if (!byMonth.TryGetValue(number, out var row))
                    return new MonthBalancePointDto { Month = key };

                return new MonthBalancePointDto
                {
                    Month = key,
                    Income = Round(row.Income),
                    Expenses = Round(row.Expenses),
                    Net = Round(row.Income - row.Expenses),
                    TransactionCount = row.Count
                };
            })
            .ToList();
    }

    private static List<MonthBalancePointDto> EmptyYearPoints(int year)
        => Enumerable.Range(1, MonthsPerYear)
            .Select(number => new MonthBalancePointDto { Month = new AccountingMonth(year, number).ToString() })
            .ToList();

    private static YearBalanceDto BuildYear(int year, string currency, IReadOnlyList<MonthBalancePointDto> months)
    {
        // Nur Monate mit Buchungen zählen für Durchschnitt und Extremwerte. Ein noch
        // nicht angebrochener Monat ist kein Monat mit einer Bilanz von null — er würde
        // den Durchschnitt sonst systematisch gegen null ziehen.
        var booked = months.Where(m => m.TransactionCount > 0).ToList();

        return new YearBalanceDto
        {
            Year = year,
            Currency = currency,
            Income = Round(months.Sum(m => m.Income)),
            Expenses = Round(months.Sum(m => m.Expenses)),
            Net = Round(months.Sum(m => m.Net)),
            AverageNet = booked.Count == 0 ? 0m : Round(booked.Sum(m => m.Net) / booked.Count),
            BestMonth = booked.Count == 0 ? null : booked.MaxBy(m => m.Net)!.Month,
            WorstMonth = booked.Count == 0 ? null : booked.MinBy(m => m.Net)!.Month,
            Months = months
        };
    }

    private static decimal Round(decimal value)
        => decimal.Round(value, MoneyScale, MidpointRounding.AwayFromZero);
}
