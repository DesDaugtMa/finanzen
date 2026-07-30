/** Ausgaben einer Kategorie im Monat. */
export interface CategorySpending {
  /** Null steht für Buchungen ohne Kategorie. */
  categoryId: number | null;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  amount: number;
  /** Anteil an den Gesamtausgaben in Prozent (0–100). */
  share: number;
  budget: number | null;
}

/** Kennzahlen eines Kontos für einen Abrechnungsmonat. Spiegelt `MonthSummaryDto`. */
export interface MonthSummary {
  /** Monat im Format `yyyy-MM`. */
  month: string;
  currency: string;
  income: number;
  /** Summe der Ausgaben als positiver Wert. */
  expenses: number;
  net: number;
  /** Monatsübergreifender Kontostand. */
  currentBalance: number;
  totalBudget: number;
  totalSpentBudgeted: number;
  totalRemaining: number;
  transactionCount: number;
  spending: CategorySpending[];
}
