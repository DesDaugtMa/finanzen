using Backend.Domain.Entities.Finance;
using Backend.Exceptions;
using Backend.Infrastructure.Persistence;
using Backend.Models.Finance;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;
using System.Linq.Expressions;

namespace Backend.Services;

public sealed class CategoryService(
    AppDbContext context,
    IAccountAccess accountAccess,
    ILogger<CategoryService> logger) : ICategoryService
{
    /// <summary>
    /// Startbelegung für ein neues Konto. Bewusst wenige, breite Kategorien —
    /// zu viele Vorgaben führen erfahrungsgemäß dazu, dass gar nicht kategorisiert wird.
    /// </summary>
    private static readonly (string Name, string Color, string Icon)[] DefaultCategories =
    [
        ("Lebensmittel", "#15803d", "cart"),
        ("Wohnen", "#0369a1", "house"),
        ("Mobilität", "#4f46e5", "car-front"),
        ("Freizeit", "#7e22ce", "controller"),
        ("Gesundheit", "#be123c", "heart-pulse"),
        ("Versicherungen", "#475569", "shield-check"),
        ("Einkommen", "#0f766e", "cash-coin"),
        ("Sonstiges", "#a16207", "three-dots")
    ];

    public async Task<IReadOnlyList<CategoryDto>> ListAsync(int userId, int accountId, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        return await QueryOfAccount(accountId)
            .OrderBy(c => c.Name)
            .ThenBy(c => c.Id)
            .Select(ProjectToDto)
            .ToListAsync(ct);
    }

    public async Task<CategoryDto> CreateAsync(int userId, int accountId, SaveCategoryRequest request, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var name = NormalizeName(request.Name);
        await EnsureNameIsFreeAsync(accountId, name, null, ct);

        var category = new Category
        {
            AccountId = accountId,
            Name = name,
            Color = NormalizeColor(request.Color),
            Icon = NormalizeIcon(request.Icon)
        };

        context.Categories.Add(category);
        await context.SaveChangesAsync(ct);

        logger.LogInformation("Kategorie {CategoryId} für Konto {AccountId} angelegt.", category.Id, accountId);

        return await GetDtoAsync(accountId, category.Id, ct);
    }

    public async Task<CategoryDto> UpdateAsync(int userId, int accountId, int categoryId, SaveCategoryRequest request, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var category = await FindAsync(accountId, categoryId, ct);

        var name = NormalizeName(request.Name);
        await EnsureNameIsFreeAsync(accountId, name, categoryId, ct);

        category.Name = name;
        category.Color = NormalizeColor(request.Color);
        category.Icon = NormalizeIcon(request.Icon);

        await context.SaveChangesAsync(ct);

        logger.LogInformation("Kategorie {CategoryId} von Konto {AccountId} aktualisiert.", categoryId, accountId);

        return await GetDtoAsync(accountId, categoryId, ct);
    }

    public async Task DeleteAsync(int userId, int accountId, int categoryId, CancellationToken ct = default)
    {
        await accountAccess.RequireOwnedAsync(userId, accountId, ct);

        var category = await FindAsync(accountId, categoryId, ct);

        // Buchungen bleiben erhalten und werden „ohne Kategorie“ — die Zuordnung wird
        // ausdrücklich gelöst, damit keine Buchung auf eine ausgeblendete Kategorie zeigt.
        var affected = await context.Transactions
            .Where(t => t.CategoryId == categoryId)
            .ExecuteUpdateAsync(setters => setters.SetProperty(t => t.CategoryId, (int?)null), ct);

        // Budgets ohne Kategorie sind bedeutungslos und würden Monatssummen verfälschen.
        await context.Budgets
            .Where(b => b.CategoryId == categoryId)
            .ExecuteDeleteAsync(ct);

        category.DeletedAt = DateTime.UtcNow;
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "Kategorie {CategoryId} von Konto {AccountId} gelöscht; {TransactionCount} Buchungen ohne Kategorie.",
            categoryId, accountId, affected);
    }

    public async Task<IReadOnlyList<CategoryDto>> CopyFromAccountAsync(int userId, int accountId, int sourceAccountId, CancellationToken ct = default)
    {
        if (sourceAccountId == accountId)
            throw new BusinessRuleException("Kategorien können nicht aus demselben Konto übernommen werden.");

        await accountAccess.RequireOwnedAsync(userId, [accountId, sourceAccountId], ct);

        var existingNames = await QueryOfAccount(accountId)
            .Select(c => c.Name)
            .ToListAsync(ct);

        var source = await QueryOfAccount(sourceAccountId)
            .OrderBy(c => c.Name)
            .ToListAsync(ct);

        // Namensgleiche Kategorien werden übersprungen statt zu kollidieren — der
        // Nutzer soll den Knopf gefahrlos mehrfach drücken können.
        var copies = source
            .Where(c => !existingNames.Contains(c.Name, StringComparer.OrdinalIgnoreCase))
            .Select(c => new Category
            {
                AccountId = accountId,
                Name = c.Name,
                Color = c.Color,
                Icon = c.Icon
            })
            .ToList();

        if (copies.Count == 0)
            throw new BusinessRuleException("Dieses Konto hat bereits alle Kategorien des gewählten Kontos.");

        context.Categories.AddRange(copies);
        await context.SaveChangesAsync(ct);

        logger.LogInformation(
            "{Count} Kategorien von Konto {SourceAccountId} nach Konto {AccountId} übernommen.",
            copies.Count, sourceAccountId, accountId);

        return await ListAsync(userId, accountId, ct);
    }

    public void AddDefaults(int accountId)
    {
        context.Categories.AddRange(DefaultCategories.Select(d => new Category
        {
            AccountId = accountId,
            Name = d.Name,
            Color = d.Color,
            Icon = d.Icon
        }));
    }

    // --- Intern ---------------------------------------------------------

    private IQueryable<Category> QueryOfAccount(int accountId)
        => context.Categories.Where(c => c.AccountId == accountId);

    private async Task<Category> FindAsync(int accountId, int categoryId, CancellationToken ct)
    {
        var category = await QueryOfAccount(accountId).FirstOrDefaultAsync(c => c.Id == categoryId, ct);

        if (category is null)
        {
            logger.LogInformation("Kategorie {CategoryId} für Konto {AccountId} nicht gefunden.", categoryId, accountId);
            throw new NotFoundException("Die Kategorie");
        }

        return category;
    }

    private async Task<CategoryDto> GetDtoAsync(int accountId, int categoryId, CancellationToken ct)
    {
        var dto = await QueryOfAccount(accountId)
            .Where(c => c.Id == categoryId)
            .Select(ProjectToDto)
            .FirstOrDefaultAsync(ct);

        return dto ?? throw new NotFoundException("Die Kategorie");
    }

    private async Task EnsureNameIsFreeAsync(int accountId, string name, int? exceptCategoryId, CancellationToken ct)
    {
        var exists = await QueryOfAccount(accountId)
            .AnyAsync(c => c.Id != exceptCategoryId && c.Name.ToLower() == name.ToLower(), ct);

        if (exists)
            throw new BusinessRuleException($"Es gibt in diesem Konto bereits eine Kategorie „{name}“.");
    }

    private static Expression<Func<Category, CategoryDto>> ProjectToDto =>
        c => new CategoryDto
        {
            Id = c.Id,
            AccountId = c.AccountId,
            Name = c.Name,
            Color = c.Color,
            Icon = c.Icon,
            TransactionCount = c.Transactions.Count(),
            CreatedAt = c.CreatedAt
        };

    private static string NormalizeName(string name)
    {
        var trimmed = name.Trim();

        if (trimmed.Length == 0)
            throw new BusinessRuleException("Der Name der Kategorie darf nicht leer sein.");

        return trimmed;
    }

    private static string? NormalizeColor(string? color)
        => string.IsNullOrWhiteSpace(color) ? null : color.Trim().ToLowerInvariant();

    private static string? NormalizeIcon(string? icon)
        => string.IsNullOrWhiteSpace(icon) ? null : icon.Trim().ToLowerInvariant();
}
