using Backend.Config;
using Backend.Services.Interfaces;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;

namespace Backend.Services;

/// <summary>
/// Versendet E-Mails via SMTP (MailKit). Ist kein SMTP-Host konfiguriert
/// (typisch in Development), wird stattdessen der Inhalt strukturiert geloggt,
/// damit Verifizierungs-/Reset-Links lokal testbar sind.
/// </summary>
public sealed class SmtpEmailSender(AppSettings appSettings, ILogger<SmtpEmailSender> logger) : IEmailSender
{
    private readonly SmtpSettings _smtp = appSettings.Smtp;

    public async Task SendAsync(string toEmail, string subject, string htmlBody, CancellationToken ct = default)
    {
        if (!_smtp.IsConfigured)
        {
            logger.LogWarning(
                "SMTP nicht konfiguriert – E-Mail wird nicht versendet. An {Recipient}, Betreff '{Subject}'.\n{Body}",
                toEmail, subject, htmlBody);
            return;
        }

        var message = new MimeMessage();
        message.From.Add(new MailboxAddress(_smtp.FromName, _smtp.FromAddress));
        message.To.Add(MailboxAddress.Parse(toEmail));
        message.Subject = subject;
        message.Body = new BodyBuilder { HtmlBody = htmlBody }.ToMessageBody();

        using var client = new SmtpClient();
        var socketOptions = _smtp.UseSsl ? SecureSocketOptions.StartTlsWhenAvailable : SecureSocketOptions.None;

        await client.ConnectAsync(_smtp.Host, _smtp.Port, socketOptions, ct);

        if (!string.IsNullOrWhiteSpace(_smtp.User))
            await client.AuthenticateAsync(_smtp.User, _smtp.Password, ct);

        await client.SendAsync(message, ct);
        await client.DisconnectAsync(true, ct);

        logger.LogInformation("Verifizierungs-/System-E-Mail an {Recipient} versendet (Betreff '{Subject}').", toEmail, subject);
    }
}
