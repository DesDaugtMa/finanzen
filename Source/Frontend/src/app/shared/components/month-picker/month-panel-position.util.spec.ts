import {
  MONTH_PANEL_MIN_WIDTH,
  MONTH_PANEL_TRIGGER_GAP,
  MONTH_PANEL_VIEWPORT_MARGIN,
  TriggerRect,
  computeMonthPanelPosition,
} from './month-panel-position.util';

const PANEL_HEIGHT = 260;

/** Ein Auslöser irgendwo im sichtbaren Bereich; Felder einzeln überschreibbar. */
function trigger(overrides: Partial<TriggerRect> = {}): TriggerRect {
  return { top: 100, bottom: 140, left: 40, width: 240, ...overrides };
}

describe('computeMonthPanelPosition', () => {
  const desktop = { width: 1280, height: 900 };
  const phone = { width: 360, height: 640 };

  it('klappt unterhalb des Auslösers auf, wenn dort Platz ist', () => {
    const position = computeMonthPanelPosition(trigger(), PANEL_HEIGHT, desktop);

    expect(position.placement).toBe('below');
    expect(position.top).toBe(140 + MONTH_PANEL_TRIGGER_GAP);
    expect(position.left).toBe(40);
  });

  it('gibt dem Panel mindestens seine Komfortbreite', () => {
    const position = computeMonthPanelPosition(trigger({ width: 220 }), PANEL_HEIGHT, desktop);

    expect(position.width).toBe(MONTH_PANEL_MIN_WIDTH);
  });

  it('deckt eine breitere Auslöser-Leiste vollständig ab', () => {
    const position = computeMonthPanelPosition(trigger({ width: 420 }), PANEL_HEIGHT, desktop);

    expect(position.width).toBe(420);
  });

  it('bleibt auf schmalen Telefonen innerhalb des Viewports', () => {
    const position = computeMonthPanelPosition(
      trigger({ left: MONTH_PANEL_VIEWPORT_MARGIN, width: 344 }),
      PANEL_HEIGHT,
      { width: 320, height: 640 },
    );

    expect(position.width).toBe(320 - 2 * MONTH_PANEL_VIEWPORT_MARGIN);
    expect(position.left).toBe(MONTH_PANEL_VIEWPORT_MARGIN);
    expect(position.left + position.width).toBeLessThanOrEqual(320 - MONTH_PANEL_VIEWPORT_MARGIN);
  });

  it('zieht ein am rechten Rand liegendes Panel zurück ins Bild', () => {
    const position = computeMonthPanelPosition(trigger({ left: 1200 }), PANEL_HEIGHT, desktop);

    expect(position.left).toBe(desktop.width - position.width - MONTH_PANEL_VIEWPORT_MARGIN);
    expect(position.left + position.width).toBeLessThanOrEqual(
      desktop.width - MONTH_PANEL_VIEWPORT_MARGIN,
    );
  });

  it('klappt nach oben, wenn unterhalb zu wenig Platz bleibt', () => {
    const position = computeMonthPanelPosition(
      trigger({ top: 460, bottom: 500 }),
      PANEL_HEIGHT,
      phone,
    );

    expect(position.placement).toBe('above');
    expect(position.top).toBe(460 - MONTH_PANEL_TRIGGER_GAP - PANEL_HEIGHT);
    expect(position.top).toBeGreaterThanOrEqual(MONTH_PANEL_VIEWPORT_MARGIN);
  });

  it('bleibt unten, wenn oberhalb noch weniger Platz wäre', () => {
    // Auslöser dicht unter der Oberkante: nach oben passt erst recht nichts.
    const position = computeMonthPanelPosition(trigger({ top: 20, bottom: 60 }), 700, phone);

    expect(position.placement).toBe('below');
  });

  it('hält das Panel auch beim Aufklappen nach oben im sichtbaren Bereich', () => {
    const position = computeMonthPanelPosition(trigger({ top: 200, bottom: 240 }), 400, {
      width: 360,
      height: 300,
    });

    expect(position.top).toBeGreaterThanOrEqual(MONTH_PANEL_VIEWPORT_MARGIN);
  });
});
