using Backend.Models.Finance;

namespace Backend.Services.Interfaces;

/// <summary>Verwaltet die Girokonten eines Nutzers inklusive ihrer Kontostände.</summary>
public interface IBankAccountService
{
    Task<IReadOnlyList<BankAccountDto>> ListMineAsync(int userId, CancellationToken ct = default);

    Task<BankAccountDto> GetMineAsync(int userId, int accountId, CancellationToken ct = default);

    Task<BankAccountDto> CreateAsync(int userId, CreateBankAccountRequest request, CancellationToken ct = default);

    Task<BankAccountDto> UpdateAsync(int userId, int accountId, UpdateBankAccountRequest request, CancellationToken ct = default);

    Task DeleteAsync(int userId, int accountId, CancellationToken ct = default);
}
