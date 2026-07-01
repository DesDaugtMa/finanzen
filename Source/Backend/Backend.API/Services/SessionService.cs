using Backend.Infrastructure.Persistence;
using Backend.Models.Auth;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public sealed class SessionService(AppDbContext context) : ISessionService
{
    public async Task<IReadOnlyList<SessionDto>> ListMineAsync(int userId, string? currentRefreshToken, CancellationToken ct = default)
    {
        var sessions = await context.UserSessions
            .Where(s => s.UserId == userId && s.IsActive && s.ExpiresAt > DateTime.UtcNow)
            .OrderByDescending(s => s.LastSeenAt)
            .ToListAsync(ct);

        return sessions.Select(s => new SessionDto
        {
            Id = s.Id,
            UserAgent = s.UserAgent,
            IpAddress = s.IpAddress,
            CreatedAt = s.CreatedAt,
            LastSeenAt = s.LastSeenAt,
            ExpiresAt = s.ExpiresAt,
            IsCurrent = currentRefreshToken != null && s.SessionKey == currentRefreshToken
        }).ToList();
    }

    public async Task<bool> RevokeMineAsync(int userId, Guid sessionId, CancellationToken ct = default)
    {
        var session = await context.UserSessions
            .FirstOrDefaultAsync(s => s.Id == sessionId && s.UserId == userId && s.IsActive, ct);

        if (session is null)
            return false;

        session.IsActive = false;
        await context.SaveChangesAsync(ct);
        return true;
    }

    public async Task RevokeAllOthersAsync(int userId, string? currentRefreshToken, CancellationToken ct = default)
    {
        var sessions = await context.UserSessions
            .Where(s => s.UserId == userId && s.IsActive && s.SessionKey != currentRefreshToken)
            .ToListAsync(ct);

        foreach (var session in sessions)
            session.IsActive = false;

        await context.SaveChangesAsync(ct);
    }
}
