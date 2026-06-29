namespace Backend.Exceptions;

public sealed class BusinessRuleException(string message) : DomainException(message);
