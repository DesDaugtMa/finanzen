export interface AccentColorPreset {
  value: string;
  label: string;
}

/**
 * Akzentfarben zur Auswahl für Konten (später auch Kategorien).
 * Bewusst eine feste, aufeinander abgestimmte Palette statt eines freien
 * Farbwählers — so bleibt das Erscheinungsbild der App einheitlich.
 */
export const ACCENT_COLOR_PRESETS: readonly AccentColorPreset[] = [
  { value: '#0f766e', label: 'Petrol' },
  { value: '#0369a1', label: 'Blau' },
  { value: '#4f46e5', label: 'Indigo' },
  { value: '#7e22ce', label: 'Violett' },
  { value: '#be123c', label: 'Rot' },
  { value: '#c2410c', label: 'Orange' },
  { value: '#a16207', label: 'Gold' },
  { value: '#15803d', label: 'Grün' },
  { value: '#475569', label: 'Grau' },
];

/** Fallback, wenn für ein Konto keine Farbe hinterlegt ist. */
export const DEFAULT_ACCENT_COLOR = '#0f766e';
