/** Die Lage eines Abrechnungsmonats relativ zum heutigen Tag. */
export type MonthPosition = 'Past' | 'Current' | 'Future';

/** Worauf sich der Betrag „pro Tag“ bezieht. */
export type DailyAllowanceMode = 'RemainingDays' | 'FullMonth' | 'PastAverage';

/**
 * Wie viel pro Tag noch ausgegeben werden kann, ohne den Monat im Minus zu beenden.
 * Spiegelt `DailyAllowanceDto`.
 */
export interface DailyAllowance {
  /** Betrag pro Tag, nach unten bei 0 begrenzt. Bei `PastAverage` die tatsächlichen Ausgaben pro Tag. */
  amount: number;
  /** Kontostand, auf dem die Rechnung aufsetzt. */
  balance: number;
  /** Restverpflichtung aus den Fixkosten: je Position `max(0, geplant − gebucht)`. */
  openFixedCosts: number;
  /** `balance − openFixedCosts`, ungekappt. Negativ bedeutet Unterdeckung. */
  available: number;
  /** Die Tage, auf die `available` verteilt wird. */
  days: number;
  mode: DailyAllowanceMode;
}

/** Das erwartete Ergebnis am Monatsende. Spiegelt `ForecastDto`. */
export interface Forecast {
  /** `Einnahmen − Fixkosten − bisherige variable Ausgaben − erwarteter Rest`. Kann negativ sein. */
  amount: number;
  expectedRemainingExpenses: number;
  /** Bisherige variable Ausgaben pro vergangenem Tag. */
  dailyAverageExpenses: number;
  remainingDays: number;
  /** `false`, wenn nichts hochgerechnet wurde — dann ist `amount` das tatsächliche Ergebnis. */
  isProjected: boolean;
}

/** Ein Tag im Verlauf des Monats. Spiegelt `BalancePointDto`. */
export interface BalancePoint {
  /** Tag des Monats, 1-basiert. */
  day: number;
  /** Datum als `yyyy-MM-dd`. */
  date: string;
  income: number;
  /** Ausgaben des Tages als positiver Wert. */
  expenses: number;
  /** Bilanz des Monats bis einschließlich dieses Tages, beginnend bei 0. */
  value: number;
  hasBookings: boolean;
}

/** Geplante gegen tatsächliche Ausgaben einer Kategorie. Spiegelt `PlanComparisonItemDto`. */
export interface PlanComparisonItem {
  /** Null steht für Buchungen ohne Kategorie. */
  categoryId: number | null;
  categoryName: string;
  categoryColor: string | null;
  categoryIcon: string | null;
  budget: number;
  fixedCosts: number;
  /** `budget + fixedCosts` — der geplante Rahmen der Kategorie. */
  planned: number;
  actual: number;
  /** `planned − actual`. Negativ bedeutet Überschreitung. */
  difference: number;
}

/** Auswertungen eines Kontos für einen Abrechnungsmonat. Spiegelt `AccountStatisticsDto`. */
export interface AccountStatistics {
  /** Monat im Format `yyyy-MM`. */
  month: string;
  currency: string;
  daysInMonth: number;
  position: MonthPosition;
  /** Tag des Monats, an dem „heute“ steht. Null, wenn der Monat nicht der laufende ist. */
  currentDay: number | null;
  dailyAllowance: DailyAllowance;
  forecast: Forecast;
  /** Ein Punkt je Tag des Monats, aufsteigend. */
  trend: BalancePoint[];
  planComparison: PlanComparisonItem[];
  plannedTotal: number;
  actualTotal: number;
}
