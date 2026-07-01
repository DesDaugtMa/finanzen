using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Backend.Config;
using Backend.Domain.Entities.Auth;
using Backend.Infrastructure.Persistence;
using Backend.Models.Auth;
using Backend.Services.Interfaces;
using Google.Apis.Auth;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

namespace Backend.Services;

public sealed class AuthService(
    AppDbContext context,
    IPasswordHasher<User> passwordHasher,
    AppSettings appSettings,
    IEmailSender emailSender,
    IHttpContextAccessor httpContextAccessor,
    ILogger<AuthService> logger) : IAuthService
{
    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var user = await context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower(), ct);

        if (user is null || user.PasswordHash is null || user.IsBlocked)
            return null;

        var result = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            return null;

        // Transparentes Re-Hashing bei veraltetem Format.
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            await context.SaveChangesAsync(ct);
        }

        return await CreateAuthResponseAsync(user, ct);
    }

    public async Task<LoginResponse?> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        var token = await FindActiveRegistrationTokenAsync(request.RegistrationToken, ct);
        if (token is null)
            return null;

        var emailTaken = await context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower(), ct);
        if (emailTaken)
            return null;

        var role = await ResolveRoleForNewUserAsync(ct);

        var user = new User
        {
            Email = request.Email,
            DisplayName = request.DisplayName,
            RoleId = role.Id,
            Role = role,
            EmailVerified = false,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        context.Users.Add(user);
        await context.SaveChangesAsync(ct);

        token.IsActive = false;
        token.UsedByUserId = user.Id;
        await context.SaveChangesAsync(ct);

        await SendVerificationEmailAsync(user, ct);

        logger.LogInformation("Neuer Benutzer registriert: {UserId} mit Rolle {Role}", user.Id, role.Name);
        return await CreateAuthResponseAsync(user, ct);
    }

    public async Task<LoginResponse?> LoginWithGoogleAsync(GoogleLoginRequest request, CancellationToken ct = default)
    {
        var clientId = appSettings.GoogleAuth.ClientId;

        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(request.IdToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [clientId]
            });
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Google-Token-Validierung fehlgeschlagen.");
            return null;
        }

        // 1) Bekannter Google-Account
        var user = await context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.ProviderId == payload.Subject && u.AuthProvider == "Google", ct);

        if (user is not null)
            return user.IsBlocked ? null : await CreateAuthResponseAsync(user, ct);

        // 2) Vorhandener E-Mail-Account → Google verknüpfen
        user = await context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Email.ToLower() == payload.Email.ToLower(), ct);

        if (user is not null)
        {
            if (user.IsBlocked)
                return null;

            user.AuthProvider = "Google";
            user.ProviderId = payload.Subject;
            user.EmailVerified = true;
            await context.SaveChangesAsync(ct);
            return await CreateAuthResponseAsync(user, ct);
        }

        // 3) Neuer Benutzer – nur mit gültigem Registrierungs-Token (invite-only)
        var regToken = await FindActiveRegistrationTokenAsync(request.RegistrationToken, ct);
        if (regToken is null)
            return null;

        var role = await ResolveRoleForNewUserAsync(ct);

        var newUser = new User
        {
            Email = payload.Email,
            DisplayName = payload.Name ?? payload.Email,
            AuthProvider = "Google",
            ProviderId = payload.Subject,
            EmailVerified = true,
            RoleId = role.Id,
            Role = role,
            CreatedAt = DateTime.UtcNow
        };

        context.Users.Add(newUser);
        await context.SaveChangesAsync(ct);

        regToken.IsActive = false;
        regToken.UsedByUserId = newUser.Id;
        await context.SaveChangesAsync(ct);

        logger.LogInformation("Neuer Google-Benutzer registriert: {UserId} mit Rolle {Role}", newUser.Id, role.Name);
        return await CreateAuthResponseAsync(newUser, ct);
    }

    public async Task<bool> ValidateRegistrationTokenAsync(string token, CancellationToken ct = default)
        => await FindActiveRegistrationTokenAsync(token, ct) is not null;

    public async Task<LoginResponse?> RefreshTokenAsync(string refreshToken, CancellationToken ct = default)
    {
        var session = await context.UserSessions
            .Include(s => s.User).ThenInclude(u => u.Role)
            .FirstOrDefaultAsync(s => s.SessionKey == refreshToken && s.IsActive, ct);

        if (session is null || session.ExpiresAt < DateTime.UtcNow || session.User.IsBlocked)
            return null;

        // Refresh-Token rotieren
        session.IsActive = false;
        var newSession = await CreateSessionAsync(session.UserId, ct);

        var response = BuildResponse(session.User, newSession.SessionKey);
        await context.SaveChangesAsync(ct);
        return response;
    }

    public async Task RevokeSessionAsync(string refreshToken, CancellationToken ct = default)
    {
        var session = await context.UserSessions
            .FirstOrDefaultAsync(s => s.SessionKey == refreshToken && s.IsActive, ct);

        if (session is not null)
        {
            session.IsActive = false;
            await context.SaveChangesAsync(ct);
        }
    }

    public async Task<UserInfoResponse?> GetUserInfoAsync(int userId, CancellationToken ct = default)
    {
        var user = await context.Users
            .Include(u => u.Role)
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        if (user is null)
            return null;

        return new UserInfoResponse
        {
            DisplayName = user.DisplayName,
            Email = user.Email,
            Role = user.Role.Name,
            EmailVerified = user.EmailVerified
        };
    }

    // ---------- Helpers ----------

    private async Task<RegistrationToken?> FindActiveRegistrationTokenAsync(string? token, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(token))
            return null;

        return await context.RegistrationTokens.FirstOrDefaultAsync(
            rt => rt.Token == token && rt.IsActive && (rt.ExpiresAt == null || rt.ExpiresAt > DateTime.UtcNow), ct);
    }

    private async Task<Role> ResolveRoleForNewUserAsync(CancellationToken ct)
    {
        var isFirstUser = !await context.Users.IgnoreQueryFilters().AnyAsync(ct);
        var roleName = isFirstUser ? "Admin" : "User";
        return await context.Roles.FirstAsync(r => r.Name == roleName, ct);
    }

    private async Task SendVerificationEmailAsync(User user, CancellationToken ct)
    {
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

        var link = $"{appSettings.FrontendBaseUrl.TrimEnd('/')}/verify-email/{Uri.EscapeDataString(token.Token)}";
        var body = $"""
            <p>Hallo {System.Net.WebUtility.HtmlEncode(user.DisplayName)},</p>
            <p>bitte bestätige deine E-Mail-Adresse für die Finanzen-App:</p>
            <p><a href="{link}">E-Mail-Adresse bestätigen</a></p>
            <p>Der Link ist 48 Stunden gültig.</p>
            """;

        await emailSender.SendAsync(user.Email, "Bestätige deine E-Mail-Adresse", body, ct);
    }

    private async Task<LoginResponse> CreateAuthResponseAsync(User user, CancellationToken ct)
    {
        var session = await CreateSessionAsync(user.Id, ct);
        return BuildResponse(user, session.SessionKey);
    }

    private LoginResponse BuildResponse(User user, string refreshToken) => new()
    {
        Token = GenerateJwtToken(user),
        RefreshToken = refreshToken,
        DisplayName = user.DisplayName,
        Email = user.Email,
        Role = user.Role.Name,
        EmailVerified = user.EmailVerified
    };

    private async Task<UserSession> CreateSessionAsync(int userId, CancellationToken ct)
    {
        var httpContext = httpContextAccessor.HttpContext;
        var expiryDays = appSettings.Jwt.RefreshTokenExpiryDays;

        var session = new UserSession
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            SessionKey = GenerateSecureToken(),
            UserAgent = httpContext?.Request.Headers.UserAgent.ToString(),
            IpAddress = httpContext?.Connection.RemoteIpAddress?.ToString(),
            CreatedAt = DateTime.UtcNow,
            LastSeenAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddDays(expiryDays),
            IsActive = true
        };

        context.UserSessions.Add(session);
        await context.SaveChangesAsync(ct);
        return session;
    }

    private static string GenerateSecureToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(64);
        return Convert.ToBase64String(bytes);
    }

    private string GenerateJwtToken(User user)
    {
        var jwt = appSettings.Jwt;
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Name, user.DisplayName),
            new Claim(ClaimTypes.Role, user.Role.Name)
        };

        var token = new JwtSecurityToken(
            issuer: jwt.Issuer,
            audience: jwt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddMinutes(jwt.ExpiryMinutes),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
