namespace Backend.Exceptions;

public abstract class DomainException(string message) : Exception(message);
