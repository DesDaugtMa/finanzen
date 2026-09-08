import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonthPickerComponent } from './month-picker.component';

describe('MonthPickerComponent', () => {
  let fixture: ComponentFixture<MonthPickerComponent>;
  let element: HTMLElement;

  /** Der mittlere Knopf der Leiste klappt das Panel auf und zu. */
  function trigger(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('.month-trigger')!;
  }

  function panel(): HTMLElement | null {
    return element.querySelector<HTMLElement>('.month-panel');
  }

  async function openPanel(): Promise<void> {
    trigger().click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MonthPickerComponent] }).compileComponents();

    fixture = TestBed.createComponent(MonthPickerComponent);
    fixture.componentRef.setInput('month', '2026-07');
    await fixture.whenStable();

    element = fixture.nativeElement as HTMLElement;
  });

  it('zeigt den gewählten Monat ausgeschrieben an', () => {
    expect(trigger().textContent).toContain('Juli 2026');
  });

  it('blättert über die Pfeile einen Monat vor und zurück', async () => {
    const emitted: string[] = [];
    fixture.componentInstance.monthChange.subscribe((month) => emitted.push(month));

    const steps = element.querySelectorAll<HTMLButtonElement>('.month-step');
    steps[0].click();
    steps[1].click();
    await fixture.whenStable();

    expect(emitted).toEqual(['2026-06', '2026-08']);
  });

  it('öffnet und schließt das Panel über den Auslöser', async () => {
    expect(panel()).toBeNull();

    await openPanel();
    expect(panel()).not.toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    await openPanel();
    expect(panel()).toBeNull();
  });

  it('hebt den gewählten Monat im Panel hervor', async () => {
    await openPanel();

    const selected = element.querySelectorAll('.month-cell--selected');
    expect(selected.length).toBe(1);
    expect(selected[0].getAttribute('aria-current')).toBe('true');
  });

  it('meldet den gewählten Monat und schließt das Panel', async () => {
    const emitted: string[] = [];
    fixture.componentInstance.monthChange.subscribe((month) => emitted.push(month));

    await openPanel();
    element.querySelectorAll<HTMLButtonElement>('.month-cell')[2].click();
    await fixture.whenStable();

    expect(emitted).toEqual(['2026-03']);
    expect(panel()).toBeNull();
  });

  it('blättert das Jahr im Panel, ohne den Monat zu verändern', async () => {
    const emitted: string[] = [];
    fixture.componentInstance.monthChange.subscribe((month) => emitted.push(month));

    await openPanel();
    element.querySelector<HTMLButtonElement>('.month-panel__head .btn')!.click();
    await fixture.whenStable();

    expect(element.querySelector('.month-panel__year')!.textContent).toContain('2025');
    expect(emitted).toEqual([]);
    // Ein anderes Jahr — der Juli darf jetzt nicht mehr als gewählt gelten.
    expect(element.querySelectorAll('.month-cell--selected').length).toBe(0);

    element.querySelectorAll<HTMLButtonElement>('.month-cell')[6].click();
    await fixture.whenStable();
    expect(emitted).toEqual(['2025-07']);
  });

  it('schließt das Panel per Escape', async () => {
    await openPanel();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('schließt das Panel beim Klick außerhalb', async () => {
    await openPanel();

    document.body.click();
    await fixture.whenStable();

    expect(panel()).toBeNull();
  });

  it('lässt das Panel beim Klick darin offen', async () => {
    await openPanel();

    panel()!.click();
    await fixture.whenStable();

    expect(panel()).not.toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Regression zu Issue #23: Das Panel wurde von der `overflow: hidden`
  // tragenden Markenfläche abgeschnitten, in der beide Einsatzorte liegen.
  // Seitdem hängt es am Viewport statt am Auslöser — diese Eigenschaft darf
  // nicht unbemerkt zurückgedreht werden.
  // ---------------------------------------------------------------------------
  describe('Überlagerung (Issue #23)', () => {
    it('positioniert das Panel am Viewport statt im clippenden Elternelement', async () => {
      await openPanel();

      expect(getComputedStyle(panel()!).position).toBe('fixed');
    });

    it('rechnet Lage und Breite des Panels aus und schreibt sie an', async () => {
      await openPanel();

      const style = panel()!.style;
      expect(style.top).not.toBe('');
      expect(style.left).not.toBe('');
      expect(style.width).not.toBe('');
    });

    it('gibt das Panel erst frei, wenn seine Lage feststeht', async () => {
      await openPanel();

      expect(panel()!.classList).toContain('month-panel--placed');
    });

    it('rechnet die Lage beim Scrollen neu', async () => {
      await openPanel();

      const before = panel()!.style.top;
      // Der Auslöser wandert nach oben — das Panel muss folgen.
      const nav = element.querySelector<HTMLElement>('.month-nav')!;
      nav.getBoundingClientRect = () =>
        ({ top: 400, bottom: 440, left: 24, width: 240 }) as DOMRect;

      window.dispatchEvent(new Event('scroll'));
      await fixture.whenStable();

      expect(panel()!.style.top).not.toBe(before);
    });
  });
});
