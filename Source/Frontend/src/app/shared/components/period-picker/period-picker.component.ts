import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { buildMonthKey } from '../../utils/month.util';
import { Period, PeriodKind, monthPeriod, yearPeriod } from '../../utils/period.util';
import { MonthPickerComponent } from '../month-picker/month-picker.component';

/**
 * Die Zeitraum-Auswahl der Übersicht: erst die Körnung (Monat oder Jahr), dann
 * der konkrete Zeitraum.
 *
 * Beide Entscheidungen stehen bewusst nebeneinander in einer Leiste, weil sie
 * zusammen eine einzige Frage beantworten — „welchen Zeitraum sehe ich?“. Die
 * Monatsauswahl bleibt der bestehende Monatswähler; für das Jahr genügen zwei
 * Pfeile, weil man dort selten weit springt.
 */
@Component({
  selector: 'app-period-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MonthPickerComponent],
  template: `
    <div class="period">
      <div class="period__modes" role="group" aria-label="Zeitraum-Einteilung">
        <button
          type="button"
          class="period__mode"
          [class.period__mode--active]="period().kind === 'Month'"
          [attr.aria-pressed]="period().kind === 'Month'"
          [disabled]="disabled()"
          (click)="selectKind('Month')"
        >
          <i class="bi bi-calendar3" aria-hidden="true"></i>
          <span>Monat</span>
        </button>
        <button
          type="button"
          class="period__mode"
          [class.period__mode--active]="period().kind === 'Year'"
          [attr.aria-pressed]="period().kind === 'Year'"
          [disabled]="disabled()"
          (click)="selectKind('Year')"
        >
          <i class="bi bi-calendar4-range" aria-hidden="true"></i>
          <span>Jahr</span>
        </button>
      </div>

      @if (period().kind === 'Month') {
        <app-month-picker
          class="period__value"
          [month]="period().key"
          [disabled]="disabled()"
          (monthChange)="selectMonth($event)"
        />
      } @else {
        <div class="btn-group period__value period__years" role="group" aria-label="Jahr auswählen">
          <button
            type="button"
            class="btn btn-outline-secondary period__step"
            [disabled]="disabled()"
            [attr.aria-label]="'Vorheriges Jahr: ' + (period().year - 1)"
            (click)="stepYear(-1)"
          >
            <i class="bi bi-chevron-left" aria-hidden="true"></i>
          </button>
          <span class="btn btn-outline-secondary period__year" aria-live="polite">
            {{ period().year }}
          </span>
          <button
            type="button"
            class="btn btn-outline-secondary period__step"
            [disabled]="disabled()"
            [attr.aria-label]="'Nächstes Jahr: ' + (period().year + 1)"
            (click)="stepYear(1)"
          >
            <i class="bi bi-chevron-right" aria-hidden="true"></i>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      /* Auf Mobil untereinander und über die volle Breite — beide Leisten werden
         dadurch zu grossen Touch-Zielen. Ab Tablet stehen sie nebeneinander. */
      .period {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
      }
      @media (min-width: 34rem) {
        .period {
          flex-direction: row;
          align-items: center;
          gap: var(--fin-space-3);
        }
      }
      /* Dieselbe eingesenkte Spur wie die Reiter-Leiste: gleiche Bedeutung
         (Auswahl aus wenigen Alternativen), deshalb dasselbe Erscheinungsbild. */
      .period__modes {
        display: flex;
        gap: var(--fin-space-1);
        padding: var(--fin-space-1);
        background-color: var(--fin-surface-sunken);
        border-radius: var(--fin-radius-md);
      }
      .period__mode {
        display: inline-flex;
        flex: 1 1 0;
        align-items: center;
        justify-content: center;
        gap: var(--fin-space-2);
        min-height: var(--fin-touch-min);
        padding: 0 var(--fin-space-4);
        border: 0;
        border-radius: var(--fin-radius-sm);
        background-color: transparent;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
        font-weight: 600;
        white-space: nowrap;
        cursor: pointer;
        transition:
          background-color var(--fin-duration-fast) var(--fin-ease-out),
          color var(--fin-duration-fast) var(--fin-ease-out),
          box-shadow var(--fin-duration-fast) var(--fin-ease-out);
      }
      @media (min-width: 34rem) {
        .period__mode {
          flex: 0 0 auto;
        }
      }
      .period__mode:hover:not(.period__mode--active):not(:disabled) {
        color: var(--fin-text-strong);
      }
      .period__mode--active {
        background-color: var(--fin-surface);
        color: var(--fin-text-strong);
        box-shadow: var(--fin-shadow-xs);
      }
      .period__mode:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: -2px;
      }
      .period__mode:disabled {
        cursor: default;
        opacity: 0.6;
      }
      .period__value {
        flex-shrink: 0;
      }
      .period__years {
        display: flex;
        width: 100%;
        border-radius: var(--fin-radius-sm);
      }
      @media (min-width: 34rem) {
        .period__years {
          display: inline-flex;
          width: auto;
        }
      }
      .period__step {
        --bs-btn-padding-x: var(--fin-space-3);
        flex: 0 0 auto;
        min-height: var(--fin-touch-min);
      }
      /* Die Jahreszahl ist reine Anzeige und deshalb kein Button — sie übernimmt
         nur dessen Aussehen, damit die Leiste als ein Element auftritt. */
      .period__year {
        display: flex;
        flex: 1 1 auto;
        align-items: center;
        justify-content: center;
        min-height: var(--fin-touch-min);
        font-weight: 600;
        font-variant-numeric: tabular-nums;
        pointer-events: none;
      }
      @media (min-width: 34rem) {
        .period__year {
          flex: 0 0 auto;
          min-width: 6rem;
        }
      }
    `,
  ],
})
export class PeriodPickerComponent {
  readonly period = input.required<Period>();
  readonly disabled = input(false);

  readonly periodChange = output<Period>();

  /**
   * Beim Wechsel auf „Monat“ soll der Nutzer nicht im Januar eines längst
   * vergangenen Jahres landen: im laufenden Jahr wird der aktuelle Monat
   * gewählt, in jedem anderen Jahr dessen Januar.
   */
  private readonly currentYear = computed(() => new Date().getFullYear());

  protected selectKind(kind: PeriodKind): void {
    const period = this.period();
    if (period.kind === kind) return;

    if (kind === 'Year') {
      this.periodChange.emit(yearPeriod(period.year));
      return;
    }

    const now = new Date();
    const month = period.year === this.currentYear() ? now.getMonth() + 1 : 1;
    this.periodChange.emit(monthPeriod(buildMonthKey(period.year, month)));
  }

  protected selectMonth(month: string): void {
    this.periodChange.emit(monthPeriod(month));
  }

  protected stepYear(offset: number): void {
    this.periodChange.emit(yearPeriod(this.period().year + offset));
  }
}
