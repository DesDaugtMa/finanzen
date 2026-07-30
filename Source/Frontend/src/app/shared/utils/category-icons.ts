export interface CategoryIconPreset {
  value: string;
  label: string;
}

/**
 * Kuratierte Auswahl an Bootstrap-Icons für Kategorien. Bewusst eine feste Liste
 * statt freier Eingabe — so bleibt das Erscheinungsbild einheitlich und es können
 * keine Icon-Namen hinterlegt werden, die die Schriftart nicht kennt.
 */
export const CATEGORY_ICON_PRESETS: readonly CategoryIconPreset[] = [
  { value: 'cart', label: 'Einkauf' },
  { value: 'house', label: 'Wohnen' },
  { value: 'car-front', label: 'Auto' },
  { value: 'bus-front', label: 'Öffentliche Verkehrsmittel' },
  { value: 'cup-hot', label: 'Café' },
  { value: 'egg-fried', label: 'Restaurant' },
  { value: 'controller', label: 'Freizeit' },
  { value: 'film', label: 'Unterhaltung' },
  { value: 'heart-pulse', label: 'Gesundheit' },
  { value: 'shield-check', label: 'Versicherung' },
  { value: 'lightning-charge', label: 'Energie' },
  { value: 'wifi', label: 'Internet & Telefon' },
  { value: 'mortarboard', label: 'Bildung' },
  { value: 'gift', label: 'Geschenke' },
  { value: 'airplane', label: 'Reisen' },
  { value: 'bag-heart', label: 'Kleidung' },
  { value: 'piggy-bank', label: 'Sparen' },
  { value: 'cash-coin', label: 'Einkommen' },
  { value: 'receipt', label: 'Gebühren' },
  { value: 'three-dots', label: 'Sonstiges' },
];

/** Fallback, wenn für eine Kategorie kein Symbol hinterlegt ist. */
export const DEFAULT_CATEGORY_ICON = 'tag';
