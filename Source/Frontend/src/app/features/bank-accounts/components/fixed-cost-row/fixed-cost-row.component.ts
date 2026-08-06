import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FixedCost, FixedCostTransaction } from '../../../../core/models/fixed-cost.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { BudgetProgressComponent } from '../../../../shared/components/budget-progress/budget-progress.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { formatDate, formatMonthLong } from '../../../../shared/utils/month.util';
import { FixedCostStatusComponent } from '../fixed-cost-status/fixed-cost-status.component';

/**
 * Eine Fixkosten-Position mit ihren zugeordneten Buchungen. Geplanter und tatsächlich
 * gebuchter Betrag stehen bewusst nebeneinander: die Differenz ist die eigentliche
 * Information — sie zeigt, was diesen Monat noch aussteht.
 */
@Component({
  selector: 'app-fixed-cost-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MoneyAmountComponent,
    BudgetProgressComponent,
    CategoryBadgeComponent,
    FixedCostStatusComponent,
  ],
  template: `
    @let item = fixedCost();

    <div class="cost-row">
      <div class="cost-row__head">
        <div class="cost-row__ident">
          <h3 class="cost-row__name fin-truncate">{{ item.name }}</h3>
          <div class="cost-row__meta">
            <app-fixed-cost-status [status]="item.status" />
            @if (item.categoryId !== null) {
              <app-category-badge
                class="cost-row__category"
                [name]="item.categoryName"
                [color]="item.categoryColor"
                [icon]="item.categoryIcon"
              />
            }
          </div>
        </div>

        <div class="cost-row__actions">
          <button
            type="button"
            class="btn fin-btn-icon"
            [attr.aria-label]="'Buchung zu ' + item.name + ' zuordnen'"
            (click)="assign.emit()"
          >
            <i class="bi bi-link-45deg" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="btn fin-btn-icon"
            [attr.aria-label]="'Fixkosten ' + item.name + ' bearbeiten'"
            (click)="edit.emit()"
          >
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="btn fin-btn-icon cost-row__remove"
            [attr.aria-label]="'Fixkosten ' + item.name + ' löschen'"
            (click)="remove.emit()"
          >
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <dl class="cost-row__figures">
        <div>
          <dt class="fin-kv__label">Geplant</dt>
          <dd><app-money-amount size="sm" [amount]="item.amount" [currency]="item.currency" /></dd>
        </div>
        <div>
          <dt class="fin-kv__label">Gebucht</dt>
          <dd>
            <app-money-amount size="sm" [amount]="item.bookedAmount" [currency]="item.currency" />
          </dd>
        </div>
        <div>
          <dt class="fin-kv__label">{{ openLabel() }}</dt>
          <dd><app-money-amount size="sm" [amount]="openAmount()" [currency]="item.currency" /></dd>
        </div>
      </dl>

      <app-budget-progress
        [label]="'Gebucht von geplant für ' + item.name"
        [spent]="item.bookedAmount"
        [budget]="item.amount"
        [currency]="item.currency"
      />

      @if (item.transactionCount > 0) {
        <details class="fin-details cost-row__details">
          <summary class="fin-details__summary">{{ transactionsLabel() }}</summary>

          <ul class="fin-details__body cost-row__transactions">
            @for (transaction of item.transactions; track transaction.id) {
              <li class="cost-row__transaction">
                <div class="cost-row__transaction-text">
                  <span class="cost-row__transaction-title fin-truncate">
                    {{ transaction.title }}
                  </span>
                  <span class="cost-row__transaction-meta">{{ transactionMeta(transaction) }}</span>
                </div>

                <app-money-amount
                  size="sm"
                  tone="expense"
                  [amount]="transaction.amount"
                  [currency]="transaction.currency"
                />

                <button
                  type="button"
                  class="btn fin-btn-icon"
                  [attr.aria-label]="'Zuordnung von ' + transaction.title + ' lösen'"
                  (click)="unlink.emit(transaction.id)"
                >
                  <i class="bi bi-x-lg" aria-hidden="true"></i>
                </button>
              </li>
            }
          </ul>
        </details>
      } @else {
        <p class="cost-row__hint">
          Noch keine Buchung zugeordnet — der volle geplante Betrag zählt gegen das frei verfügbare
          Geld.
        </p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .cost-row {
        padding: var(--fin-space-4) 0;
        border-top: 1px solid var(--fin-border-subtle);
      }
      /* Die erste Zeile schließt direkt an die Überschrift an. */
      :host(:first-of-type) .cost-row {
        border-top: none;
        padding-top: var(--fin-space-2);
      }

      .cost-row__head {
        display: flex;
        align-items: flex-start;
        gap: var(--fin-space-2);
        margin-bottom: var(--fin-space-3);
      }
      .cost-row__ident {
        flex: 1 1 auto;
        min-width: 0;
      }
      .cost-row__name {
        margin: 0;
        font-size: var(--fin-text-base);
        font-weight: 650;
      }
      .cost-row__meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-2);
        margin-top: var(--fin-space-2);
        min-width: 0;
      }
      .cost-row__category {
        min-width: 0;
        font-size: var(--fin-text-sm);
      }
      .cost-row__actions {
        display: flex;
        flex-shrink: 0;
        gap: var(--fin-space-1);
      }
      .cost-row__remove:hover {
        background-color: var(--fin-danger-tint);
        color: var(--fin-danger);
      }

      .cost-row__figures {
        display: grid;
        /* Drei Werte nebeneinander; auf sehr schmalen Displays bricht das Raster
           um, statt die Beträge zu quetschen. */
        grid-template-columns: repeat(auto-fit, minmax(6rem, 1fr));
        gap: var(--fin-space-3);
        margin: 0 0 var(--fin-space-3);
      }
      .cost-row__figures dd {
        margin: 0.15rem 0 0;
      }

      .cost-row__details {
        margin-top: var(--fin-space-3);
      }
      .cost-row__transactions {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .cost-row__transaction {
        display: flex;
        align-items: center;
        gap: var(--fin-space-2);
      }
      .cost-row__transaction-text {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .cost-row__transaction-title {
        font-size: var(--fin-text-sm);
        font-weight: 550;
      }
      .cost-row__transaction-meta {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-xs);
      }

      .cost-row__hint {
        margin: var(--fin-space-3) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
    `,
  ],
})
export class FixedCostRowComponent {
  readonly fixedCost = input.required<FixedCost>();

