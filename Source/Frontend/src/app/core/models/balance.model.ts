/**
 * Kontokategorie. Sie trennt das Zahlungsvermögen (Girokonten) vom Anlagevermögen
 * und gruppiert die Konten in der Übersicht. Entspricht `AccountType` des Backends.
 */
export type AccountType = 'CheckingAccount' | 'SavingsAccount' | 'Depot' | 'CryptoWallet';

/** Ein Konto mit Kontostand und Bilanz des gewählten Monats. Spiegelt `AccountBalanceDto`. */
export interface AccountBalance {
  accountId: number;
  name: string;
  type: AccountType;
  bankName: string | null;
  iban: string | null;
  color: string | null;
  currency: string;
  initialBalance: number;
  /** Anfangssaldo + alle Einnahmen − alle Ausgaben, monatsübergreifend. */
  currentBalance: number;
  /** Der Stand „laut Bank“: wie `currentBalance`, aber ohne die offenen Ausgaben. */
  settledBalance: number;
  /** Summe der noch nicht abgebuchten Ausgaben dieses Kontos. */
  pendingTotal: number;
  pendingCount: number;
  /** Einnahmen des Monats auf diesem Konto, ohne Umbuchungen. */
  income: number;
  /** Ausgaben des Monats, ohne Umbuchungen, als positiver Wert. */
  expenses: number;
  /** `income − expenses`. Die Bilanz des Kontos im Monat. */
  net: number;
  transactionCount: number;
}

/** Bilanz und Vermögen einer Kontokategorie. Spiegelt `AccountGroupBalanceDto`. */
export interface AccountGroupBalance {
  type: AccountType;
  currency: string;
  income: number;
  expenses: number;
  net: number;
  /** Summe der aktuellen Kontostände dieser Kategorie. */
  balance: number;
  /** Summe der Stände „laut Bank“ dieser Kategorie, ohne die offenen Ausgaben. */
  settledBalance: number;
  pendingTotal: number;
  pendingCount: number;
  accounts: AccountBalance[];
}

/**
 * Die Monatsbilanz über alle Konten. Spiegelt `OverallMonthBalanceDto`.
 *
 * Umbuchungen zwischen eigenen Konten sind ausgenommen — sie verschieben Geld nur
 * von einer Tasche in die andere und würden Einnahmen wie Ausgaben überzeichnen.
 */
export interface MonthBalance {
  /** Monat im Format `yyyy-MM`. */
  month: string;
  currency: string;
  income: number;
  /** Summe der Ausgaben als positiver Wert. */
  expenses: number;
  /** `income − expenses`. Die Bilanz des Monats. */
  net: number;
  /** Bewegtes Volumen der Umbuchungen, je Umbuchung einmal gezählt. Rein informativ. */
  transferVolume: number;
  /** Bilanz des Vormonats, für den Vergleich. */
  previousNet: number;
  /** Aktuelles Gesamtvermögen über alle Kontokategorien. */
  netWorth: number;
  /** Das Gesamtvermögen „laut Bank“, ohne die noch nicht abgebuchten Ausgaben. */
  settledNetWorth: number;
  /** Summe aller noch nicht abgebuchten Ausgaben über alle Konten. */
  pendingTotal: number;
  pendingCount: number;
  transactionCount: number;
  /** Kategorien in fester Reihenfolge; Kategorien ohne Konto fehlen. */
  groups: AccountGroupBalance[];
}

/**
 * Die Bilanz eines frei gewählten Zeitraums. Spiegelt `PeriodBalanceDto`.
 *
 * Inhaltlich die Monatsbilanz, nur dass der Zeitraum ein Monat oder ein ganzes
 * Jahr sein kann. Alle Flusszahlen (Einnahmen, Ausgaben, Bilanz) beziehen sich
 * auf den Zeitraum; die Vermögenswerte (`netWorth`, `currentBalance` je Konto)
 * zeigen immer den heutigen Stand — ein Kontostand ist eine Zeitpunktgröße.
 */
export interface PeriodBalance {
  /** `yyyy-MM` bei Monat, `yyyy` bei Jahr. */
  period: string;
  kind: 'Month' | 'Year';
  currency: string;
  income: number;
  /** Summe der Ausgaben als positiver Wert. */
  expenses: number;
  /** `income − expenses`. Die Bilanz des Zeitraums. */
  net: number;
  /** Bewegtes Volumen der Umbuchungen, je Umbuchung einmal gezählt. Rein informativ. */
  transferVolume: number;
  /** Bilanz des vorangehenden Zeitraums gleicher Körnung (Vormonat bzw. Vorjahr). */
  previousNet: number;
  /** Aktuelles Gesamtvermögen über alle Kontokategorien. */
  netWorth: number;
  /** Das Gesamtvermögen „laut Bank“, ohne die noch nicht abgebuchten Ausgaben. */
  settledNetWorth: number;
  pendingTotal: number;
  pendingCount: number;
  transactionCount: number;
  /** Kategorien in fester Reihenfolge; Kategorien ohne Konto fehlen. */
  groups: AccountGroupBalance[];
}

/** Ein Monat im Jahresverlauf. Spiegelt `MonthBalancePointDto`. */
export interface MonthBalancePoint {
  /** Monat im Format `yyyy-MM`. */
  month: string;
  income: number;
  expenses: number;
  net: number;
  transactionCount: number;
}

/** Die Jahresbilanz samt Verlauf. Spiegelt `YearBalanceDto`. */
export interface YearBalance {
  year: number;
  currency: string;
  income: number;
  expenses: number;
  net: number;
  /** Durchschnittliche Bilanz je Monat mit Buchungen. */
  averageNet: number;
  /** Bester Monat als `yyyy-MM`, oder null ohne Buchungen. */
  bestMonth: string | null;
  /** Schwächster Monat als `yyyy-MM`, oder null ohne Buchungen. */
  worstMonth: string | null;
  /** Immer genau zwölf Einträge, Januar bis Dezember. */
  months: MonthBalancePoint[];
}
