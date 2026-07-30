/**
 * Zentrale Geld-Formatierung. Bewusst an einer Stelle definiert, damit Beträge
 * in der gesamten App identisch aussehen und die Locale mit einer Zeile umstellbar ist.
 */
export const MONEY_LOCALE = 'de-DE';

export const DEFAULT_CURRENCY = 'EUR';

/** Formatiert einen Betrag locale-korrekt, z. B. `1.234,50 €`. */
export function formatMoney(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return new Intl.NumberFormat(MONEY_LOCALE, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formatiert den Betrag ohne Vorzeichen. Für Einnahmen/Ausgaben, bei denen die
 * Richtung separat über `+`/`−` und ein Symbol dargestellt wird.
 */
export function formatMoneyAbsolute(amount: number, currency: string = DEFAULT_CURRENCY): string {
  return formatMoney(Math.abs(amount), currency);
}

/**
 * Wandelt eine Nutzereingabe wie `1.234,50` oder `1234.5` in eine Zahl um.
 * Gibt `null` zurück, wenn die Eingabe kein gültiger Betrag ist.
 */
export function parseMoneyInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Deutsches Format: Punkt ist Tausendertrenner, Komma ist Dezimaltrenner.
  const normalized = trimmed.includes(',')
    ? trimmed.replace(/\./g, '').replace(',', '.')
    : trimmed.replace(/\s/g, '');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
