import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  afterNextRender,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  addMonths,
  buildMonthKey,
  formatMonthLong,
  monthNames,
  monthOf,
  toMonthKey,
  yearOf,
} from '../../utils/month.util';
import { MonthPanelPosition, computeMonthPanelPosition } from './month-panel-position.util';

/**
 * Auswahl eines Abrechnungsmonats: Blättern über die Pfeile, größere Sprünge über
 * das Auswahlfeld. Der Wert ist immer ein Monatsschlüssel `yyyy-MM`.
 */
@Component({
  selector: 'app-month-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.month-picker--on-brand]': "tone() === 'on-brand'",
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'close()',
  },
  template: `
    <div #nav class="btn-group month-nav" role="group" aria-label="Monat auswählen">
      <button
        type="button"
        class="btn btn-outline-secondary month-step"
        [disabled]="disabled()"
        [attr.aria-label]="'Vorheriger Monat: ' + previousLabel()"
        (click)="step(-1)"
      >
        <i class="bi bi-chevron-left" aria-hidden="true"></i>
      </button>

      <button
        type="button"
        class="btn btn-outline-secondary month-trigger fw-semibold"
        [disabled]="disabled()"
        [attr.aria-expanded]="open()"
        aria-haspopup="true"
        (click)="toggle()"
      >
        <span class="month-label">{{ currentLabel() }}</span>
        <i class="bi bi-chevron-down ms-2 small" aria-hidden="true"></i>
      </button>

      <button
        type="button"
        class="btn btn-outline-secondary month-step"
        [disabled]="disabled()"
        [attr.aria-label]="'Nächster Monat: ' + nextLabel()"
        (click)="step(1)"
      >
        <i class="bi bi-chevron-right" aria-hidden="true"></i>
      </button>
    </div>

    @if (open()) {
      <div
        #panel
        class="month-panel"
        role="dialog"
        aria-label="Monat und Jahr auswählen"
        [class.month-panel--placed]="position() !== null"
        [class.month-panel--above]="position()?.placement === 'above'"
        [style.top.px]="position()?.top"
        [style.left.px]="position()?.left"
        [style.width.px]="position()?.width"
      >
        <div class="month-panel__head">
          <button
            type="button"
            class="btn fin-btn-icon"
            aria-label="Vorheriges Jahr"
            (click)="stepYear(-1)"
          >
            <i class="bi bi-chevron-left" aria-hidden="true"></i>
          </button>
          <strong class="month-panel__year" aria-live="polite">{{ panelYear() }}</strong>
          <button
            type="button"
            class="btn fin-btn-icon"
            aria-label="Nächstes Jahr"
            (click)="stepYear(1)"
          >
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </div>

        <div class="month-grid">
          @for (name of names; track $index; let i = $index) {
            <button
              type="button"
              class="month-cell"
              [class.month-cell--selected]="isSelected(i + 1)"
              [attr.aria-current]="isSelected(i + 1) ? 'true' : null"
              (click)="select(i + 1)"
            >
              {{ name }}
            </button>
          }
        </div>

        <button
          type="button"
          class="btn btn-link btn-sm month-panel__today"
          (click)="selectCurrentMonth()"
        >
          Aktueller Monat
        </button>
      </div>
    }
  `,
  styles: [
    `
      /* Auf schmalen Displays nimmt die Leiste die volle Breite: die drei
         Schaltflächen werden dadurch zu grossen, sicher treffbaren Zielen, und
         die feste Mindestbreite des Auslösers kann auf kleinen Telefonen
         (320px) nicht mehr aus dem Container laufen. Ab Tablet schrumpft sie
         auf ihre Inhaltsbreite zurück. */
      :host {
        display: block;
        position: relative;
      }
      @media (min-width: 34rem) {
        :host {
          display: inline-block;
        }
      }
      .month-nav {
        /* Die drei Schaltflächen wirken als ein Element: nur die Außenkanten
           sind gerundet, innen stoßen sie mit geteilter Linie aneinander. */
        display: flex;
        width: 100%;
        border-radius: var(--fin-radius-sm);
      }
      @media (min-width: 34rem) {
        .month-nav {
          display: inline-flex;
          width: auto;
        }
      }
      .month-step {
        --bs-btn-padding-x: var(--fin-space-3);
        /* Die Pfeile behalten ihre Breite, der Auslöser in der Mitte dehnt sich. */
        flex: 0 0 auto;
      }
      .month-trigger {
        flex: 1 1 auto;
        min-width: 0;
        font-variant-numeric: tabular-nums;
      }
      @media (min-width: 34rem) {
        .month-trigger {
          flex: 0 0 auto;
          min-width: 10.5rem;
        }
      }
      .month-label {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Das Panel hängt am Viewport, nicht am Auslöser: absolut positioniert
         wurde es von jedem clippenden Vorfahren abgeschnitten — hier von der
         Markenfläche mit overflow:hidden, in der beide Einsatzorte liegen
         (Issue #23). Position und Breite rechnet die Komponente, siehe
         month-panel-position.util.ts. */
      .month-panel {
        position: fixed;
        z-index: var(--fin-z-dropdown);
        padding: var(--fin-space-3);
        background-color: var(--fin-bg-elevated);
        border: 1px solid var(--fin-border);
        border-radius: var(--fin-radius-md);
        box-shadow: var(--fin-shadow-lg);
        transform-origin: top left;
      }
      /* Vor der ersten Messung steht das Panel noch am falschen Fleck. Es
         bleibt deshalb einen Frame lang unsichtbar — sonst blitzte es oben
         links auf und spränge dann an seinen Platz. */
      .month-panel:not(.month-panel--placed) {
        visibility: hidden;
      }
      .month-panel--placed {
        animation: fin-pop-in var(--fin-duration-fast) var(--fin-ease-out) both;
      }
      .month-panel--above {
        transform-origin: bottom left;
      }
      .month-panel__head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: var(--fin-space-2);
      }
      .month-panel__year {
        font-size: var(--fin-text-md);
        font-variant-numeric: tabular-nums;
        letter-spacing: var(--fin-tracking-tight);
      }
      .month-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: var(--fin-space-1);
      }
      .month-cell {
        /* Volles Touch-Mindestmass (44px, WCAG 2.5.5) statt knapper 40px —
           zwölf Felder dicht an dicht wollen sicher treffbar sein. */
        min-height: var(--fin-touch-min);
        border: 0;
        border-radius: var(--fin-radius-xs);
        background-color: transparent;
        color: var(--fin-text);
        font-size: var(--fin-text-sm);
        font-weight: 600;
        cursor: pointer;
        transition:
          background-color var(--fin-duration-fast) var(--fin-ease-out),
          color var(--fin-duration-fast) var(--fin-ease-out);
      }
      .month-cell:hover:not(.month-cell--selected) {
        background-color: var(--fin-surface-hover);
      }
      .month-cell--selected {
        background-color: var(--fin-accent);
        color: var(--fin-text-on-accent);
      }
      .month-cell:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: -2px;
      }
      .month-panel__today {
        width: 100%;
        margin-top: var(--fin-space-2);
      }

      /* Variante für Markenflächen. Nur die Auslöser-Leiste wird umgefärbt —
         das aufklappende Panel bleibt eine eigene Fläche, weil es über dem
         Hintergrund schwebt und nicht Teil davon ist.

         Die Farben kommen aus den --fin-on-brand-*-Variablen, die die
         umgebende .fin-brand-surface setzt. Dadurch zieht ein Theme-Wechsel
         automatisch mit und die Komponente muss das Theme nicht kennen. Die
         Rückfallwerte greifen, falls die Variante einmal ausserhalb einer
         Markenfläche eingesetzt wird. */
      .month-picker--on-brand .month-nav .btn {
        --bs-btn-bg: var(--fin-on-brand-chip-bg, rgba(255, 255, 255, 0.1));
        --bs-btn-border-color: var(--fin-on-brand-chip-border, rgba(255, 255, 255, 0.24));
        --bs-btn-color: var(--fin-on-brand-chip-text, #fff);
        --bs-btn-hover-bg: var(--fin-on-brand-chip-hover-bg, rgba(255, 255, 255, 0.18));
        --bs-btn-hover-border-color: var(
          --fin-on-brand-chip-hover-border,
          rgba(255, 255, 255, 0.38)
        );
        --bs-btn-hover-color: var(--fin-on-brand-chip-text, #fff);
        --bs-btn-active-bg: var(--fin-on-brand-chip-active-bg, rgba(255, 255, 255, 0.22));
        --bs-btn-active-border-color: var(
          --fin-on-brand-chip-hover-border,
          rgba(255, 255, 255, 0.38)
        );
        --bs-btn-active-color: var(--fin-on-brand-chip-text, #fff);
        --bs-btn-disabled-bg: var(--fin-on-brand-chip-muted-bg, rgba(255, 255, 255, 0.06));
        --bs-btn-disabled-border-color: var(
          --fin-on-brand-chip-muted-border,
          rgba(255, 255, 255, 0.14)
        );
        --bs-btn-disabled-color: var(--fin-on-brand-chip-muted-text, rgba(255, 255, 255, 0.5));
      }
      .month-picker--on-brand .month-nav .btn:focus-visible {
        outline-color: var(--fin-on-brand-focus, #fff);
      }
    `,
  ],
})
export class MonthPickerComponent {
  /** Aktuell gewählter Monat als `yyyy-MM`. */
  readonly month = input.required<string>();
  readonly disabled = input(false);

