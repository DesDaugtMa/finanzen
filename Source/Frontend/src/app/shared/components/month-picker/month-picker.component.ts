import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
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
    <div class="btn-group month-nav" role="group" aria-label="Monat auswählen">
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
      <div class="month-panel" role="dialog" aria-label="Monat und Jahr auswählen">
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
      .month-panel {
        position: absolute;
        z-index: var(--fin-z-dropdown);
        top: calc(100% + var(--fin-space-2));
        /* Auf Mobil deckt das Panel die Breite des Auslösers ab — so kann es
           weder aus dem sichtbaren Bereich laufen, noch stehen die Monatsfelder
           unnötig schmal. */
        right: 0;
        left: 0;
        padding: var(--fin-space-3);
        background-color: var(--fin-bg-elevated);
        border: 1px solid var(--fin-border);
        border-radius: var(--fin-radius-md);
        box-shadow: var(--fin-shadow-lg);
        animation: fin-pop-in var(--fin-duration-fast) var(--fin-ease-out) both;
        transform-origin: top left;
      }
      @media (min-width: 34rem) {
        .month-panel {
          right: auto;
          width: 20rem;
        }
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

      /* Variante für dunkle Markenflächen. Nur die Auslöser-Leiste wird
         umgefärbt — das aufklappende Panel bleibt eine helle Fläche, weil es
         über dem Hintergrund schwebt und nicht Teil davon ist. */
      .month-picker--on-brand .month-nav .btn {
        --bs-btn-bg: rgba(255, 255, 255, 0.1);
        --bs-btn-border-color: rgba(255, 255, 255, 0.24);
        --bs-btn-color: #fff;
        --bs-btn-hover-bg: rgba(255, 255, 255, 0.18);
        --bs-btn-hover-border-color: rgba(255, 255, 255, 0.38);
        --bs-btn-hover-color: #fff;
        --bs-btn-active-bg: rgba(255, 255, 255, 0.22);
        --bs-btn-active-border-color: rgba(255, 255, 255, 0.38);
        --bs-btn-active-color: #fff;
        --bs-btn-disabled-bg: rgba(255, 255, 255, 0.06);
        --bs-btn-disabled-border-color: rgba(255, 255, 255, 0.14);
        --bs-btn-disabled-color: rgba(255, 255, 255, 0.5);
      }
      .month-picker--on-brand .month-nav .btn:focus-visible {
        outline-color: #fff;
      }
    `,
  ],
})
export class MonthPickerComponent {
  /** Aktuell gewählter Monat als `yyyy-MM`. */
  readonly month = input.required<string>();
  readonly disabled = input(false);

  /**
   * `on-brand` färbt die Auslöser-Leiste für dunkle Markenflächen um.
   *
   * Als Variante der Komponente umgesetzt und nicht als Style von außen: die
   * emulierte View-Encapsulation lässt Elternselektoren nicht in dieses Template
   * hinein, ein Override im Aufrufer würde also wirkungslos bleiben.
   */
  readonly tone = input<'default' | 'on-brand'>('default');

  readonly monthChange = output<string>();

  protected readonly names = monthNames();
  protected readonly open = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);

  /** Jahr, das im Auswahlfeld gezeigt wird — unabhängig vom gewählten Monat blätterbar. */
  private readonly browsedYear = signal<number | null>(null);

  protected readonly currentLabel = computed(() => formatMonthLong(this.month()));
  protected readonly previousLabel = computed(() => formatMonthLong(addMonths(this.month(), -1)));
  protected readonly nextLabel = computed(() => formatMonthLong(addMonths(this.month(), 1)));
  protected readonly panelYear = computed(() => this.browsedYear() ?? yearOf(this.month()));

  protected step(offset: number): void {
    this.monthChange.emit(addMonths(this.month(), offset));
  }

  protected toggle(): void {
    this.browsedYear.set(yearOf(this.month()));
    this.open.update((value) => !value);
  }

  protected close(): void {
    this.open.set(false);
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
}
