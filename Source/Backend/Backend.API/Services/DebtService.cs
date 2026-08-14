using Backend.Domain.Entities.Finance;
using Backend.Domain.Enums;
using Backend.Exceptions;
using Backend.Infrastructure.Persistence;
using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

/// <summary>
/// Schuldeinträge des Nutzers. Ein Eintrag hat bewusst keinen eigenen Sollbetrag —
/// verliehen und zurückgezahlt ergeben sich ausschließlich aus zugeordneten Buchungen.
/// Damit gibt es nur eine Wahrheit, und jeder ausgewiesene Betrag ist durch eine echte
/// Geldbewegung belegt.
/// </summary>
/// <remarks>
/// Die Zuordnung ist rein informativ: eine zugeordnete Buchung zählt in der
/// Monatsrechnung ihres Kontos unverändert weiter.
/// </remarks>
public sealed class DebtService(
    AppDbContext context,
    IAccountAccess accountAccess,
    ILogger<DebtService> logger) : IDebtService
{
    /// <summary>Nachkommastellen, auf die Beträge vor der Ausgabe gerundet werden.</summary>
    private const int MoneyScale = 2;

    /// <summary>Fällt zurück, solange der Nutzer noch kein Geldkonto angelegt hat.</summary>
    private const string FallbackCurrency = "EUR";

    public async Task<DebtOverviewDto> GetOverviewAsync(int userId, CancellationToken ct = default)
        => await BuildOverviewAsync(userId, ct);

    public async Task<DebtDto> GetAsync(int userId, int debtId, CancellationToken ct = default)
    {
        var currency = await ResolveCurrencyAsync(userId, ct);
        var items = await LoadItemsAsync(userId, currency, ct, debtId);

        return items.FirstOrDefault() ?? throw new NotFoundException("Der Schuldeintrag");
    }

    public async Task<DebtDto> CreateAsync(int userId, SaveDebtRequest request, CancellationToken ct = default)
    {
        var debt = new Debt
        {
            UserId = userId,
            PersonName = NormalizeRequired(request.PersonName, "Der Eintrag braucht einen Namen."),
            Title = NormalizeRequired(request.Title, "Der Eintrag braucht eine Bezeichnung."),
            Note = NormalizeOptional(request.Note)
        };

        context.Debts.Add(debt);
        await context.SaveChangesAsync(ct);

        logger.LogInformation("Schuldeintrag {DebtId} für Nutzer {UserId} angelegt.", debt.Id, userId);

        return await GetAsync(userId, debt.Id, ct);
    }

    public async Task<DebtDto> UpdateAsync(
        int userId, int debtId, SaveDebtRequest request, CancellationToken ct = default)
    {
        var debt = await FindAsync(userId, debtId, ct);

        debt.PersonName = NormalizeRequired(request.PersonName, "Der Eintrag braucht einen Namen.");
        debt.Title = NormalizeRequired(request.Title, "Der Eintrag braucht eine Bezeichnung.");
        debt.Note = NormalizeOptional(request.Note);
        debt.UpdatedAt = DateTime.UtcNow;

        await context.SaveChangesAsync(ct);

        logger.LogInformation("Schuldeintrag {DebtId} von Nutzer {UserId} aktualisiert.", debtId, userId);

        return await GetAsync(userId, debtId, ct);
    }

    public async Task DeleteAsync(int userId, int debtId, CancellationToken ct = default)
    {
        var debt = await FindAsync(userId, debtId, ct);

        // Buchungen sind echte Geldbewegungen und werden nie mitgelöscht — sie verlieren
        // nur die Zuordnung. Das ExecuteUpdate ignoriert den Query-Filter nicht, gelöschte
        // Buchungen bleiben also unberührt; ihre Zuordnung ist ohnehin folgenlos.
        var affected = await context.Transactions
            .Where(t => t.DebtId == debtId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.DebtId, (int?)null), ct);

        context.Debts.Remove(debt);
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Schuldeintrag {DebtId} von Nutzer {UserId} gelöscht; {TransactionCount} Buchungen wieder ohne Zuordnung.",
            debtId, userId, affected);
    }

    public async Task<IReadOnlyList<DebtTransactionDto>> GetAssignableTransactionsAsync(
        int userId, int debtId, string? search, int? accountId, CancellationToken ct = default)
    {
        await FindAsync(userId, debtId, ct);

        if (accountId is not null)
            await accountAccess.RequireOwnedAsync(userId, accountId.Value, ct);

        // Überweisungen zwischen eigenen Konten sind kein Verleih, und eine Buchung, die
        // bereits Fixkosten bezahlt, ist keine Geldleihe — beide bleiben außen vor.
        var query = context.Transactions
            .Where(t => t.Account.UserId == userId
                        && t.DebtId == null
                        && t.FixedCostId == null
                        && t.LinkedTransactionId == null);

        if (accountId is not null)
            query = query.Where(t => t.AccountId == accountId.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var pattern = $"%{search.Trim()}%";
            query = query.Where(t => EF.Functions.ILike(t.Title, pattern));
        }

        var items = await query
            .OrderByDescending(t => t.BookingDate)
            .ThenByDescending(t => t.Id)
            .Take(FinanceValidation.AssignableTransactionLimit)
            .Select(t => new DebtTransactionDto
            {
                Id = t.Id,
                AccountId = t.AccountId,
                AccountName = t.Account.Name,
                AccountColor = t.Account.Color,
                Direction = t.Type,
                Title = t.Title,
                Amount = t.Amount,
                Currency = t.Currency,
                BookingDate = t.BookingDate,
                CategoryName = t.Category != null ? t.Category.Name : null,
                CategoryColor = t.Category != null ? t.Category.Color : null,
                CategoryIcon = t.Category != null ? t.Category.Icon : null,
                AccountingMonthDate = t.AccountingMonth
            })
            .ToListAsync(ct);

        foreach (var item in items)
            item.Amount = Round(item.Amount);

        return items;
    }

    public async Task<DebtOverviewDto> LinkTransactionAsync(
        int userId, int debtId, int transactionId, CancellationToken ct = default)
    {
        await FindAsync(userId, debtId, ct);

        var transaction = await FindTransactionAsync(userId, transactionId, ct);
        await EnsureTransactionIsAssignableAsync(debtId, transaction, ct);

        transaction.DebtId = debtId;
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Buchung {TransactionId} dem Schuldeintrag {DebtId} von Nutzer {UserId} zugeordnet.",
            transactionId, debtId, userId);

        return await BuildOverviewAsync(userId, ct);
    }

    public async Task<DebtOverviewDto> UnlinkTransactionAsync(
        int userId, int debtId, int transactionId, CancellationToken ct = default)
    {
        await FindAsync(userId, debtId, ct);

        var transaction = await FindTransactionAsync(userId, transactionId, ct);

        if (transaction.DebtId != debtId)
            throw new BusinessRuleException("Diese Buchung gehört nicht zu dem gewählten Schuldeintrag.");

        transaction.DebtId = null;
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Zuordnung der Buchung {TransactionId} zum Schuldeintrag {DebtId} von Nutzer {UserId} gelöst.",
            transactionId, debtId, userId);

        return await BuildOverviewAsync(userId, ct);
    }

    // --- Intern ---------------------------------------------------------

    private IQueryable<Debt> QueryOwned(int userId)
        => context.Debts.Where(d => d.UserId == userId);

    private async Task<DebtOverviewDto> BuildOverviewAsync(int userId, CancellationToken ct)
    {
        var currency = await ResolveCurrencyAsync(userId, ct);
        var debts = await LoadItemsAsync(userId, currency, ct);

        // Personen werden über den kleingeschriebenen Namen zusammengefasst: „anna“ und
        // „Anna“ sind dieselbe Person, angezeigt wird die zuerst erfasste Schreibweise.
        var debtors = debts
            .GroupBy(d => d.PersonName, StringComparer.OrdinalIgnoreCase)
            .Select(group => new DebtorSummaryDto
            {
                PersonName = group.First().PersonName,
                Currency = currency,
                LentAmount = Round(group.Sum(d => d.LentAmount)),
                RepaidAmount = Round(group.Sum(d => d.RepaidAmount)),
                OutstandingAmount = Round(group.Sum(d => d.OutstandingAmount)),
                DebtCount = group.Count(),
                OpenCount = group.Count(d => d.Status == DebtStatus.Open),
                Debts = group.ToList()
            })
            // Wer noch Geld schuldet, steht oben — das ist die Frage, mit der die Seite
            // geöffnet wird. Innerhalb dessen nach Höhe, dann alphabetisch.
            .OrderByDescending(d => d.OutstandingAmount > 0m)
            .ThenByDescending(d => d.OutstandingAmount)
            .ThenBy(d => d.PersonName, StringComparer.CurrentCultureIgnoreCase)
            .ToList();

        return new DebtOverviewDto
        {
            Currency = currency,
            TotalLent = Round(debts.Sum(d => d.LentAmount)),
            TotalRepaid = Round(debts.Sum(d => d.RepaidAmount)),
            TotalOutstanding = Round(debts.Sum(d => d.OutstandingAmount)),
            DebtorCount = debtors.Count,
            DebtCount = debts.Count,
            OpenCount = debts.Count(d => d.Status == DebtStatus.Open),
            Debtors = debtors
        };
    }

    /// <summary>
    /// Lädt alle Einträge eines Nutzers — oder, mit <paramref name="debtId"/>, einen einzelnen.
    /// Beträge und Buchungen kommen in einem Durchgang aus der Datenbank; gerundet wird erst hier.
    /// </summary>
    private async Task<List<DebtDto>> LoadItemsAsync(
        int userId, string currency, CancellationToken ct, int? debtId = null)
    {
        var query = QueryOwned(userId);

        if (debtId is not null)
            query = query.Where(d => d.Id == debtId);

        var rows = await query
            .OrderBy(d => d.PersonName)
            .ThenBy(d => d.Id)
            .Select(d => new
            {
                d.Id,
                d.PersonName,
                d.Title,
                d.Note,
                LentAmount = d.Transactions
                    .Where(t => t.Type == TransactionType.Expense)
                    .Sum(t => (decimal?)t.Amount) ?? 0m,
                RepaidAmount = d.Transactions
                    .Where(t => t.Type == TransactionType.Income)
                    .Sum(t => (decimal?)t.Amount) ?? 0m,
                TransactionCount = d.Transactions.Count(),
                Transactions = d.Transactions
                    .OrderByDescending(t => t.BookingDate)
                    .ThenByDescending(t => t.Id)
                    .Select(t => new DebtTransactionDto
                    {
                        Id = t.Id,
                        AccountId = t.AccountId,
                        AccountName = t.Account.Name,
                        AccountColor = t.Account.Color,
                        Direction = t.Type,
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
                var lent = Round(r.LentAmount);
                var repaid = Round(r.RepaidAmount);

                foreach (var transaction in r.Transactions)
                    transaction.Amount = Round(transaction.Amount);

                return new DebtDto
                {
                    Id = r.Id,
                    PersonName = r.PersonName,
                    Title = r.Title,
                    Note = r.Note,
                    Currency = currency,
                    LentAmount = lent,
                    RepaidAmount = repaid,
                    OutstandingAmount = Round(lent - repaid),
                    TransactionCount = r.TransactionCount,
                    Status = DetermineStatus(r.TransactionCount, lent, repaid),
                    Transactions = r.Transactions
                };
            })
            .ToList();
    }

    private static DebtStatus DetermineStatus(int transactionCount, decimal lent, decimal repaid)
    {
        if (transactionCount == 0)
            return DebtStatus.Empty;

        var outstanding = lent - repaid;

        if (outstanding > 0m)
            return DebtStatus.Open;

        return outstanding < 0m ? DebtStatus.Overpaid : DebtStatus.Settled;
    }

    /// <summary>
    /// Die Währung, in der die Seite rechnet. Alle Konten eines Nutzers laufen in derselben
    /// Währung; gemischte Zuordnungen werden beim Verknüpfen abgewiesen.
    /// </summary>
    private async Task<string> ResolveCurrencyAsync(int userId, CancellationToken ct)
    {
        var currency = await accountAccess.QueryOwned(userId)
            .OrderBy(a => a.Id)
            .Select(a => a.Currency)
            .FirstOrDefaultAsync(ct);

        return string.IsNullOrWhiteSpace(currency) ? FallbackCurrency : currency;
    }

    private async Task<Debt> FindAsync(int userId, int debtId, CancellationToken ct)
    {
        var debt = await QueryOwned(userId).FirstOrDefaultAsync(d => d.Id == debtId, ct);

        if (debt is null)
        {
            logger.LogInformation("Schuldeintrag {DebtId} für Nutzer {UserId} nicht gefunden.", debtId, userId);
            throw new NotFoundException("Der Schuldeintrag");
        }

        return debt;
    }

    private async Task<Transaction> FindTransactionAsync(int userId, int transactionId, CancellationToken ct)
    {
        var transaction = await context.Transactions
            .FirstOrDefaultAsync(t => t.Id == transactionId && t.Account.UserId == userId, ct);

        if (transaction is null)
        {
            logger.LogInformation("Buchung {TransactionId} für Nutzer {UserId} nicht gefunden.", transactionId, userId);
            throw new NotFoundException("Die Buchung");
        }

        return transaction;
    }

    private async Task EnsureTransactionIsAssignableAsync(int debtId, Transaction transaction, CancellationToken ct)
    {
        if (transaction.DebtId == debtId)
            throw new BusinessRuleException("Diese Buchung ist diesem Eintrag bereits zugeordnet.");

        if (transaction.DebtId is not null)
            throw new BusinessRuleException("Diese Buchung ist bereits einem anderen Schuldeintrag zugeordnet.");

        if (transaction.FixedCostId is not null)
            throw new BusinessRuleException("Diese Buchung bezahlt bereits Fixkosten und kann kein Verleih sein.");

        if (transaction.LinkedTransactionId is not null)
            throw new BusinessRuleException(
                "Überweisungen zwischen eigenen Konten können nicht als Schuld hinterlegt werden.");

        // Vermischte Währungen würden die Summen des Eintrags stillschweigend falsch machen.
        var existingCurrency = await context.Transactions
            .Where(t => t.DebtId == debtId)
            .Select(t => t.Currency)
            .FirstOrDefaultAsync(ct);

        if (existingCurrency is not null && existingCurrency != transaction.Currency)
            throw new CurrencyMismatchException(existingCurrency, transaction.Currency);
    }

    private static string NormalizeRequired(string value, string message)
    {
        var trimmed = value.Trim();

        if (trimmed.Length == 0)
            throw new BusinessRuleException(message);

        return trimmed;
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static decimal Round(decimal value)
        => decimal.Round(value, MoneyScale, MidpointRounding.AwayFromZero);
}