  /**
   * `on-brand` färbt die Auslöser-Leiste passend zur umgebenden Markenfläche —
   * die konkreten Farben erbt sie von dieser, siehe Styles unten.
   *
   * Als Variante der Komponente umgesetzt und nicht als Style von außen: die
   * emulierte View-Encapsulation lässt Elternselektoren nicht in dieses Template
   * hinein, ein Override im Aufrufer würde also wirkungslos bleiben.
   */
  readonly tone = input<'default' | 'on-brand'>('default');

  readonly monthChange = output<string>();

  protected readonly names = monthNames();
  protected readonly open = signal(false);

  /** Gerechnete Lage des Panels; `null`, solange es noch nicht vermessen wurde. */
  protected readonly position = signal<MonthPanelPosition | null>(null);

  private readonly nav = viewChild.required<ElementRef<HTMLElement>>('nav');
  private readonly panel = viewChild<ElementRef<HTMLElement>>('panel');

  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  /** Aufräumen der Fensterlistener, falls die Komponente offen verschwindet. */
  private detachViewportListeners: (() => void) | null = null;

  /** Jahr, das im Auswahlfeld gezeigt wird — unabhängig vom gewählten Monat blätterbar. */
  private readonly browsedYear = signal<number | null>(null);

  protected readonly currentLabel = computed(() => formatMonthLong(this.month()));
  protected readonly previousLabel = computed(() => formatMonthLong(addMonths(this.month(), -1)));
  protected readonly nextLabel = computed(() => formatMonthLong(addMonths(this.month(), 1)));
  protected readonly panelYear = computed(() => this.browsedYear() ?? yearOf(this.month()));

