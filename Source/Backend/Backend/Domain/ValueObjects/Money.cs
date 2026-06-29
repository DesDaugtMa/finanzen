using Backend.Domain.Exceptions;

namespace Backend.Domain.ValueObjects;

public readonly record struct Money(decimal Amount, string Currency)
{
    public static Money Euro(decimal amount) => new(amount, "EUR");

    public Money Add(Money other)
    {
        EnsureSameCurrency(other);
        return this with { Amount = Amount + other.Amount };
    }

    public Money Subtract(Money other)
    {
        EnsureSameCurrency(other);
        return this with { Amount = Amount - other.Amount };
    }

    public Money Negate() => this with { Amount = -Amount };

    public bool IsPositive() => Amount > 0;
    public bool IsNegative() => Amount < 0;
    public bool IsZero() => Amount == 0;

    private void EnsureSameCurrency(Money other)
    {
        if (Currency != other.Currency)
            throw new CurrencyMismatchException(Currency, other.Currency);
    }

    public override string ToString() => $"{Amount:F2} {Currency}";
}
