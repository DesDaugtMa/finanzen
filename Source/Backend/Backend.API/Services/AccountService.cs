using System.Security.Cryptography;
using Backend.Config;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Persistence;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Backend.Services;

public sealed class AccountService(
    AppDbContext context,
    IPasswordHasher<User> passwordHasher,
    IEmailSender emailSender,
    AppSettings appSettings,
    ILogger<AccountService> logger) : IAccountService
{
    public async Task<bool> VerifyEmailAsync(string token, CancellationToken ct = default)
    {
        var entry = await context.EmailVerificationTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token, ct);

        if (entry is null || entry.IsUsed || entry.ExpiresAt < DateTime.UtcNow)
            return false;

        entry.IsUsed = true;
        entry.User.EmailVerified = true;
        await context.SaveChangesAsync(ct);

        logger.LogInformation("E-Mail für Benutzer {UserId} bestätigt.", entry.UserId);
        return true;
    }

    public async Task ResendVerificationAsync(string email, CancellationToken ct = default)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), ct);

        // Geräuschlos abbrechen, wenn kein passender/unbestätigter Account existiert.
        if (user is null || user.EmailVerified)
            return;

        var token = new EmailVerificationToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = GenerateSecureToken(),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(2)
        };
        context.EmailVerificationTokens.Add(token);
        await context.SaveChangesAsync(ct);

        var link = $"{FrontendBase}/verify-email/{Uri.EscapeDataString(token.Token)}";
        var body = $"""
            <p>Hallo {System.Net.WebUtility.HtmlEncode(user.DisplayName)},</p>
            <p>bitte bestätige deine E-Mail-Adresse für die Finanzen-App:</p>
            <p><a href="{link}">E-Mail-Adresse bestätigen</a></p>
            <p>Der Link ist 48 Stunden gültig.</p>
            """;
        await emailSender.SendAsync(user.Email, "Bestätige deine E-Mail-Adresse", body, ct);
    }

    public async Task RequestPasswordResetAsync(string email, CancellationToken ct = default)
    {
        var user = await context.Users.FirstOrDefaultAsync(u => u.Email.ToLower() == email.ToLower(), ct);

        // Geräuschlos: keine Rückmeldung, ob die E-Mail existiert. Nur Accounts mit Passwort
        // können zurückgesetzt werden (reine Google-Accounts haben keins).
        if (user is null || user.PasswordHash is null || user.IsBlocked)
        {
            logger.LogInformation("Passwort-Reset für nicht zurücksetzbaren/unbekannten Account angefragt.");
            return;
        }

        var token = new PasswordResetToken
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            Token = GenerateSecureToken(),
            CreatedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddHours(1)
        };
        context.PasswordResetTokens.Add(token);
        await context.SaveChangesAsync(ct);

        var link = $"{FrontendBase}/reset-password/{Uri.EscapeDataString(token.Token)}";
        var body = $"""
            <p>Hallo {System.Net.WebUtility.HtmlEncode(user.DisplayName)},</p>
            <p>du hast das Zurücksetzen deines Passworts angefragt. Klicke auf den folgenden Link:</p>
            <p><a href="{link}">Passwort zurücksetzen</a></p>
            <p>Der Link ist 1 Stunde gültig. Falls du das nicht warst, ignoriere diese E-Mail.</p>
            """;
        await emailSender.SendAsync(user.Email, "Passwort zurücksetzen", body, ct);
    }

    public async Task<bool> ResetPasswordAsync(string token, string newPassword, CancellationToken ct = default)
    {
        var entry = await context.PasswordResetTokens
            .Include(t => t.User)
            .FirstOrDefaultAsync(t => t.Token == token, ct);

        if (entry is null || entry.IsUsed || entry.ExpiresAt < DateTime.UtcNow)
            return false;

        var user = entry.User;
        user.PasswordHash = passwordHasher.HashPassword(user, newPassword);
        user.EmailVerified = true; // Zugriff auf die E-Mail wurde nachgewiesen
        user.SecurityStamp = Guid.NewGuid().ToString();
        entry.IsUsed = true;

        // Alle bestehenden Sessions invalidieren (Sicherheit).
        var sessions = await context.UserSessions.Where(s => s.UserId == user.Id && s.IsActive).ToListAsync(ct);
        foreach (var session in sessions)
            session.IsActive = false;

        await context.SaveChangesAsync(ct);

        logger.LogInformation("Passwort für Benutzer {UserId} zurückgesetzt; {Count} Sessions invalidiert.", user.Id, sessions.Count);
        return true;
    }

    private string FrontendBase => appSettings.FrontendBaseUrl.TrimEnd('/');

    private static string GenerateSecureToken()
        => Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
}
