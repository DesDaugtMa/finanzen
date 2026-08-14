import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { YearBalance } from '../../../../core/models/balance.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { formatMoney } from '../../../../shared/utils/money.util';
import { formatMonthLong, monthNames, monthOf } from '../../../../shared/utils/month.util';

/** Ein Monat als Säule im Verlauf. */
interface YearColumn {
  month: string;
  /** Kurzname für die Beschriftung unter der Säule, z. B. `Jan`. */
  shortLabel: string;
  net: number;
  /** Höhe der Säule nach oben in Prozent der oberen Trackhälfte. */
  upPercent: number;
  /** Höhe der Säule nach unten in Prozent der unteren Trackhälfte. */
  downPercent: number;
  hasData: boolean;
  isSelected: boolean;
  /** Vorgelesene Beschreibung, weil die Säule selbst keinen Text trägt. */
  description: string;
}

/**
 * Die Jahresbilanz mit dem Verlauf der zwölf Monate.
 *
 * Die Säulen wachsen von einer gemeinsamen Nulllinie nach oben oder unten — an
 * dieser Achse liest man die Plus- und Minusmonate eines Jahres schneller ab als
 * an jeder Zahlenreihe. Ein Klick auf eine Säule wählt den Monat oben aus, damit
 * der Verlauf nicht nur Bild, sondern auch Navigation ist.
 */
