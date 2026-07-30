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
    class: 'd-inline-block position-relative',
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
      <div class="month-panel card shadow" role="dialog" aria-label="Monat und Jahr auswählen">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <button
            type="button"
            class="btn btn-sm btn-light"
            aria-label="Vorheriges Jahr"
            (click)="stepYear(-1)"
          >
            <i class="bi bi-chevron-left" aria-hidden="true"></i>
          </button>
          <strong aria-live="polite">{{ panelYear() }}</strong>
          <button
            type="button"
            class="btn btn-sm btn-light"
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
              class="btn btn-sm month-cell"
              [class.btn-primary]="isSelected(i + 1)"
              [class.btn-light]="!isSelected(i + 1)"
              [attr.aria-current]="isSelected(i + 1) ? 'true' : null"
              (click)="select(i + 1)"
            >
              {{ name }}
            </button>
          }
        </div>

        <button
          type="button"
          class="btn btn-sm btn-link w-100 mt-2 text-decoration-none"
          (click)="selectCurrentMonth()"
        >
          Aktueller Monat
        </button>
      </div>
    }
  `,
  styles: [
    `
      .month-step {
        --bs-btn-padding-x: 0.75rem;
      }
      .month-trigger {
        min-width: 10.5rem;
      }
      .month-label {
        font-variant-numeric: tabular-nums;
      }
      .month-panel {
        position: absolute;
        z-index: 1030;
        top: calc(100% + 0.35rem);
        left: 0;
        width: min(20rem, calc(100vw - 2rem));
        padding: 0.75rem;
        border-radius: 0.9rem;
        border: 1px solid var(--bs-border-color-translucent);
        background-color: var(--color-surface);
      }
      .month-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.35rem;
      }
      .month-cell {
        /* Angenehmes Touch-Ziel auch auf schmalen Displays. */
        min-height: 2.5rem;
      }
    `,
  ],
})
export class MonthPickerComponent {
  /** Aktuell gewählter Monat als `yyyy-MM`. */
  readonly month = input.required<string>();
  readonly disabled = input(false);

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
