using Backend.Models.Auth;

namespace Backend.Services.Interfaces;

public interface ISessionService
{
    Task<IReadOnlyList<SessionDto>> ListMineAsync(int userId, string? currentRefreshToken, CancellationToken ct = default);
    Task<bool> RevokeMineAsync(int userId, Guid sessionId, CancellationToken ct = default);
    Task RevokeAllOthersAsync(int userId, string? currentRefreshToken, CancellationToken ct = default);
}
