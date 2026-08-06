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
  /** Summe der geplanten Fixkosten des Monats. */
  fixedCostsPlanned: number;
  /** Summe der Buchungen, die Fixkosten dieses Monats zugeordnet sind. */
  fixedCostsBooked: number;
  /** Die gegen die Einnahmen gerechneten Fixkosten: je Position `max(geplant, gebucht)`. */
  fixedCosts: number;
  fixedCostCount: number;
  /** Fixkosten-Positionen ohne zugeordnete Buchung. */
  fixedCostOpenCount: number;
  /** Ausgaben des Monats ohne Fixkosten-Zuordnung. */
  variableExpenses: number;
  /** Frei verfügbar: `income − fixedCosts − variableExpenses`, nach unten bei 0 begrenzt. */
  disposable: number;
  /** Um so viel übersteigen Fixkosten und variable Ausgaben die Einnahmen. 0, wenn sie reichen. */
  disposableShortfall: number;
  transactionCount: number;
  spending: CategorySpending[];
}
