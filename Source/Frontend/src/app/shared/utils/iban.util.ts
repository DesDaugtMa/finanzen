/** Entfernt Leerzeichen und vereinheitlicht die Groß-/Kleinschreibung. */
export function normalizeIban(iban: string): string {
  return iban.replace(/\s/g, '').toUpperCase();
}

/** Gruppiert die IBAN in Viererblöcke, z. B. `AT61 1904 3002 3457 3201`. */
export function formatIban(iban: string): string {
  return normalizeIban(iban)
    .replace(/(.{4})/g, '$1 ')
    .trim();
}

/**
 * Verkürzte Darstellung für Übersichtskarten: Ländercode und die letzten vier
 * Stellen, z. B. `AT •••• 3201`. Kontonummern gehören nicht vollständig in eine Liste.
 */
export function maskIban(iban: string): string {
  const normalized = normalizeIban(iban);
  if (normalized.length < 8) return normalized;

  return `${normalized.slice(0, 2)} •••• ${normalized.slice(-4)}`;
}

/** Plausibilitätsprüfung des Formats (Ländercode, Prüfziffer, 11–30 Stellen). */
export function isValidIbanFormat(iban: string): boolean {
  return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(normalizeIban(iban));
}