  constructor() {
    inject(DestroyRef).onDestroy(() => this.detachViewportListeners?.());
  }

  protected step(offset: number): void {
    this.monthChange.emit(addMonths(this.month(), offset));
  }

  protected toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }

    this.browsedYear.set(yearOf(this.month()));
    this.position.set(null);
    this.open.set(true);

    // Die Lage steht erst fest, wenn das Panel im DOM ist: seine Höhe
    // entscheidet, ob nach unten oder nach oben aufgeklappt wird.
    afterNextRender(() => this.reposition(), { injector: this.injector });
    this.attachViewportListeners();
  }

  protected close(): void {
    if (!this.open()) return;

    this.open.set(false);
    this.position.set(null);
    this.detachViewportListeners?.();
    this.detachViewportListeners = null;
  }

  protected stepYear(offset: number): void {
    this.browsedYear.set(this.panelYear() + offset);
  }

  protected isSelected(monthNumber: number): boolean {
    return this.panelYear() === yearOf(this.month()) && monthNumber === monthOf(this.month());
  }

  protected select(monthNumber: number): void {
    this.close();
    this.monthChange.emit(buildMonthKey(this.panelYear(), monthNumber));
  }

  protected selectCurrentMonth(): void {
    this.close();
    this.monthChange.emit(toMonthKey(new Date()));
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.open()) return;
    if (this.host.nativeElement.contains(event.target as Node)) return;

    this.close();
  }

  /**
   * Solange das Panel offen ist, folgt es dem Auslöser. Das Scroll-Ereignis wird
   * in der Capture-Phase abgegriffen, damit auch das Scrollen innerhalb eines
   * Containers (und nicht nur das der Seite) ankommt.
   */
  private attachViewportListeners(): void {
    const reposition = () => this.reposition();

    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition, { passive: true });

    this.detachViewportListeners = () => {
      window.removeEventListener('scroll', reposition, { capture: true });
      window.removeEventListener('resize', reposition);
    };
  }

  private reposition(): void {
    const panel = this.panel()?.nativeElement;
    if (!panel) return;

    this.position.set(
      computeMonthPanelPosition(
        this.nav().nativeElement.getBoundingClientRect(),
        // Die Höhe hängt nicht an der Breite: das Raster hat feste drei Spalten
        // mit einzeiligen Beschriftungen. Einmal messen genügt daher.
        panel.offsetHeight,
        {
          width: document.documentElement.clientWidth,
          height: document.documentElement.clientHeight,
        },
      ),
    );
  }
}
