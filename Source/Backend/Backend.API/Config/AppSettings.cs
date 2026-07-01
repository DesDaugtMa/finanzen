namespace Backend.Config;

public class AppSettings
{
    public AppConnectionStrings ConnectionStrings { get; set; } = new();
    public string[] AllowedOrigins { get; set; } = [];

    /// <summary>Basis-URL des Frontends, für Links in E-Mails (Verifizierung, Passwort-Reset).</summary>
    public string FrontendBaseUrl { get; set; } = "http://localhost:4200";

    public JwtSettings Jwt { get; set; } = new();
    public GoogleAuthSettings GoogleAuth { get; set; } = new();
    public SmtpSettings Smtp { get; set; } = new();
}

public class AppConnectionStrings
{
    public string Default { get; set; } = string.Empty;
}

public class JwtSettings
{
    public string Secret { get; set; } = string.Empty;
    public string Issuer { get; set; } = "finanzen-api";
    public string Audience { get; set; } = "finanzen-app";
    public int ExpiryMinutes { get; set; } = 15;
    public int RefreshTokenExpiryDays { get; set; } = 30;
}

public class GoogleAuthSettings
{
    public string ClientId { get; set; } = string.Empty;
}

public class SmtpSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string User { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromAddress { get; set; } = "no-reply@finanzen.local";
    public string FromName { get; set; } = "Finanzen";
    public bool UseSsl { get; set; } = true;

    /// <summary>True, wenn ein Host gesetzt ist – sonst wird der Link nur ins Log geschrieben (Dev).</summary>
    public bool IsConfigured => !string.IsNullOrWhiteSpace(Host);
}
