using Backend.Models.Auth;
using Backend.Services.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(
    IAuthService authService,
    IAccountService accountService,
    ICurrentUser currentUser,
    ILogger<AuthController> logger) : ControllerBase
{
    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<IActionResult> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var response = await authService.LoginAsync(request, ct);
        if (response is null)
        {
            logger.LogWarning("Fehlgeschlagener Login-Versuch.");
            return Unauthorized(new { message = "E-Mail-Adresse oder Passwort ist ungültig." });
        }

        return Ok(response);
    }

    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<IActionResult> Register([FromBody] RegisterRequest request, CancellationToken ct)
    {
        var response = await authService.RegisterAsync(request, ct);
        if (response is null)
            return BadRequest(new { message = "Registrierung fehlgeschlagen. Token ungültig oder E-Mail bereits vergeben." });

        return Ok(response);
    }

    [HttpPost("google")]
    [AllowAnonymous]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginRequest request, CancellationToken ct)
    {
        var response = await authService.LoginWithGoogleAsync(request, ct);
        if (response is null)
            return BadRequest(new { message = "Google-Anmeldung fehlgeschlagen. Neue Nutzer benötigen einen gültigen Einladungs-Token." });

        return Ok(response);
    }

    [HttpGet("validate-token/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateToken(string token, CancellationToken ct)
    {
        var isValid = await authService.ValidateRegistrationTokenAsync(token, ct);
        if (!isValid)
            return BadRequest(new { message = "Ungültiger oder abgelaufener Einladungs-Token." });

        return Ok(new { valid = true });
    }

    [HttpPost("refresh")]
    [AllowAnonymous]
    public async Task<IActionResult> Refresh([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        var response = await authService.RefreshTokenAsync(request.RefreshToken, ct);
        if (response is null)
            return Unauthorized(new { message = "Ungültiger oder abgelaufener Refresh-Token." });

        return Ok(response);
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout([FromBody] RefreshTokenRequest request, CancellationToken ct)
    {
        if (!string.IsNullOrWhiteSpace(request.RefreshToken))
            await authService.RevokeSessionAsync(request.RefreshToken, ct);

        return NoContent();
    }

    [HttpPost("forgot-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordRequest request, CancellationToken ct)
    {
        await accountService.RequestPasswordResetAsync(request.Email, ct);
        // Immer 200 – kein Enumeration-Leak.
        return Ok(new { message = "Falls ein Konto existiert, wurde eine E-Mail zum Zurücksetzen versendet." });
    }

    [HttpPost("reset-password")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        var ok = await accountService.ResetPasswordAsync(request.Token, request.NewPassword, ct);
        if (!ok)
            return BadRequest(new { message = "Ungültiger oder abgelaufener Reset-Link." });

        return Ok(new { message = "Passwort wurde erfolgreich zurückgesetzt." });
    }

    [HttpPost("resend-verification")]
    [AllowAnonymous]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationRequest request, CancellationToken ct)
    {
        await accountService.ResendVerificationAsync(request.Email, ct);
        return Ok(new { message = "Falls nötig, wurde eine neue Bestätigungs-E-Mail versendet." });
    }

    [HttpGet("verify-email/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> VerifyEmail(string token, CancellationToken ct)
    {
        var ok = await accountService.VerifyEmailAsync(token, ct);
        if (!ok)
            return BadRequest(new { message = "Ungültiger oder abgelaufener Bestätigungs-Link." });

        return Ok(new { message = "E-Mail-Adresse wurde bestätigt." });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userId = currentUser.UserId;
        if (userId is null)
            return Unauthorized();

        var info = await authService.GetUserInfoAsync(userId.Value, ct);
        if (info is null)
            return Unauthorized();

        return Ok(info);
    }
}
