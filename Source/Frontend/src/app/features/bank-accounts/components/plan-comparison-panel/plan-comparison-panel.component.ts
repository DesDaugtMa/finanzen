import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AccountStatistics } from '../../../../core/models/account-statistics.model';
import {
  ComparisonChartComponent,
  ComparisonGroup,
} from '../../../../shared/components/comparison-chart/comparison-chart.component';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { DEFAULT_ACCENT_COLOR } from '../../../../shared/utils/color-presets';

/**
 * Plan gegen Ist je Kategorie.
 *
 * Geplant ist alles, was vorher feststand: das Budget der Kategorie plus ihre Fixkosten.
 * Dagegen stehen sämtliche Ausgaben der Kategorie im Monat. Die Gesamtzahlen führen,
 * weil sie sagen, ob der Monat insgesamt hält — die Säulen sagen, wo es klemmt.
 */
@Component({
  selector: 'app-account-plan-comparison-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComparisonChartComponent, MoneyAmountComponent],
  template: `
    <section class="fin-panel" aria-labelledby="planHeading">
      <div class="fin-panel__body">
        <div class="panel-head">
          <h2 id="planHeading" class="panel-heading">Vergleich Geplant / Ausgaben</h2>
          <p class="panel-note">
            Geplant sind Budgets und Fixkosten des Monats, dagegen stehen die tatsächlichen
            Ausgaben.
          </p>
        </div>

        @if (groups().length === 0) {
          <p class="panel-empty">
            Für diesen Monat ist noch nichts geplant und noch nichts ausgegeben. Budgets legst du im
            Bereich „Budgets“ fest, wiederkehrende Posten unter „Fixkosten“.
          </p>
        } @else {
          <dl class="plan-totals">
            <div>
              <dt class="fin-kv__label">Geplant</dt>
              <dd>
                <app-money-amount
                  [amount]="statistics().plannedTotal"
                  [currency]="statistics().currency"
                />
              </dd>
            </div>
            <div>
              <dt class="fin-kv__label">Ausgegeben</dt>
              <dd>
                <app-money-amount
                  [amount]="statistics().actualTotal"
                  [currency]="statistics().currency"
                />
              </dd>
            </div>
            <div>
              <dt class="fin-kv__label">{{ differenceLabel() }}</dt>
              <dd>
                <app-money-amount [amount]="difference()" [currency]="statistics().currency" />
              </dd>
            </div>
          </dl>

          <app-comparison-chart
            [groups]="groups()"
            [currency]="statistics().currency"
            ariaLabel="Geplante gegen tatsächliche Ausgaben je Kategorie"
          />
        }
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
      .panel-empty {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
      }

      .plan-totals {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
        gap: var(--fin-space-4);
        margin: 0 0 var(--fin-space-5);
      }
      .plan-totals dd {
        margin: 0.15rem 0 0;
      }
    `,
  ],
})
export class AccountPlanComparisonPanelComponent {
  readonly statistics = input.required<AccountStatistics>();

  /** Der Rest des Plans. Negativ bedeutet, dass mehr ausgegeben wurde als vorgesehen. */
  protected readonly difference = computed(
    () => this.statistics().plannedTotal - this.statistics().actualTotal,
  );

  protected readonly differenceLabel = computed(() =>
    this.difference() < 0 ? 'Überschritten' : 'Übrig',
  );

  protected readonly groups = computed<ComparisonGroup[]>(() =>
    this.statistics().planComparison.map((item) => ({
      key: String(item.categoryId ?? 'none'),
      label: item.categoryName,
      planned: item.planned,
      actual: item.actual,
      color: item.categoryColor ?? DEFAULT_ACCENT_COLOR,
    })),
  );
}
