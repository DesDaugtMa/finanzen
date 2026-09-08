import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MonthBalance } from '../../../../core/models/balance.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { MonthPickerComponent } from '../../../../shared/components/month-picker/month-picker.component';
import { SettledBalanceComponent } from '../../../../shared/components/settled-balance/settled-balance.component';
import { formatMoneyAbsolute } from '../../../../shared/utils/money.util';
import { addMonths, formatMonthLong } from '../../../../shared/utils/month.util';

/**
 * Die Leitfläche der Startseite: was der Monat unter dem Strich gebracht hat.
 *
 * Die Bilanz steht bewusst allein und groß, mit Einnahmen und Ausgaben nur als
 * Herleitung darunter — die Frage „bin ich diesen Monat im Plus?“ soll ohne
 * Rechnen und ohne Scrollen beantwortet sein. Das Gesamtvermögen sitzt daneben,
 * weil es die zweite Frage ist, nicht die erste.
 *
 * Aktuell nicht eingebunden: mit dem neuen Aufbau der Startseite (Issue #25)
 * zeigt der Reiter „Konten“ nur noch die Kontobereiche. Diese Fläche ist für den
 * Reiter „Statistiken“ vorgesehen und bleibt dafür unverändert erhalten.
 */
@Component({
  selector: 'app-balance-hero',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent, MonthPickerComponent, SettledBalanceComponent],
  template: `
    <section class="fin-brand-surface hero" aria-labelledby="monthBalanceHeading">
      <div class="hero__top">
        <div class="hero__intro">
          <span class="fin-eyebrow hero__eyebrow">Bilanz</span>
          <h2 id="monthBalanceHeading" class="hero__month">{{ monthLabel() }}</h2>
        </div>

        <app-month-picker
          class="hero__picker"
          tone="on-brand"
          [month]="month()"
          [disabled]="loading()"
          (monthChange)="monthChange.emit($event)"
        />
      </div>

      @if (loading()) {
        <div class="hero__skeletons" role="status" aria-label="Bilanz wird geladen">
          <div class="fin-skeleton fin-skeleton--line-short hero__skeleton-label"></div>
          <div class="fin-skeleton fin-skeleton--amount hero__skeleton-amount"></div>
          <div class="fin-skeleton fin-skeleton--line-short"></div>
        </div>
      } @else if (error()) {
        <div class="hero__error" role="alert">
          <p class="hero__error-text">{{ error() }}</p>
          <button type="button" class="btn btn-sm btn-light" (click)="retry.emit()">
            Erneut versuchen
          </button>
        </div>
      } @else if (balance(); as data) {
        <p class="hero__amount-wrap">
          <app-money-amount
            class="hero__amount"
            [amount]="data.net"
            [currency]="data.currency"
            size="lg"
          />
        </p>

        <p class="hero__trend">
          <i class="bi hero__trend-icon" [class]="'bi-' + trendIcon()" aria-hidden="true"></i>
          <span>{{ trendText() }}</span>
        </p>

        <dl class="hero__split">
          <div class="hero__split-item">
            <dt class="hero__split-label">Einnahmen</dt>
            <dd class="hero__split-value">
              <app-money-amount [amount]="data.income" [currency]="data.currency" tone="income" />
            </dd>
          </div>
          <div class="hero__split-item">
            <dt class="hero__split-label">Ausgaben</dt>
            <dd class="hero__split-value">
              <app-money-amount
                [amount]="data.expenses"
                [currency]="data.currency"
                tone="expense"
              />
            </dd>
          </div>
          <div class="hero__split-item hero__split-item--worth">
            <dt class="hero__split-label">Vermögen</dt>
            <dd class="hero__split-value">
              <app-money-amount [amount]="data.netWorth" [currency]="data.currency" />
              <app-settled-balance
                variant="on-brand"
                [amount]="data.settledNetWorth"
                [currency]="data.currency"
                [pendingCount]="data.pendingCount"
                [pendingTotal]="data.pendingTotal"
              />
            </dd>
          </div>
        </dl>

        <p class="hero__foot">
          {{ transactionText() }}
          @if (data.transferVolume > 0) {
            <span class="hero__foot-note">{{ transferText() }}</span>
          }
        </p>
      }
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .hero {
        padding: var(--fin-space-5);
      }
      @media (min-width: 34rem) {
        .hero {
          padding: var(--fin-space-6) var(--fin-space-8);
        }
      }
      .hero__top {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-3);
      }
      /* Ab Tablet steht der Monatswähler neben der Überschrift; auf Mobil bekommt
         er eine eigene Zeile und damit die volle Breite als Touch-Ziel. */
      @media (min-width: 34rem) {
        .hero__top {
          flex-direction: row;
          align-items: flex-start;
          justify-content: space-between;
          gap: var(--fin-space-4);
        }
      }
      .hero__intro {
        min-width: 0;
      }
      .hero__eyebrow {
        color: var(--fin-on-brand-text-muted);
      }
      .hero__month {
        margin: var(--fin-space-1) 0 0;
        color: var(--fin-on-brand-text);
        font-size: var(--fin-text-lg);
        letter-spacing: var(--fin-tracking-tight);
      }
      .hero__picker {
        flex-shrink: 0;
      }
      .hero__amount-wrap {
        margin: var(--fin-space-5) 0 0;
      }
      .hero__amount {
        /* Die grösste Zahl der Anwendung. Sie überschreibt bewusst den lg-Grad
           von app-money-amount — hier trägt sie die ganze Seite. */
        font-size: var(--fin-text-3xl);
      }
      .hero__trend {
        display: flex;
        align-items: center;
        gap: var(--fin-space-2);
        margin: var(--fin-space-2) 0 0;
        color: var(--fin-on-brand-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
      .hero__trend-icon {
        flex-shrink: 0;
        font-size: var(--fin-text-md);
      }
      .hero__split {
        display: grid;
        /* Auf Mobil zwei Spalten (Einnahmen/Ausgaben), das Vermögen darunter über
           die volle Breite — es ist die andere Art von Zahl und darf sich absetzen. */
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--fin-space-4);
        margin: var(--fin-space-5) 0 0;
        padding-top: var(--fin-space-5);
        border-top: 1px solid var(--fin-on-brand-line);
      }
      @media (min-width: 34rem) {
        .hero__split {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      .hero__split-item--worth {
        grid-column: 1 / -1;
      }
      @media (min-width: 34rem) {
        .hero__split-item--worth {
          grid-column: auto;
        }
      }
      .hero__split-label {
        margin: 0;
        color: var(--fin-on-brand-text-muted);
        font-size: var(--fin-text-2xs);
        font-weight: 650;
        letter-spacing: var(--fin-tracking-wider);
        text-transform: uppercase;
      }
      .hero__split-value {
        margin: var(--fin-space-1) 0 0;
        color: var(--fin-on-brand-text);
        font-size: var(--fin-text-md);
      }
      .hero__foot {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fin-space-1) var(--fin-space-2);
        margin: var(--fin-space-4) 0 0;
        color: var(--fin-on-brand-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
      .hero__foot-note::before {
        content: '·';
        margin-inline-end: var(--fin-space-2);
      }
      .hero__skeletons {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-3);
        margin-top: var(--fin-space-5);
      }
      .hero__skeleton-amount {
        max-width: 14rem;
      }
      .hero__skeleton-label {
        max-width: 8rem;
      }
      .hero__error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-3);
        margin-top: var(--fin-space-5);
      }
      .hero__error-text {
        flex: 1 1 14rem;
        margin: 0;
        color: var(--fin-on-brand-text);
        font-size: var(--fin-text-base);
        line-height: var(--fin-leading-snug);
      }
    `,
  ],
})
export class BalanceHeroComponent {
  /** Gewählter Monat als `yyyy-MM`. */
  readonly month = input.required<string>();
  readonly balance = input<MonthBalance | null>(null);
  readonly loading = input(false);
  readonly error = input('');

