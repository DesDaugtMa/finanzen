namespace Backend.Models.Finance;

/// <summary>Betrags- und Textgrenzen, die für Buchungen und Budgets gleichermaßen gelten.</summary>
internal static class FinanceValidation
{
    /// <summary>Obergrenze für einen einzelnen Betrag. Bewusst weit, aber endlich.</summary>
    public const double MaxAmount = 1_000_000_000d;

    /// <summary>Kleinster erfassbarer Betrag einer Buchung — Nullbuchungen sind fachlich sinnlos.</summary>
    public const double MinTransactionAmount = 0.01d;

    public const string AmountMessage = "Der Betrag muss größer als 0 und kleiner als eine Milliarde sein.";

    public const int TitleMaxLength = 500;
    public const int NoteMaxLength = 2000;
}
