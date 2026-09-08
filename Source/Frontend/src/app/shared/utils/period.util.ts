import {
  buildMonthKey,
  formatMonthLong,
  formatMonthShort,
  isValidMonthKey,
  monthOf,
  toMonthKey,
  yearOf,
} from './month.util';

/** Die Körnung eines Zeitraums. Entspricht `BalancePeriodKind` des Backends. */
export type PeriodKind = 'Month' | 'Year';

/**
 * Der Zeitraum, auf den sich die gesamte Startseite bezieht: entweder ein
 * Abrechnungsmonat (`2026-07`) oder ein ganzes Jahr (`2026`).
 *
 * Er wird als ein einziger Schlüssel geführt — in der URL, im Zustand, gegenüber
 * der API und als Schlüssel des Offline-Zwischenspeichers. Ein Schlüssel statt
 * zweier getrennter Felder (Modus + Wert) macht ungültige Kombinationen
 * unmöglich und hält die Vergleiche im Frontend auf einem simplen `===`.
 */
export interface Period {
  kind: PeriodKind;
  /** `yyyy-MM` bei Monat, `yyyy` bei Jahr. */
  key: string;
  year: number;
  /** 1–12 bei Monat, null bei Jahr. */
  month: number | null;
}

const YEAR_PATTERN = /^\d{4}$/;

/** Der Zeitraum eines Monatsschlüssels. */
export function monthPeriod(month: string): Period {
  return { kind: 'Month', key: month, year: yearOf(month), month: monthOf(month) };
}

/** Der Zeitraum eines ganzen Jahres. */
export function yearPeriod(year: number): Period {
  return { kind: 'Year', key: String(year), year, month: null };
}

/** Der Zeitraum, mit dem die Startseite ohne Angabe in der URL startet. */
export function currentMonthPeriod(now: Date): Period {
  return monthPeriod(toMonthKey(now));
}

/**
 * Liest einen Zeitraum aus seiner Textform. Die Länge entscheidet über die
 * Körnung — genau wie im Backend, damit beide Seiten dieselbe Regel anwenden.
 */
export function parsePeriod(key: string | null | undefined): Period | null {
  if (!key) return null;

  if (isValidMonthKey(key)) return monthPeriod(key);
  if (YEAR_PATTERN.test(key)) return yearPeriod(Number(key));

  return null;
}

/** Ausgeschriebene Bezeichnung, z. B. `Juli 2026` oder `Jahr 2026`. */
export function formatPeriodLong(period: Period): string {
  return period.kind === 'Month' ? formatMonthLong(period.key) : `Jahr ${period.year}`;
}

/** Kurzform für enge Beschriftungen, z. B. `Jul 2026` oder `2026`. */
export function formatPeriodShort(period: Period): string {
  return period.kind === 'Month' ? formatMonthShort(period.key) : String(period.year);
}

/** Der unmittelbar davorliegende Zeitraum gleicher Körnung — die Vergleichsgröße. */
export function previousPeriod(period: Period): Period {
  if (period.kind === 'Year') return yearPeriod(period.year - 1);

  const month = period.month ?? 1;
  return month === 1
    ? monthPeriod(buildMonthKey(period.year - 1, 12))
    : monthPeriod(buildMonthKey(period.year, month - 1));
}

/**
 * Der Monat, mit dem eine Detailseite aus diesem Zeitraum heraus geöffnet wird.
 * Die Kontodetailseite ist durchgehend monatsbasiert; aus einem Jahr wird deshalb
 * dessen Januar — ein definierter Einstieg innerhalb desselben Jahres.
 */
export function detailMonthOf(period: Period): string {
  return period.kind === 'Month' ? period.key : buildMonthKey(period.year, 1);
}
