import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AccountStatistics } from '../../../../core/models/account-statistics.model';
import {
  LineChartComponent,
  LinePoint,
} from '../../../../shared/components/line-chart/line-chart.component';
import { formatMoney } from '../../../../shared/utils/money.util';
import { formatDate, formatMonthLong } from '../../../../shared/utils/month.util';

/**
 * Der Verlauf des gewählten Monats: für jeden Tag die aufgelaufene Bilanz, beginnend
 * bei null.
 *
 * Maßgeblich ist das Rechnungsmonat, nicht der Buchungstag — eine im Juli gezahlte
 * Rechnung, die auf August gebucht ist, erscheint deshalb am 1. August. Läge sie an
 * ihrem echten Buchungstag, fiele sie ganz aus dem Verlauf.
 */
@Component({
  selector: 'app-account-trend-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LineChartComponent],
  template: `
    <section class="fin-panel" aria-labelledby="trendHeading">
      <div class="fin-panel__body">
        <div class="panel-head">
          <h2 id="trendHeading" class="panel-heading">Entwicklung</h2>
          <p class="panel-note">{{ note() }}</p>
        </div>

        <app-line-chart
          [points]="points()"
          [currency]="statistics().currency"
          [ariaLabel]="chartLabel()"
          emptyMessage="In diesem Monat gibt es noch keine Buchungen."
        />
      </div>
    </section>
  `,
  styles: [
    `
      .panel-head {
        margin-bottom: var(--fin-space-4);
      }
      .panel-heading {
        margin: 0;
        font-size: var(--fin-text-md);
      }
      .panel-note {
        margin: var(--fin-space-1) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
    `,
  ],
})
export class AccountTrendPanelComponent {
  readonly statistics = input.required<AccountStatistics>();

  protected readonly note = computed(() =>
    this.hasBookings()
      ? 'Aufgelaufene Bilanz je Tag des Rechnungsmonats, beginnend bei 0 €.'
      : 'Sobald Buchungen erfasst sind, entsteht hier der Verlauf des Monats.',
  );

  private readonly hasBookings = computed(() =>
    this.statistics().trend.some((point) => point.hasBookings),
  );

  protected readonly chartLabel = computed(
    () => `Entwicklung der Bilanz im ${formatMonthLong(this.statistics().month)}`,
  );

  protected readonly points = computed<LinePoint[]>(() => {
    const data = this.statistics();
    if (!this.hasBookings()) return [];

    return data.trend.map((point) => ({
      label: formatDate(point.date),
      // Unter dem Chart steht nur der Tag — das volle Datum passt dort nicht.
      axis: String(point.day),
      value: point.value,
      description: this.describe(point.date, point.value, point.income, point.expenses),
      marked: point.day === data.currentDay,
    }));
  });

  private describe(date: string, value: number, income: number, expenses: number): string {
    const currency = this.statistics().currency;
    const stand = `${formatDate(date)}: Stand ${formatMoney(value, currency)}`;

    if (income === 0 && expenses === 0) return `${stand}, keine Buchungen an diesem Tag`;

    const parts: string[] = [];
    if (income > 0) parts.push(`Einnahmen ${formatMoney(income, currency)}`);
    if (expenses > 0) parts.push(`Ausgaben ${formatMoney(expenses, currency)}`);

    return `${stand}, ${parts.join(', ')}`;
  }
}
