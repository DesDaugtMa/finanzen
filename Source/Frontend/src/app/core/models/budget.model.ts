/** Eine Kategorie-Zeile im Budget-Tab. Spiegelt `BudgetLineDto` des Backends. */
export interface BudgetLine {
  categoryId: number;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  /** Gesetztes Budget des Monats oder null, wenn keines hinterlegt ist. */
  amount: number | null;
  /** Unverbindlicher Vorschlag aus dem Vormonat; nur gesetzt, wenn `amount` null ist. */
  suggestedAmount: number | null;
  /** Ausgaben dieser Kategorie im Monat. */
  spent: number;
  /** `amount − spent`, negativ bei Überschreitung. Null ohne Budget. */
  remaining: number | null;
}

/** Alle Kategorien eines Kontos mit Budget und Verbrauch im gewählten Monat. */
export interface BudgetMonth {
  /** Monat im Format `yyyy-MM`. */
  month: string;
  currency: string;
  items: BudgetLine[];
  totalBudget: number;
  totalSpent: number;
  totalSpentBudgeted: number;
  totalRemaining: number;
  /** Monat, aus dem die Vorschläge stammen (`yyyy-MM`). */
  suggestionSourceMonth: string | null;
  hasSuggestions: boolean;
}
