namespace Backend.Services.Interfaces;

public interface IAccountService
{
    /// <summary>Bestätigt eine E-Mail-Adresse anhand eines Verifizierungs-Tokens.</summary>
    Task<bool> VerifyEmailAsync(string token, CancellationToken ct = default);

    /// <summary>Sendet (falls sinnvoll) eine neue Verifizierungs-E-Mail. Immer geräuschlos.</summary>
    Task ResendVerificationAsync(string email, CancellationToken ct = default);

    /// <summary>Startet den Passwort-Reset-Flow. Immer geräuschlos (kein Enumeration-Leak).</summary>
    Task RequestPasswordResetAsync(string email, CancellationToken ct = default);

    /// <summary>Setzt das Passwort anhand eines gültigen Reset-Tokens neu.</summary>
    Task<bool> ResetPasswordAsync(string token, string newPassword, CancellationToken ct = default);
}
