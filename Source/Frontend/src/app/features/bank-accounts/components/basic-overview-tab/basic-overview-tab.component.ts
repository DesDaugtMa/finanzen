import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MonthSummary } from '../../../../core/models/month-summary.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { StatTileComponent } from '../../../../shared/components/stat-tile/stat-tile.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { BudgetProgressComponent } from '../../../../shared/components/budget-progress/budget-progress.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { DEFAULT_ACCENT_COLOR } from '../../../../shared/utils/color-presets';
import { formatMoney } from '../../../../shared/utils/money.util';
import { formatMonthLong } from '../../../../shared/utils/month.util';

/**
 * Die Übersicht für Konten ohne laufenden Zahlungsverkehr — Sparkonten, Depots,
 * Wallets.
 *
 * Bewusst ohne Verlauf, Spielraum pro Tag und Hochrechnung: diese Kennzahlen leben
 * davon, dass ein Monat aus vielen kleinen Buchungen besteht. Auf einem Sparkonto mit
 * zwei Bewegungen im Quartal wären sie Zahlenrauschen. Hier zählt, was da ist und
 * wohin es geflossen ist.
 */
@Component({
  selector: 'app-account-basic-overview-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MoneyAmountComponent,
    StatTileComponent,
    EmptyStateComponent,
    BudgetProgressComponent,
    CategoryBadgeComponent,
  ],
  template: `
    <div class="fin-grid fin-grid--stats overview-stats">
      <app-stat-tile
        label="Einnahmen"
        icon="arrow-down-left-circle"
        tone="income"
        [amount]="summary().income"
        [currency]="summary().currency"
      />
      <app-stat-tile
        label="Ausgaben"
        icon="arrow-up-right-circle"
        tone="expense"
        [amount]="summary().expenses"
        [currency]="summary().currency"
      />
      <app-stat-tile
        label="Saldo des Monats"
        icon="calculator"
        [amount]="summary().net"
        [currency]="summary().currency"
        [hint]="balanceHint()"
      />
      <app-stat-tile
        label="Frei verfügbar"
        icon="piggy-bank"
        [amount]="summary().disposable"
        [currency]="summary().currency"
        [hint]="disposableHint()"
      />
      <!-- Der Kontostand schließt die Reihe ab: die drei Kacheln davor beschreiben
           den Monat, diese sagt, was insgesamt da ist. -->
      <app-stat-tile
        label="Kontostand"
        icon="wallet2"
        [amount]="summary().currentBalance"
        [currency]="summary().currency"
      />
    </div>

    <section class="fin-panel overview-panel" aria-labelledby="budgetTotalsHeading">
      <div class="fin-panel__body">
        <h2 id="budgetTotalsHeading" class="overview-heading">Budgets im {{ monthLabel() }}</h2>

        @if (summary().totalBudget > 0) {
          <dl class="budget-totals">
            <div>
              <dt class="fin-kv__label">Budgetiert</dt>
              <dd>
                <app-money-amount
                  [amount]="summary().totalBudget"
                  [currency]="summary().currency"
                />
              </dd>
            </div>
            <div>
              <dt class="fin-kv__label">Ausgegeben</dt>
              <dd>
                <app-money-amount
                  [amount]="summary().totalSpentBudgeted"
                  [currency]="summary().currency"
                />
              </dd>
            </div>
            <div>
              <dt class="fin-kv__label">
                {{ summary().totalRemaining < 0 ? 'Überschritten' : 'Übrig' }}
              </dt>
              <dd>
                <app-money-amount
                  [amount]="summary().totalRemaining"
                  [currency]="summary().currency"
                />
              </dd>
            </div>
          </dl>

          <app-budget-progress
            label="Auslastung aller Budgets"
            [spent]="summary().totalSpentBudgeted"
            [budget]="summary().totalBudget"
            [currency]="summary().currency"
          />
        } @else {
          <p class="overview-note">
            Für diesen Monat ist noch kein Budget hinterlegt. Im Bereich „Budgets“ legst du je
            Kategorie fest, wie viel zur Verfügung steht.
          </p>
        }
      </div>
    </section>

    <section class="fin-panel" aria-labelledby="basicSpendingHeading">
      <div class="fin-panel__body">
        <h2 id="basicSpendingHeading" class="overview-heading">Ausgaben nach Kategorie</h2>

        @if (summary().spending.length === 0) {
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
            @for (item of summary().spending; track item.categoryId ?? 0) {
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
                    [currency]="summary().currency"
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
  `,
  styles: [
    `
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
    `,
  ],
})
export class AccountBasicOverviewTabComponent {
  readonly summary = input.required<MonthSummary>();
  readonly month = input.required<string>();

  readonly showTransactions = output<void>();

  protected readonly defaultColor = DEFAULT_ACCENT_COLOR;

  protected readonly monthLabel = computed(() => formatMonthLong(this.month()));

  protected readonly balanceHint = computed(() => {
    const count = this.summary().transactionCount;
    return `${count} ${count === 1 ? 'Buchung' : 'Buchungen'} in diesem Monat`;
  });

  /**
   * Macht die Rechnung hinter „frei verfügbar“ sichtbar. Reichen die Einnahmen nicht,
   * steht die Kennzahl bei 0 € — dann hat die Unterdeckung Vorrang vor der Erklärung,
   * sonst verschwände sie hinter einer harmlos aussehenden Null.
   */
  protected readonly disposableHint = computed(() => {
    const data = this.summary();

    if (data.disposableShortfall > 0) {
      return `${formatMoney(data.disposableShortfall, data.currency)} über den Einnahmen dieses Monats`;
    }

    if (data.fixedCostCount === 0) {
      return 'Noch keine Fixkosten hinterlegt — im Bereich „Fixkosten“ planbar machen';
    }

    const fixed = formatMoney(data.fixedCosts, data.currency);
    const open = data.fixedCostOpenCount;

    return open === 0
      ? `nach ${fixed} Fixkosten und den variablen Ausgaben`
      : `nach ${fixed} Fixkosten (davon ${open} noch offen) und den variablen Ausgaben`;
  });
}
