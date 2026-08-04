/** Richtung einer Buchung. Die Werte entsprechen `TransactionType` des Backends. */
export type TransactionType = 'Income' | 'Expense';

/** Richtung einer Überweisung aus Sicht des geöffneten Kontos. */
export type TransferDirection = 'Outgoing' | 'Incoming';

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
  isTransfer: boolean;
  counterAccountId: number | null;
  counterAccountName: string | null;
  /** Kategorie der Gegenbuchung — nötig, um eine Überweisung verlustfrei zu bearbeiten. */
  counterCategoryId: number | null;
  createdAt: string;
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
}

/** Nutzdaten einer Überweisung zwischen zwei Konten. */
export interface TransferPayload {
  counterAccountId: number;
  direction: TransferDirection;
  amount: number;
  title: string;
  bookingDate: string;
  purchaseDate: string | null;
  accountingMonth: string;
  note: string | null;
  categoryId: number | null;
  counterCategoryId: number | null;
}

export type TransactionSort = 'BookingDate' | 'Amount' | 'Category' | 'Title';
export type SortDirection = 'Ascending' | 'Descending';

/** Filter, Sortierung und Seitenausschnitt der Transaktionsliste. */
export interface TransactionFilter {
  month: string;
  search: string;
  categoryIds: number[];
  includeUncategorized: boolean;
  type: TransactionType | null;
  sort: TransactionSort;
  direction: SortDirection;
  page: number;
  pageSize: number;
}

/** Ein serverseitig paginierter Ausschnitt einer Liste. */
export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
