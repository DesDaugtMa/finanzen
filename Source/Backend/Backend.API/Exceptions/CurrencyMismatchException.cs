namespace Backend.Exceptions;

public sealed class CurrencyMismatchException(string currencyA, string currencyB)
    : DomainException($"Währungskonflikt: {currencyA} und {currencyB} können nicht kombiniert werden.");
