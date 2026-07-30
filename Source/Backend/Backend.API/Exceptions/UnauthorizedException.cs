namespace Backend.Exceptions;

/// <summary>
/// Die Anfrage ist keinem angemeldeten Nutzer zuzuordnen. Tritt hinter <c>[Authorize]</c>
/// nur auf, wenn ein Token gültig ist, aber die erwarteten Claims fehlen.
/// </summary>
public sealed class UnauthorizedException()
    : DomainException("Für diese Aktion ist eine Anmeldung erforderlich.");
