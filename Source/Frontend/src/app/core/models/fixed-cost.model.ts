/**
 * Stand einer Fixkosten-Position gegenüber ihren tatsächlichen Buchungen.
 * Die Werte entsprechen `FixedCostStatus` des Backends.
 */
export type FixedCostStatus = 'Open' | 'Partial' | 'Booked' | 'Exceeded';

/** Eine einer Fixkosten-Position zugeordnete oder zuordenbare Buchung in Kurzform. */
export interface FixedCostTransaction {
  id: number;
  title: string;
  amount: number;
  currency: string;
  /** ISO-Datum `yyyy-MM-dd`. */
  bookingDate: string;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  /** Abrechnungsmonat der Buchung im Format `yyyy-MM`. Kann vom Monat der Position abweichen. */
  accountingMonth: string;
}

/** Eine geplante Fixkosten-Position. Spiegelt `FixedCostDto` des Backends. */
export interface FixedCost {
  id: number;
  accountId: number;
  /** Monat der Position im Format `yyyy-MM`. */
  month: string;
  name: string;
  /** Geplanter Betrag, immer positiv. */
  amount: number;
  currency: string;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  note: string | null;
  /** Summe der zugeordneten Buchungen. */
  bookedAmount: number;
  transactionCount: number;
  /** Der Betrag, der in die Monatsrechnung eingeht: gebucht, sobald es Buchungen gibt, sonst geplant. */
  effectiveAmount: number;
  status: FixedCostStatus;
  transactions: FixedCostTransaction[];
}

/** Alle Fixkosten eines Kontos in einem Monat samt Summen. Spiegelt `FixedCostMonthDto`. */
export interface FixedCostMonth {
  /** Monat im Format `yyyy-MM`. */
  month: string;
  currency: string;
  items: FixedCost[];
  totalPlanned: number;
  totalBooked: number;
  totalEffective: number;
  openCount: number;
}

/** Nutzdaten zum Anlegen und Bearbeiten einer Fixkosten-Position. */
export interface FixedCostPayload {
  name: string;
  amount: number;
  categoryId: number | null;
  note: string | null;
}

/** Eine Position des Quellmonats im Übernahme-Dialog. */
export interface FixedCostCopyCandidate {
  id: number;
  name: string;
  amount: number;
  categoryId: number | null;
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
  /** True, wenn es im Zielmonat bereits eine Position dieses Namens gibt. */
  alreadyExists: boolean;
}

/** Vorschau der übernehmbaren Positionen eines Quellmonats. */
export interface FixedCostCopyPreview {
  /** Monat, in den übernommen wird (`yyyy-MM`). */
  targetMonth: string;
  /** Der angezeigte Quellmonat (`yyyy-MM`), oder null, wenn es keinen gibt. */
  sourceMonth: string | null;
  /** Alle Monate mit Fixkosten außer dem Zielmonat, absteigend. */
  availableMonths: string[];
  currency: string;
  items: FixedCostCopyCandidate[];
}
