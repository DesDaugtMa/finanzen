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
      <div class="text-center py-5">
        <span class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Kennzahlen werden geladen …</span>
        </span>
      </div>
    } @else if (error()) {
      <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
        <span class="me-auto">{{ error() }}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="retry.emit()">
          Erneut versuchen
        </button>
      </div>
    } @else if (summary(); as data) {
      <div class="row g-3 mb-3">
        <div class="col-12 col-sm-4">
          <app-stat-tile
            label="Einnahmen"
            icon="arrow-down-left-circle"
            tone="income"
            [amount]="data.income"
            [currency]="data.currency"
          />
        </div>
        <div class="col-12 col-sm-4">
          <app-stat-tile
            label="Ausgaben"
            icon="arrow-up-right-circle"
            tone="expense"
            [amount]="data.expenses"
            [currency]="data.currency"
          />
        </div>
        <div class="col-12 col-sm-4">
          <app-stat-tile
            label="Saldo des Monats"
            icon="calculator"
            [amount]="data.net"
            [currency]="data.currency"
            [hint]="balanceHint()"
          />
        </div>
      </div>

      <section
        class="card border-0 shadow-sm surface-card mb-3"
        aria-labelledby="budgetTotalsHeading"
      >
        <div class="card-body p-3 p-sm-4">
          <h2 id="budgetTotalsHeading" class="h6 fw-bold mb-3">Budgets im {{ monthLabel() }}</h2>

          @if (data.totalBudget > 0) {
            <dl class="row g-3 mb-3">
              <div class="col-4">
                <dt class="text-muted small fw-normal">Budgetiert</dt>
                <dd class="mb-0">
                  <app-money-amount [amount]="data.totalBudget" [currency]="data.currency" />
                </dd>
              </div>
              <div class="col-4">
                <dt class="text-muted small fw-normal">Ausgegeben</dt>
                <dd class="mb-0">
                  <app-money-amount [amount]="data.totalSpentBudgeted" [currency]="data.currency" />
                </dd>
              </div>
              <div class="col-4">
                <dt class="text-muted small fw-normal">
                  {{ data.totalRemaining < 0 ? 'Überschritten' : 'Übrig' }}
                </dt>
                <dd class="mb-0">
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
            <p class="text-muted mb-0">
              Für diesen Monat ist noch kein Budget hinterlegt. Im Bereich „Budgets“ legst du je
              Kategorie fest, wie viel zur Verfügung steht.
            </p>
          }
        </div>
      </section>

      <section class="card border-0 shadow-sm surface-card" aria-labelledby="spendingHeading">
        <div class="card-body p-3 p-sm-4">
          <h2 id="spendingHeading" class="h6 fw-bold mb-3">Ausgaben nach Kategorie</h2>

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
            <ul class="list-unstyled mb-0 d-flex flex-column gap-3">
              @for (item of data.spending; track item.categoryId ?? 0) {
                <li>
                  <div class="d-flex align-items-center gap-2 mb-1">
                    <app-category-badge
                      class="flex-grow-1 min-width-0"
                      [name]="item.categoryId === null ? null : item.categoryName"
                      [color]="item.categoryColor"
                      [icon]="item.categoryIcon"
                    />
                    <span class="text-muted small flex-shrink-0">{{ item.share }} %</span>
                    <app-money-amount
                      class="flex-shrink-0"
                      size="sm"
                      tone="expense"
                      [amount]="item.amount"
                      [currency]="data.currency"
                    />
                  </div>

                  <div
                    class="share-track"
                    role="img"
                    [attr.aria-label]="
                      item.categoryName + ': ' + item.share + ' Prozent der Ausgaben'
                    "
                  >
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
      .surface-card {
        border-radius: 1rem;
        background-color: var(--color-surface);
      }
      .share-track {
        height: 0.4rem;
        border-radius: 999px;
        background-color: var(--bs-secondary-bg);
        overflow: hidden;
      }
      .share-fill {
        display: block;
        height: 100%;
        border-radius: 999px;
        transition: width 0.25s ease;
      }
      .min-width-0 {
        min-width: 0;
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

  protected readonly monthLabel = computed(() => formatMonthLong(this.month()));

  protected readonly balanceHint = computed(() => {
    const data = this.summary();
    if (!data) return '';

    return `${data.transactionCount} ${data.transactionCount === 1 ? 'Buchung' : 'Buchungen'} in diesem Monat`;
  });
}
