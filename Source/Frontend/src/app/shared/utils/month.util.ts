/**
 * Abrechnungsmonate werden überall als `yyyy-MM` geführt — in der URL, im State und
 * gegenüber der API. Die Umrechnung von und nach `Date` steckt bewusst nur hier,
 * damit Monatsgrenzen und Zeitzonen an einer einzigen Stelle behandelt werden.
 */
export const MONTH_LOCALE = 'de-DE';

/** Prüft das Format `yyyy-MM` inklusive gültiger Monatszahl. */
export function isValidMonthKey(value: string | null | undefined): value is string {
  if (!value) return false;
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

/** Monatsschlüssel eines Datums, z. B. `2026-07`. */
export function toMonthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Erster Tag des Monats als lokales `Date` — Basis für Formatierung und Rechnen. */
export function monthKeyToDate(month: string): Date {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1);
}

/** Verschiebt den Monatsschlüssel um `offset` Monate (auch negativ). */
export function addMonths(month: string, offset: number): string {
  const date = monthKeyToDate(month);
  date.setMonth(date.getMonth() + offset);
  return toMonthKey(date);
}

/** Ausgeschriebener Monat mit Jahr, z. B. `Juli 2026`. */
export function formatMonthLong(month: string): string {
  return new Intl.DateTimeFormat(MONTH_LOCALE, { month: 'long', year: 'numeric' }).format(
    monthKeyToDate(month),
  );
}

/** Kurzform für enge Schaltflächen, z. B. `Jul 2026`. */
export function formatMonthShort(month: string): string {
  return new Intl.DateTimeFormat(MONTH_LOCALE, { month: 'short', year: 'numeric' }).format(
    monthKeyToDate(month),
  );
}

/** Die zwölf Monatsnamen eines Jahres für die Auswahl im Monatspicker. */
export function monthNames(): readonly string[] {
  const formatter = new Intl.DateTimeFormat(MONTH_LOCALE, { month: 'short' });
  return Array.from({ length: 12 }, (_, index) => formatter.format(new Date(2000, index, 1)));
}

/** Jahresanteil eines Monatsschlüssels. */
export function yearOf(month: string): number {
  return Number(month.slice(0, 4));
}

/** Monatsanteil (1–12) eines Monatsschlüssels. */
export function monthOf(month: string): number {
  return Number(month.slice(5, 7));
}

/** Setzt einen Monatsschlüssel aus Jahr und Monat (1–12) zusammen. */
export function buildMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** ISO-Datum `yyyy-MM-dd` eines lokalen `Date` — ohne Zeitzonen-Verschiebung von `toISOString()`. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Datumsanzeige, z. B. `28.07.2026`. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat(MONTH_LOCALE).format(new Date(year, month - 1, day));
}

/** Der Monatsschlüssel, in dem ein ISO-Datum liegt. */
export function monthKeyOfDate(isoDate: string): string {
  return isoDate.slice(0, 7);
}
