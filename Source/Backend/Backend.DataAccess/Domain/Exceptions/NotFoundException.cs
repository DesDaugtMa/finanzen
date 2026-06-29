namespace Backend.Domain.Exceptions;

public sealed class NotFoundException(string what) : DomainException($"{what} wurde nicht gefunden.");
