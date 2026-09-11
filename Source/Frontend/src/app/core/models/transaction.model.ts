/** Richtung einer Buchung. Die Werte entsprechen `TransactionType` des Backends. */
export type TransactionType = 'Income' | 'Expense';

/** Eine Buchung eines Kontos. Spiegelt `TransactionDto` des Backends. */
export interface Transaction {
  id: number;
  accountId: number;
  type: TransactionType;
  /** Immer positiv; die Richtung steckt in `type`. */
  amount: number;
  currency: string;
  title: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  /** Zugeordnete Fixkosten-Position, sonst null. Gesetzt heißt: keine variable Ausgabe. */
  fixedCostId: number | null;
  fixedCostName: string | null;
  /** Monat der zugeordneten Fixkosten-Position (`yyyy-MM`), sonst null. */
  fixedCostMonth: string | null;
  /** ISO-Datum `yyyy-MM-dd`. */
  bookingDate: string;
  purchaseDate: string | null;
  /** Abrechnungsmonat im Format `yyyy-MM`. */
  accountingMonth: string;
  note: string | null;
  /**
   * True, solange die Bank den Betrag noch nicht abgebucht hat. Die Buchung zählt
   * trotzdem voll in Kontostand, Bilanz und frei verfügbarem Geld; nur der
   * Kontostand „laut Bank“ lässt sie außen vor.
   */
  isPending: boolean;
  /** True, wenn diese Buchung mit einer Buchung eines anderen Kontos verknüpft ist. */
  isLinked: boolean;
  linkedTransactionId: number | null;
  linkedAccountId: number | null;
  linkedAccountName: string | null;
  createdAt: string;
}

/**
 * Die verknüpfte Buchung eines anderen Kontos mit allen Angaben, die das Detail-Popup
 * zeigt. Spiegelt `LinkedTransactionDto` des Backends. Dieselbe Form dient als Eintrag
 * in der Auswahlliste beim Verknüpfen.
 */
export interface LinkedTransaction {
  id: number;
  accountId: number;
  accountName: string;
  type: TransactionType;
  amount: number;
  currency: string;
  title: string;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  fixedCostName: string | null;
  /** Monat der zugeordneten Fixkosten-Position (`yyyy-MM`), sonst null. */
  fixedCostMonth: string | null;
  /** ISO-Datum `yyyy-MM-dd`. */
  bookingDate: string;
  purchaseDate: string | null;
  /** Abrechnungsmonat im Format `yyyy-MM` — der Monat, in dem der Sprung landet. */
  accountingMonth: string;
  note: string | null;
  isPending: boolean;
}

/**
 * Suche nach möglichen Gegenbuchungen. `type` und `amount` beschreiben die eigene Seite;
 * beim Anlegen stammen sie aus dem Formular, weil die Buchung noch nicht gespeichert ist.
 */
export interface LinkCandidateQuery {
  counterAccountId: number;
  type: TransactionType;
  amount: number;
  search: string;
  /** Die eigene Buchung beim Bearbeiten — sie kann nie ihr eigener Kandidat sein. */
  excludeTransactionId: number | null;
}

/** Nutzdaten zum Anlegen und Bearbeiten einer Buchung. */
export interface TransactionPayload {
  type: TransactionType;
  amount: number;
  title: string;
  categoryId: number | null;
  /** Optionale Zuordnung zu einer Fixkosten-Position dieses Kontos. */
  fixedCostId: number | null;
  bookingDate: string;
  purchaseDate: string | null;
  accountingMonth: string;
  note: string | null;
  /** Nur für Ausgaben auf Girokonten zulässig; der Server weist alles andere ab. */
  isPending: boolean;
}

/** Ergebnis der Sammel-Aktion „alle offenen Buchungen als abgebucht markieren“. */
export interface SettleResult {
  /** Der bearbeitete Abrechnungsmonat im Format `yyyy-MM`. */
  month: string;
  settledCount: number;
  /** Summe der abgehakten Beträge — genau um so viel sinkt der Kontostand „laut Bank“. */
  settledAmount: number;
}

export type TransactionSort = 'BookingDate' | 'Amount' | 'Category' | 'Title';
export type SortDirection = 'Ascending' | 'Descending';

/** Filter und Sortierung der Transaktionsliste. Wird clientseitig auf die geladene Liste angewendet. */
export interface TransactionFilter {
  month: string;
  search: string;
  categoryIds: number[];
  includeUncategorized: boolean;
  type: TransactionType | null;
  sort: TransactionSort;
  direction: SortDirection;
}