@Component({
  selector: 'app-year-balance-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent],
  template: `
    <section class="fin-panel year" aria-labelledby="yearBalanceHeading">
      <div class="fin-panel__body">
        <header class="year__head">
          <div class="year__intro">
            <span class="fin-eyebrow">Jahresbilanz</span>
            <h2 id="yearBalanceHeading" class="year__title">{{ year() }}</h2>
          </div>

          <div class="btn-group year__nav" role="group" aria-label="Jahr auswählen">
            <button
              type="button"
              class="btn btn-outline-secondary"
              [disabled]="loading()"
              [attr.aria-label]="'Vorheriges Jahr: ' + (year() - 1)"
              (click)="stepYear(-1)"
            >
              <i class="bi bi-chevron-left" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="btn btn-outline-secondary"
              [disabled]="loading()"
              [attr.aria-label]="'Nächstes Jahr: ' + (year() + 1)"
              (click)="stepYear(1)"
            >
              <i class="bi bi-chevron-right" aria-hidden="true"></i>
            </button>
          </div>
        </header>

        @if (loading()) {
          <div class="year__skeletons" role="status" aria-label="Jahresbilanz wird geladen">
            <div class="fin-skeleton fin-skeleton--amount"></div>
            <div class="fin-skeleton year__skeleton-chart"></div>
          </div>
        } @else if (error()) {
          <div class="alert alert-danger year__error" role="alert">
            <span>{{ error() }}</span>
            <button type="button" class="btn btn-sm btn-outline-danger" (click)="retry.emit()">
              Erneut versuchen
            </button>
          </div>
        } @else if (balance(); as data) {
          <dl class="year__totals">
            <div>
              <dt class="fin-kv__label">Einnahmen</dt>
              <dd class="year__total-value">
                <app-money-amount [amount]="data.income" [currency]="data.currency" tone="income" />
              </dd>
            </div>
            <div>
              <dt class="fin-kv__label">Ausgaben</dt>
              <dd class="year__total-value">
                <app-money-amount
                  [amount]="data.expenses"
                  [currency]="data.currency"
                  tone="expense"
                />
              </dd>
            </div>
            <div>
              <dt class="fin-kv__label">Bilanz</dt>
              <dd class="year__total-value">
                <app-money-amount [amount]="data.net" [currency]="data.currency" size="lg" />
              </dd>
            </div>
          </dl>

          @if (hasBookings()) {
            <ul class="year__grid">
              @for (column of columns(); track column.month) {
                <li class="year__cell">
                  <button
                    type="button"
                    class="year__col"
                    [class.year__col--selected]="column.isSelected"
                    [class.year__col--empty]="!column.hasData"
                    [attr.aria-current]="column.isSelected ? 'true' : null"
                    [attr.aria-label]="column.description"
                    (click)="monthSelect.emit(column.month)"
                  >
                    <span class="year__track" aria-hidden="true">
                      <span class="year__half year__half--up">
                        <span class="year__bar year__bar--up" [style.height.%]="column.upPercent">
                        </span>
                      </span>
                      <span class="year__zero"></span>
                      <span class="year__half year__half--down">
                        <span
                          class="year__bar year__bar--down"
                          [style.height.%]="column.downPercent"
                        >
                        </span>
                      </span>
                    </span>
                    <span class="year__label" aria-hidden="true">{{ column.shortLabel }}</span>
                  </button>
                </li>
              }
            </ul>

            <p class="year__note">{{ note() }}</p>
          } @else {
            <p class="year__note year__note--empty">
              Für {{ year() }} sind noch keine Buchungen erfasst. Sobald der erste Monat gebucht
              ist, zeigt der Verlauf hier, wie sich das Jahr entwickelt.
            </p>
          }
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .year__head {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-4);
      }
      .year__intro {
        min-width: 0;
      }
      .year__title {
        margin: var(--fin-space-1) 0 0;
        font-size: var(--fin-text-xl);
        font-variant-numeric: tabular-nums;
      }
      .year__nav {
        flex-shrink: 0;
      }
      .year__nav .btn {
        --bs-btn-padding-x: var(--fin-space-3);
        min-height: var(--fin-touch-min);
      }
      .year__totals {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--fin-space-4);
        margin: 0 0 var(--fin-space-6);
      }
      /* Die Bilanz steht auf Mobil allein in der letzten Zeile — sie ist die
         Schlusszahl und soll nicht mit einem Summanden auf einer Höhe liegen. */
      .year__totals > div:last-child {
        grid-column: 1 / -1;
      }
      @media (min-width: 34rem) {
        .year__totals {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        .year__totals > div:last-child {
          grid-column: auto;
        }
      }
      .year__total-value {
        margin: var(--fin-space-1) 0 0;
      }

      /* Auf Mobil zwei Halbjahres-Reihen zu sechs Säulen: so bleibt jede Säule ein
         sicher treffbares Ziel (>= 44px breit auf 320px) und der Verlauf braucht
         kein waagerechtes Scrollen. Ab Tablet stehen alle zwölf in einer Reihe. */
      .year__grid {
        display: grid;
        grid-template-columns: repeat(6, minmax(0, 1fr));
        gap: var(--fin-space-4) var(--fin-space-1);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      @media (min-width: 48rem) {
        .year__grid {
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: var(--fin-space-1);
        }
      }
      .year__cell {
        min-width: 0;
      }
      .year__col {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--fin-space-2);
        width: 100%;
        min-height: var(--fin-touch-min);
        padding: var(--fin-space-1);
        border: 0;
        border-radius: var(--fin-radius-xs);
        background-color: transparent;
        cursor: pointer;
        transition: background-color var(--fin-duration-fast) var(--fin-ease-out);
      }
      .year__col:hover {
        background-color: var(--fin-surface-hover);
      }
      .year__col:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: 1px;
      }
      .year__col--selected {
        background-color: var(--fin-accent-tint);
      }
      .year__track {
        display: flex;
        flex-direction: column;
        height: 6rem;
      }
      .year__half {
        display: flex;
        flex: 1 1 50%;
        min-height: 0;
      }
      .year__half--up {
        align-items: flex-end;
      }
      .year__bar {
        width: 100%;
        border-radius: var(--fin-radius-xs);
        /* Mindesthöhe, damit ein sehr kleiner Monat nicht unsichtbar wird. */
        min-height: 2px;
        transition: height var(--fin-duration-base) var(--fin-ease-out);
      }
      .year__bar--up {
        background-color: var(--fin-income);
        border-end-start-radius: 0;
        border-end-end-radius: 0;
      }
      .year__bar--down {
        background-color: var(--fin-expense);
        border-start-start-radius: 0;
        border-start-end-radius: 0;
      }
      /* Ein Monat ohne Buchungen bekommt gar keine Säule — sonst läse sich eine
         2px-Linie wie eine ausgeglichene Bilanz statt wie ein leerer Monat. */
      .year__col--empty .year__bar {
        min-height: 0;
      }
      .year__zero {
        height: 1px;
        background-color: var(--fin-border-strong);
      }
      .year__label {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-2xs);
        font-weight: 650;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .year__col--selected .year__label {
        color: var(--fin-accent-on-tint);
      }
      .year__note {
        margin: var(--fin-space-5) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
      .year__note--empty {
        margin-top: 0;
      }
      .year__error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
        margin: 0;
      }
      .year__skeletons {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-4);
      }
      .year__skeleton-chart {
        height: 8rem;
        border-radius: var(--fin-radius-md);
      }

      @media (prefers-reduced-motion: reduce) {
        .year__bar {
          transition: none;
        }
      }
    `,
  ],
})
export class YearBalancePanelComponent {
  readonly balance = input<YearBalance | null>(null);
  /** Der oben gewählte Monat als `yyyy-MM` — seine Säule wird hervorgehoben. */
  readonly selectedMonth = input.required<string>();
  readonly year = input.required<number>();
  readonly loading = input(false);
  readonly error = input('');

