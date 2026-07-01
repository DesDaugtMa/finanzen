using Backend.Models.Auth;

namespace Backend.Services.Interfaces;

public interface IRegistrationTokenService
{
    Task<IReadOnlyList<RegistrationTokenDto>> ListAsync(CancellationToken ct = default);
    Task<RegistrationTokenDto> CreateAsync(CreateRegistrationTokenRequest request, int createdByUserId, CancellationToken ct = default);
    Task<bool> DeactivateAsync(string token, CancellationToken ct = default);
}
