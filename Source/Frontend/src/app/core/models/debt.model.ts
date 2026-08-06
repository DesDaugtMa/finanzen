/**
 * Stand eines Schuldeintrags gegenüber seinen Buchungen.
 * Die Werte entsprechen `DebtStatus` des Backends.
 */
export type DebtStatus = 'Empty' | 'Open' | 'Settled' | 'Overpaid';

/** Richtung einer zugeordneten Buchung. Entspricht `TransactionType` des Backends. */
export type DebtTransactionDirection = 'Income' | 'Expense';

/** Eine einem Schuldeintrag zugeordnete oder zuordenbare Buchung in Kurzform. */
export interface DebtTransaction {
  id: number;
  accountId: number;
  accountName: string;
  accountColor: string | null;
  /** `Expense` heißt verliehen, `Income` heißt zurückgezahlt. */
  direction: DebtTransactionDirection;
  title: string;
  /** Immer positiv. Die Richtung steckt in `direction`. */
  amount: number;
  currency: string;
  /** ISO-Datum `yyyy-MM-dd`. */
  bookingDate: string;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  /** Abrechnungsmonat der Buchung im Format `yyyy-MM`. */
  accountingMonth: string;
}

/** Ein Schuldeintrag — ein Vorgang, bei dem einer Person Geld geliehen wurde. */
export interface Debt {
  id: number;
  personName: string;
  title: string;
  note: string | null;
  currency: string;
  /** Summe der zugeordneten Ausgaben. */
  lentAmount: number;
  /** Summe der zugeordneten Einnahmen. */
  repaidAmount: number;
  /** `lentAmount − repaidAmount`. Negativ, wenn mehr zurückkam als verliehen wurde. */
  outstandingAmount: number;
  transactionCount: number;
  status: DebtStatus;
  transactions: DebtTransaction[];
}

/** Alle Einträge einer Person mit ihren Summen. Spiegelt `DebtorSummaryDto`. */
export interface Debtor {
  personName: string;
  currency: string;
  lentAmount: number;
  repaidAmount: number;
  outstandingAmount: number;
  debtCount: number;
  openCount: number;
  debts: Debt[];
}

/** Die gesamte Schuldnerliste samt Summen. Spiegelt `DebtOverviewDto`. */
export interface DebtOverview {
  currency: string;
  totalLent: number;
  totalRepaid: number;
  totalOutstanding: number;
  debtorCount: number;
  debtCount: number;
  openCount: number;
  /** Personen mit offenem Betrag zuerst. */
  debtors: Debtor[];
}

/** Nutzdaten zum Anlegen und Bearbeiten eines Schuldeintrags. */
export interface DebtPayload {
  personName: string;
  title: string;
  note: string | null;
}
