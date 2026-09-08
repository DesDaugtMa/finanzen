/**
 * Geometrie des aufklappenden Monats-Panels.
 *
 * Das Panel wird `position: fixed` am Viewport ausgerichtet statt `absolute` am
 * Auslöser: absolut positioniert wurde es von jedem clippenden Vorfahren
 * abgeschnitten — konkret von der `overflow: hidden` tragenden Markenfläche, in
 * der beide Einsatzorte liegen. Fixed kennt keinen solchen Ausschnitt, verlangt
 * dafür aber, dass die Position selbst gerechnet wird. Genau das passiert hier,
 * bewusst als reine Funktion ohne DOM-Zugriff: so ist die Logik ohne
 * Layout-Engine prüfbar.
 */

/** Der für die Ausrichtung relevante Ausschnitt des Auslösers (aus `getBoundingClientRect`). */
export interface TriggerRect {
  readonly top: number;
  readonly bottom: number;
  readonly left: number;
  readonly width: number;
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface MonthPanelPosition {
  readonly top: number;
  readonly left: number;
  readonly width: number;
  /** `above`, wenn unterhalb des Auslösers zu wenig Platz bleibt. */
  readonly placement: 'below' | 'above';
}

/**
 * Mindestbreite des Panels in px (20rem bei 16px Wurzelschrift). Darunter
 * stehen die drei Monatsspalten unangenehm eng.
 */
export const MONTH_PANEL_MIN_WIDTH = 320;

/** Sicherheitsabstand zu den Viewport-Rändern (entspricht `--fin-space-2`). */
export const MONTH_PANEL_VIEWPORT_MARGIN = 8;

/** Abstand zwischen Auslöser-Leiste und Panel (entspricht `--fin-space-2`). */
export const MONTH_PANEL_TRIGGER_GAP = 8;

function clamp(value: number, min: number, max: number): number {
  // Bei sehr schmalen Viewports kann `max` unter `min` rutschen — dann gewinnt
  // `min`, sonst würde das Panel nach links aus dem Bild wandern.
  return Math.max(min, Math.min(value, Math.max(min, max)));
}

/**
 * Berechnet Position und Breite des Panels.
 *
 * Breite: so breit wie die Auslöser-Leiste, mindestens {@link MONTH_PANEL_MIN_WIDTH},
 * höchstens der Viewport abzüglich der Ränder. Auf dem Telefon dehnt sich die
 * Leiste über die volle Breite — das Panel deckt sie damit exakt ab; auf
 * größeren Screens ist die Leiste schmaler und das Panel bekommt seine
 * komfortable Mindestbreite.
 */
export function computeMonthPanelPosition(
  trigger: TriggerRect,
  panelHeight: number,
  viewport: ViewportSize,
): MonthPanelPosition {
  // `Math.max(0, …)` fängt entartete Viewport-Maße ab (etwa im Test ohne
  // Layout-Engine); eine negative Breite dürfte nie ins Stylesheet gelangen.
  const maxWidth = Math.max(0, viewport.width - 2 * MONTH_PANEL_VIEWPORT_MARGIN);
  const width = Math.min(Math.max(trigger.width, MONTH_PANEL_MIN_WIDTH), maxWidth);

  const left = clamp(
    trigger.left,
    MONTH_PANEL_VIEWPORT_MARGIN,
    viewport.width - width - MONTH_PANEL_VIEWPORT_MARGIN,
  );

  const spaceBelow = viewport.height - trigger.bottom - MONTH_PANEL_TRIGGER_GAP;
  const spaceAbove = trigger.top - MONTH_PANEL_TRIGGER_GAP;

  // Unten aufklappen ist die Regel. Nach oben wird nur gewechselt, wenn es
  // unten nicht passt und oben mehr Platz ist — sonst bliebe das Panel auch
  // oben angeschnitten und der Wechsel hätte nichts gewonnen.
  const fitsBelow = panelHeight <= spaceBelow - MONTH_PANEL_VIEWPORT_MARGIN;
  const placement: 'below' | 'above' = fitsBelow || spaceBelow >= spaceAbove ? 'below' : 'above';

  const top =
    placement === 'below'
      ? trigger.bottom + MONTH_PANEL_TRIGGER_GAP
      : Math.max(MONTH_PANEL_VIEWPORT_MARGIN, trigger.top - MONTH_PANEL_TRIGGER_GAP - panelHeight);

  return { top, left, width, placement };
}
