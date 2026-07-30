using Backend.Domain.Entities.Finance;
using Backend.Domain.Enums;
using Backend.Exceptions;
using Backend.Infrastructure.Persistence;
using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;
using System.Text.RegularExpressions;

namespace Backend.Services;

public sealed partial class BankAccountService(
    AppDbContext context,
    ICategoryService categoryService,
    ILogger<BankAccountService> logger) : IBankAccountService
{
    private const string DefaultCurrency = "EUR";

    /// <summary>Nachkommastellen, auf die Kontostände vor der Ausgabe gerundet werden.</summary>
    private const int BalanceScale = 2;

    public async Task<IReadOnlyList<BankAccountDto>> ListMineAsync(int userId, CancellationToken ct = default)
    {
        var accounts = await QueryMine(userId)
            .OrderBy(a => a.Name)
            .ThenBy(a => a.Id)
            .Select(ProjectToDto)
            .ToListAsync(ct);

        return accounts.Select(RoundBalances).ToList();
    }

    public async Task<BankAccountDto> GetMineAsync(int userId, int accountId, CancellationToken ct = default)
    {
        var account = await QueryMine(userId)
            .Where(a => a.Id == accountId)
            .Select(ProjectToDto)
            .FirstOrDefaultAsync(ct);

        if (account is null)
        {
            logger.LogInformation("Girokonto {AccountId} für Nutzer {UserId} nicht gefunden.", accountId, userId);
            throw new NotFoundException("Das Girokonto");
        }

        return RoundBalances(account);
    }

    public async Task<BankAccountDto> CreateAsync(int userId, CreateBankAccountRequest request, CancellationToken ct = default)
    {
        var account = new Account
        {
            UserId = userId,
            Name = request.Name.Trim(),
            Type = AccountType.CheckingAccount,
            BankName = NormalizeOptional(request.BankName),
            Iban = NormalizeIban(request.Iban),
            Color = NormalizeColor(request.Color),
            Currency = DefaultCurrency,
            InitialBalance = request.InitialBalance
        };

        context.Accounts.Add(account);
        await context.SaveChangesAsync(ct);

        // Ein frisches Konto ist ohne Kategorien nicht benutzbar; der Standardsatz
        // lässt sich anschließend beliebig anpassen oder löschen.
        categoryService.AddDefaults(account.Id);
        await context.SaveChangesAsync(ct);

        logger.LogInformation("Girokonto {AccountId} für Nutzer {UserId} angelegt.", account.Id, userId);

        return await GetMineAsync(userId, account.Id, ct);
    }

    public async Task<BankAccountDto> UpdateAsync(int userId, int accountId, UpdateBankAccountRequest request, CancellationToken ct = default)
    {
        var account = await FindMineAsync(userId, accountId, ct);

        account.Name = request.Name.Trim();
        account.BankName = NormalizeOptional(request.BankName);
        account.Iban = NormalizeIban(request.Iban);
        account.Color = NormalizeColor(request.Color);
        account.InitialBalance = request.InitialBalance;

        await context.SaveChangesAsync(ct);

        logger.LogInformation("Girokonto {AccountId} für Nutzer {UserId} aktualisiert.", accountId, userId);

        return await GetMineAsync(userId, accountId, ct);
    }

    public async Task DeleteAsync(int userId, int accountId, CancellationToken ct = default)
    {
        var account = await FindMineAsync(userId, accountId, ct);

        account.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync(ct);

        logger.LogInformation("Girokonto {AccountId} für Nutzer {UserId} gelöscht.", accountId, userId);
    }

    // --- Intern ---------------------------------------------------------

    private IQueryable<Account> QueryMine(int userId)
        => context.Accounts.Where(a => a.UserId == userId && a.Type == AccountType.CheckingAccount);

    private async Task<Account> FindMineAsync(int userId, int accountId, CancellationToken ct)
    {
        var account = await QueryMine(userId).FirstOrDefaultAsync(a => a.Id == accountId, ct);

        if (account is null)
        {
            logger.LogInformation("Girokonto {AccountId} für Nutzer {UserId} nicht gefunden.", accountId, userId);
            throw new NotFoundException("Das Girokonto");
        }

        return account;
    }

    /// <summary>
    /// Projektion inklusive Kontostand. Die Summen laufen als SQL-Aggregat auf <c>decimal</c>,
    /// die Soft-Delete-Query-Filter der Transaktionen greifen dabei automatisch.
    /// </summary>
    private static Expression<Func<Account, BankAccountDto>> ProjectToDto =>
        a => new BankAccountDto
        {
            Id = a.Id,
            Name = a.Name,
            BankName = a.BankName,
            Iban = a.Iban,
            Color = a.Color,
            Currency = a.Currency,
            InitialBalance = a.InitialBalance,
            CurrentBalance = a.InitialBalance
                + a.Transactions.Where(t => t.Type == TransactionType.Income).Sum(t => t.Amount)
                - a.Transactions.Where(t => t.Type == TransactionType.Expense).Sum(t => t.Amount),
            CreatedAt = a.CreatedAt
        };

    private static BankAccountDto RoundBalances(BankAccountDto dto)
    {
        dto.InitialBalance = decimal.Round(dto.InitialBalance, BalanceScale, MidpointRounding.AwayFromZero);
        dto.CurrentBalance = decimal.Round(dto.CurrentBalance, BalanceScale, MidpointRounding.AwayFromZero);
        return dto;
    }

    private static string? NormalizeOptional(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    /// <summary>
    /// Entfernt Formatierungs-Leerzeichen und prüft die Struktur (Ländercode, Prüfziffer, 11–30 Stellen).
    /// Die Prüfsumme selbst wird bewusst nicht validiert — hier zählt nur ein plausibles Format.
    /// </summary>
    private static string? NormalizeIban(string? iban)
    {
        if (string.IsNullOrWhiteSpace(iban))
            return null;

        var normalized = iban.Replace(" ", string.Empty).ToUpperInvariant();

        if (!IbanFormat().IsMatch(normalized))
            throw new BusinessRuleException("Die IBAN hat kein gültiges Format.");

        return normalized;
    }

    [GeneratedRegex("^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$")]
    private static partial Regex IbanFormat();

    private static string? NormalizeColor(string? color)
        => string.IsNullOrWhiteSpace(color) ? null : color.Trim().ToLowerInvariant();
}
