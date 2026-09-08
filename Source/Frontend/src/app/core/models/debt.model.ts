/**
 * Stand eines Schuldeintrags gegenüber seinen Positionen.
 * Die Werte entsprechen `DebtStatus` des Backends.
 */
export type DebtStatus = 'Empty' | 'Open' | 'Settled' | 'Overpaid';

/**
 * Richtung einer Position — gilt für zugeordnete Buchungen und manuell erfasste Beträge
 * gleichermaßen. Entspricht `TransactionType` des Backends.
 */
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

/**
 * Ein manuell erfasster Betrag — Geld, zu dem es keine Buchung auf einem Geldkonto gibt.
 * Spiegelt `DebtEntryDto`.
 */
export interface DebtEntry {
  id: number;
  /** `Expense` heißt verliehen, `Income` heißt zurückgezahlt. */
  direction: DebtTransactionDirection;
  /** Immer positiv. Die Richtung steckt in `direction`. */
  amount: number;
  /** Die Währung des Schuldeintrags — eine manuelle Position führt keine eigene. */
  currency: string;
  /** ISO-Datum `yyyy-MM-dd`. */
  entryDate: string;
  note: string | null;
}

/** Nutzdaten zum Anlegen und Bearbeiten eines manuell erfassten Betrags. */
export interface DebtEntryPayload {
  direction: DebtTransactionDirection;
  amount: number;
  /** ISO-Datum `yyyy-MM-dd`. */
  entryDate: string;
  note: string | null;
}

/** Ein Schuldeintrag — ein Vorgang, bei dem einer Person Geld geliehen wurde. */
export interface Debt {
  id: number;
  personName: string;
  title: string;
  note: string | null;
  currency: string;
  /** Verliehen: zugeordnete Ausgaben plus manuell erfasste Beträge. */
  lentAmount: number;
  /** Zurückgezahlt: zugeordnete Einnahmen plus manuell erfasste Beträge. */
  repaidAmount: number;
  /** `lentAmount − repaidAmount`. Negativ, wenn mehr zurückkam als verliehen wurde. */
  outstandingAmount: number;
  transactionCount: number;
  /** Anzahl der manuell erfassten Beträge. */
  entryCount: number;
  /** Positionen insgesamt — Buchungen und manuelle Beträge zusammen. */
  positionCount: number;
  status: DebtStatus;
  transactions: DebtTransaction[];
  entries: DebtEntry[];
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
  /**
   * Optionaler Startbetrag: ist er gesetzt, entsteht beim Anlegen zugleich die erste
   * manuelle Position „verliehen“. Beim Bearbeiten ignoriert der Server das Feld.
   */
  initialAmount: number | null;
  /** ISO-Datum `yyyy-MM-dd` des Startbetrags. Nur mit `initialAmount` von Bedeutung. */
  initialDate: string | null;
}
