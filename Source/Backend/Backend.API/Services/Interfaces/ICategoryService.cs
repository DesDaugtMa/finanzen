using Backend.Models.Finance;

namespace Backend.Services.Interfaces;

/// <summary>Verwaltet die Kategorien eines Kontos. Kategorien gelten monatsübergreifend.</summary>
public interface ICategoryService
{
    Task<IReadOnlyList<CategoryDto>> ListAsync(int userId, int accountId, CancellationToken ct = default);

    Task<CategoryDto> CreateAsync(int userId, int accountId, SaveCategoryRequest request, CancellationToken ct = default);

    Task<CategoryDto> UpdateAsync(int userId, int accountId, int categoryId, SaveCategoryRequest request, CancellationToken ct = default);

    /// <summary>
    /// Blendet die Kategorie aus. Vorhandene Buchungen bleiben erhalten und verlieren
    /// nur ihre Zuordnung; die Budgets der Kategorie werden entfernt.
    /// </summary>
    Task DeleteAsync(int userId, int accountId, int categoryId, CancellationToken ct = default);

    /// <summary>Übernimmt die Kategorien eines anderen Kontos; bereits vorhandene Namen werden übersprungen.</summary>
    Task<IReadOnlyList<CategoryDto>> CopyFromAccountAsync(int userId, int accountId, int sourceAccountId, CancellationToken ct = default);

    /// <summary>Legt den Standardsatz an Kategorien für ein frisch angelegtes Konto an (ohne zu speichern).</summary>
    void AddDefaults(int accountId);
}