  readonly edit = output<void>();
  readonly remove = output<void>();
  readonly assign = output<void>();
  /** Die ID der Buchung, deren Zuordnung gelöst werden soll. */
  readonly unlink = output<number>();

  /** Über Cent gerechnet, damit kein Gleitkomma-Rest als Ein-Cent-Differenz erscheint. */
  private readonly openCents = computed(() => {
    const item = this.fixedCost();
    return Math.round(item.amount * 100) - Math.round(item.bookedAmount * 100);
  });

  protected readonly openAmount = computed(() => Math.abs(this.openCents()) / 100);

  protected readonly openLabel = computed(() => (this.openCents() < 0 ? 'Über Plan' : 'Offen'));

  protected readonly transactionsLabel = computed(() => {
    const count = this.fixedCost().transactionCount;
    return count === 1 ? '1 zugeordnete Buchung' : `${count} zugeordnete Buchungen`;
  });

  protected transactionMeta(transaction: FixedCostTransaction): string {
    const date = formatDate(transaction.bookingDate);

    // Buchungen dürfen aus anderen Monaten stammen; der Hinweis verhindert, dass
    // ein abweichender Abrechnungsmonat unbemerkt bleibt.
    return transaction.accountingMonth === this.fixedCost().month
      ? date
      : `${date} · Abrechnung ${formatMonthLong(transaction.accountingMonth)}`;
  }
}
