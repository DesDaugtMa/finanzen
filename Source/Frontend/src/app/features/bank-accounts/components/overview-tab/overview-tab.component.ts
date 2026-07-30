import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MonthSummary } from '../../../../core/models/month-summary.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { StatTileComponent } from '../../../../shared/components/stat-tile/stat-tile.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { BudgetProgressComponent } from '../../../../shared/components/budget-progress/budget-progress.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { DEFAULT_ACCENT_COLOR } from '../../../../shared/utils/color-presets';
import { formatMonthLong } from '../../../../shared/utils/month.util';

/**
 * Übersicht des gewählten Monats: Kennzahlen, Budget-Gesamtstand und die Verteilung
 * der Ausgaben auf die Kategorien. Rein anzeigend — verändert wird in den anderen Bereichen.
 */
@Component({
  selector: 'app-account-overview-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MoneyAmountComponent,
    StatTileComponent,
    EmptyStateComponent,
    BudgetProgressComponent,
    CategoryBadgeComponent,
  ],
  template: `
    @if (loading()) {
      <div class="fin-grid fin-grid--stats" role="status" aria-label="Kennzahlen werden geladen">
        @for (placeholder of skeletonSlots; track $index) {
          <div class="fin-panel stat-skeleton">
            <div class="fin-skeleton fin-skeleton--line-short"></div>
            <div class="fin-skeleton fin-skeleton--amount"></div>
          </div>
        }
      </div>
    } @else if (error()) {
      <div class="alert alert-danger overview-error" role="alert">
        <span>{{ error() }}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="retry.emit()">
          Erneut versuchen
        </button>
      </div>
    } @else if (summary(); as data) {
      <div class="fin-grid fin-grid--stats overview-stats">
        <app-stat-tile
          label="Einnahmen"
          icon="arrow-down-left-circle"
          tone="income"
          [amount]="data.income"
          [currency]="data.currency"
        />
        <app-stat-tile
          label="Ausgaben"
          icon="arrow-up-right-circle"
          tone="expense"
          [amount]="data.expenses"
          [currency]="data.currency"
        />
        <app-stat-tile
          label="Saldo des Monats"
          icon="calculator"
          [amount]="data.net"
          [currency]="data.currency"
          [hint]="balanceHint()"
        />
      </div>

      <section class="fin-panel overview-panel" aria-labelledby="budgetTotalsHeading">
        <div class="fin-panel__body">
          <h2 id="budgetTotalsHeading" class="overview-heading">Budgets im {{ monthLabel() }}</h2>

          @if (data.totalBudget > 0) {
            <dl class="budget-totals">
              <div>
                <dt class="fin-kv__label">Budgetiert</dt>
                <dd>
                  <app-money-amount [amount]="data.totalBudget" [currency]="data.currency" />
                </dd>
              </div>
              <div>
                <dt class="fin-kv__label">Ausgegeben</dt>
                <dd>
                  <app-money-amount [amount]="data.totalSpentBudgeted" [currency]="data.currency" />
                </dd>
              </div>
              <div>
                <dt class="fin-kv__label">
                  {{ data.totalRemaining < 0 ? 'Überschritten' : 'Übrig' }}
                </dt>
                <dd>
                  <app-money-amount [amount]="data.totalRemaining" [currency]="data.currency" />
                </dd>
              </div>
            </dl>

            <app-budget-progress
              label="Auslastung aller Budgets"
              [spent]="data.totalSpentBudgeted"
              [budget]="data.totalBudget"
              [currency]="data.currency"
            />
          } @else {
            <p class="overview-note">
              Für diesen Monat ist noch kein Budget hinterlegt. Im Bereich „Budgets“ legst du je
              Kategorie fest, wie viel zur Verfügung steht.
            </p>
          }
        </div>
      </section>

      <section class="fin-panel" aria-labelledby="spendingHeading">
        <div class="fin-panel__body">
          <h2 id="spendingHeading" class="overview-heading">Ausgaben nach Kategorie</h2>

          @if (data.spending.length === 0) {
            <app-empty-state
              icon="receipt"
              title="Noch keine Ausgaben in diesem Monat"
              message="Sobald Buchungen erfasst sind, siehst du hier, wohin dein Geld fließt."
            >
              <button type="button" class="btn btn-primary" (click)="showTransactions.emit()">
                Zu den Transaktionen
              </button>
            </app-empty-state>
          } @else {
            <ul class="spending-list">
              @for (item of data.spending; track item.categoryId ?? 0) {
                <li class="spending-item">
                  <div class="spending-item__head">
                    <app-category-badge
                      class="spending-item__category"
                      [name]="item.categoryId === null ? null : item.categoryName"
                      [color]="item.categoryColor"
                      [icon]="item.categoryIcon"
                    />
                    <span class="spending-item__share">{{ item.share }} %</span>
                    <app-money-amount
                      size="sm"
                      tone="expense"
                      [amount]="item.amount"
                      [currency]="data.currency"
                    />
                  </div>

                  <!--
                    Der Anteilsbalken ist eine reine Wiederholung der Prozentzahl
                    daneben; als role=presentation bleibt er aus der Vorlesereihen-
                    folge heraus, statt sie zu verdoppeln.
                  -->
                  <div class="share-track" role="presentation">
                    <span
                      class="share-fill"
                      [style.width.%]="item.share"
                      [style.background-color]="item.categoryColor ?? defaultColor"
                    ></span>
                  </div>
                </li>
              }
            </ul>
          }
        </div>
      </section>
    }
  `,
  styles: [
    `
      .overview-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }
      .overview-stats {
        margin-bottom: var(--fin-space-4);
      }
      .overview-panel {
        margin-bottom: var(--fin-space-4);
      }
      .overview-heading {
        margin: 0 0 var(--fin-space-4);
        font-size: var(--fin-text-md);
      }
      .overview-note {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
      }

      .budget-totals {
        display: grid;
        /* Drei Werte nebeneinander, auf sehr schmalen Displays zweispaltig —
           umbrechen ist besser als die Beträge zu quetschen. */
        grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
        gap: var(--fin-space-4);
        margin: 0 0 var(--fin-space-5);
      }
      .budget-totals dd {
        margin: 0.15rem 0 0;
      }

      .spending-list {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-4);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .spending-item__head {
        display: flex;
        align-items: center;
        gap: var(--fin-space-2);
        margin-bottom: var(--fin-space-2);
      }
      .spending-item__category {
        flex: 1 1 auto;
        min-width: 0;
      }
      .spending-item__share {
        flex-shrink: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        font-variant-numeric: tabular-nums;
      }
      .share-track {
        height: 0.375rem;
        border-radius: var(--fin-radius-pill);
        background-color: var(--fin-surface-active);
        overflow: hidden;
      }
      .share-fill {
        display: block;
        height: 100%;
        border-radius: var(--fin-radius-pill);
        transition: width var(--fin-duration-slow) var(--fin-ease-out);
      }

      .stat-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-3);
        padding: var(--fin-space-4);
      }
    `,
  ],
})
export class AccountOverviewTabComponent {
  readonly summary = input<MonthSummary | null>(null);
  readonly loading = input(false);
  readonly error = input('');
  readonly month = input.required<string>();

  readonly retry = output<void>();
  readonly showTransactions = output<void>();

  protected readonly defaultColor = DEFAULT_ACCENT_COLOR;

  /** Anzahl der Platzhalter-Kacheln während des Ladens. */
  protected readonly skeletonSlots = [0, 1, 2];

  protected readonly monthLabel = computed(() => formatMonthLong(this.month()));

  protected readonly balanceHint = computed(() => {
    const data = this.summary();
    if (!data) return '';

    return `${data.transactionCount} ${data.transactionCount === 1 ? 'Buchung' : 'Buchungen'} in diesem Monat`;
  });
}
