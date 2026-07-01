using System.Security.Cryptography;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Persistence;
using Backend.Models.Auth;
using Backend.Services.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public sealed class RegistrationTokenService(AppDbContext context, ILogger<RegistrationTokenService> logger)
    : IRegistrationTokenService
{
    public async Task<IReadOnlyList<RegistrationTokenDto>> ListAsync(CancellationToken ct = default)
    {
        return await context.RegistrationTokens
            .OrderByDescending(t => t.CreatedAt)
            .Select(t => new RegistrationTokenDto
            {
                Token = t.Token,
                Description = t.Description,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt,
                ExpiresAt = t.ExpiresAt,
                IsUsed = t.UsedByUserId != null
            })
            .ToListAsync(ct);
    }

    public async Task<RegistrationTokenDto> CreateAsync(CreateRegistrationTokenRequest request, int createdByUserId, CancellationToken ct = default)
    {
        var token = new RegistrationToken
        {
            Token = GenerateToken(),
            Description = request.Description,
            CreatedByUserId = createdByUserId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = request.ExpiresInDays.HasValue
                ? DateTime.UtcNow.AddDays(request.ExpiresInDays.Value)
                : null
        };

        context.RegistrationTokens.Add(token);
        await context.SaveChangesAsync(ct);

        logger.LogInformation("Registrierungs-Token von Benutzer {UserId} erstellt.", createdByUserId);

        return new RegistrationTokenDto
        {
            Token = token.Token,
            Description = token.Description,
            IsActive = token.IsActive,
            CreatedAt = token.CreatedAt,
            ExpiresAt = token.ExpiresAt,
            IsUsed = false
        };
    }

    public async Task<bool> DeactivateAsync(string token, CancellationToken ct = default)
    {
        var entity = await context.RegistrationTokens.FirstOrDefaultAsync(t => t.Token == token, ct);
        if (entity is null)
            return false;

        entity.IsActive = false;
        await context.SaveChangesAsync(ct);
        return true;
    }

    private static string GenerateToken()
        => Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();
}
