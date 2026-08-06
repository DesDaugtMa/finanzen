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

    /// <summary>Fixkosten tragen einen kurzen Namen („Miete“), keine Buchungsbezeichnung.</summary>
    public const int FixedCostNameMaxLength = 200;

    /// <summary>Ein Schuldeintrag trägt den Namen einer Person, keinen Freitext.</summary>
    public const int DebtPersonNameMaxLength = 200;

    /// <summary>Kurze Bezeichnung des Vorgangs („Urlaub Kroatien“).</summary>
    public const int DebtTitleMaxLength = 200;

    /// <summary>Obergrenze der Buchungen, die der Zuordnungs-Dialog zur Auswahl anbietet.</summary>
    public const int AssignableTransactionLimit = 50;
}