  readonly yearChange = output<number>();
  readonly monthSelect = output<string>();
  readonly retry = output<void>();

  private readonly shortNames = monthNames();

  protected readonly hasBookings = computed(() =>
    (this.balance()?.months ?? []).some((point) => point.transactionCount > 0),
  );

  /**
   * Alle Säulen teilen sich eine Skala: die betragsmäßig größte Bilanz des Jahres
   * füllt eine Trackhälfte ganz aus. Nur so sind Monate untereinander vergleichbar —
   * eine je Säule eigene Skala würde jeden Monat gleich groß aussehen lassen.
   */
  protected readonly columns = computed<YearColumn[]>(() => {
    const data = this.balance();
    if (!data) return [];

    const scale = Math.max(...data.months.map((point) => Math.abs(point.net)), 0);

    return data.months.map((point) => {
      const share = scale === 0 ? 0 : (Math.abs(point.net) / scale) * 100;

      return {
        month: point.month,
        shortLabel: this.shortNames[monthOf(point.month) - 1] ?? point.month,
        net: point.net,
        upPercent: point.net > 0 ? share : 0,
        downPercent: point.net < 0 ? share : 0,
        hasData: point.transactionCount > 0,
        isSelected: point.month === this.selectedMonth(),
        description: this.describe(point.month, point.net, point.transactionCount, data.currency),
      };
    });
  });

  protected readonly note = computed(() => {
    const data = this.balance();
    if (!data || !data.bestMonth || !data.worstMonth) return '';

    const best = formatMonthLong(data.bestMonth);
    const worst = formatMonthLong(data.worstMonth);
    const average = formatMoney(data.averageNet, data.currency);

    if (data.bestMonth === data.worstMonth)
      return `Bisher ist ${best} der einzige gebuchte Monat des Jahres.`;

    return `Bester Monat: ${best}. Schwächster Monat: ${worst}. Im Schnitt ${average} je gebuchtem Monat.`;
  });

  protected stepYear(offset: number): void {
    this.yearChange.emit(this.year() + offset);
  }

  /** Die Säule trägt keinen Text — ihre Bedeutung steht deshalb im ARIA-Label. */
  private describe(month: string, net: number, count: number, currency: string): string {
    const label = formatMonthLong(month);

    if (count === 0) return `${label}: keine Buchungen. Monat auswählen.`;

    return `${label}: ${formatMoney(net, currency)}. Monat auswählen.`;
  }
}