  readonly monthChange = output<string>();
  readonly retry = output<void>();

  protected readonly monthLabel = computed(() => formatMonthLong(this.month()));

  /** Veränderung gegenüber dem Vormonat. Positiv heißt: der Monat lief besser. */
  private readonly delta = computed(() => {
    const data = this.balance();
    if (!data) return 0;

    // Über Cent gerechnet, damit die Differenz zweier gerundeter Beträge nicht
    // als 0,004 € statt als glatte 0 € herauskommt.
    return (Math.round(data.net * 100) - Math.round(data.previousNet * 100)) / 100;
  });

  protected readonly trendIcon = computed(() => {
    const delta = this.delta();
    if (delta > 0) return 'graph-up-arrow';
    if (delta < 0) return 'graph-down-arrow';
    return 'dash-lg';
  });

  protected readonly trendText = computed(() => {
    const data = this.balance();
    if (!data) return '';

    const previousLabel = formatMonthLong(addMonths(this.month(), -1));
    const delta = this.delta();

    if (delta === 0) return `Unverändert gegenüber ${previousLabel}.`;

    const amount = formatMoneyAbsolute(delta, data.currency);
    const direction = delta > 0 ? 'mehr' : 'weniger';

    return `${amount} ${direction} als im ${previousLabel}.`;
  });

  protected readonly transactionText = computed(() => {
    const count = this.balance()?.transactionCount ?? 0;

    if (count === 0) return 'Noch keine Buchungen in diesem Monat.';
    return count === 1 ? '1 Buchung berücksichtigt' : `${count} Buchungen berücksichtigt`;
  });

  /**
   * Umbuchungen erscheinen nur als Fußnote: sie fehlen bewusst in der Bilanz,
   * und dieser Hinweis erklärt, warum die Summen nicht zu den Kontobewegungen passen.
   */
  protected readonly transferText = computed(() => {
    const data = this.balance();
    if (!data) return '';

    return `${formatMoneyAbsolute(data.transferVolume, data.currency)} umgebucht (nicht in der Bilanz)`;
  });
}
