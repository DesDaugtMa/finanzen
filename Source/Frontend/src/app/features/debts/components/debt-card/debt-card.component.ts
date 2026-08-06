import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Debt, DebtTransaction } from '../../../../core/models/debt.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { formatDate } from '../../../../shared/utils/month.util';
import { DebtStatusComponent } from '../debt-status/debt-status.component';

/**
 * Ein Schuldeintrag mit seinen Buchungen. Der offene Betrag steht groß und allein — er
 * ist die eigentliche Frage des Eintrags; Verliehen und Zurück erklären ihn darunter.
 */
@Component({
  selector: 'app-debt-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent, DebtStatusComponent],
  template: `
    @let item = debt();

    <article class="debt-card">
      <header class="debt-card__head">
        <div class="debt-card__ident">
          <h4 class="debt-card__title fin-truncate">{{ item.title }}</h4>
          <div class="debt-card__meta">
            <app-debt-status [status]="item.status" />
            <span class="debt-card__count">{{ transactionsLabel() }}</span>
          </div>
        </div>

        <div class="debt-card__actions">
          <button
            type="button"
            class="btn fin-btn-icon"
            [attr.aria-label]="'Buchung zu ' + item.title + ' zuordnen'"
            (click)="assign.emit()"
          >
            <i class="bi bi-link-45deg" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="btn fin-btn-icon"
            [attr.aria-label]="'Eintrag ' + item.title + ' bearbeiten'"
            (click)="edit.emit()"
          >
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="btn fin-btn-icon debt-card__remove"
            [attr.aria-label]="'Eintrag ' + item.title + ' löschen'"
            (click)="remove.emit()"
          >
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </header>

      <div class="debt-card__headline">
        <span class="fin-kv__label">{{ outstandingLabel() }}</span>
        <app-money-amount size="lg" [amount]="outstandingAmount()" [currency]="item.currency" />
      </div>

      <dl class="debt-card__figures">
        <div>
          <dt class="fin-kv__label">Verliehen</dt>
          <dd>
            <app-money-amount
              size="sm"
              tone="expense"
              [amount]="item.lentAmount"
              [currency]="item.currency"
            />
          </dd>
        </div>
        <div>
          <dt class="fin-kv__label">Zurück</dt>
          <dd>
            <app-money-amount
              size="sm"
              tone="income"
              [amount]="item.repaidAmount"
              [currency]="item.currency"
            />
          </dd>
        </div>
      </dl>

      @if (item.note) {
        <p class="debt-card__note">{{ item.note }}</p>
      }

      @if (item.transactionCount > 0) {
        <details class="fin-details debt-card__details">
          <summary class="fin-details__summary">{{ transactionsLabel() }}</summary>

          <ul class="fin-details__body debt-card__transactions">
            @for (transaction of item.transactions; track transaction.id) {
              <li class="debt-card__transaction">
                <div class="debt-card__transaction-text">
                  <span class="debt-card__transaction-title fin-truncate">
                    {{ transaction.title }}
                  </span>
                  <span class="debt-card__transaction-meta">{{ meta(transaction) }}</span>
                </div>

                <app-money-amount
                  size="sm"
                  [tone]="transaction.direction === 'Income' ? 'income' : 'expense'"
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
        <p class="debt-card__hint">
          Noch keine Buchung zugeordnet. Verknüpfe die Ausgabe, mit der du das Geld verliehen
          hast — erst dann zählt der Eintrag mit.
        </p>
      }
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .debt-card {
        padding: var(--fin-space-4) 0;
        border-top: 1px solid var(--fin-border-subtle);
      }
      /* Die erste Karte schließt direkt an die Kopfzeile der Person an. */
      :host(:first-of-type) .debt-card {
        border-top: none;
        padding-top: var(--fin-space-2);
      }

      .debt-card__head {
        display: flex;
        align-items: flex-start;
        gap: var(--fin-space-2);
        margin-bottom: var(--fin-space-3);
      }
      .debt-card__ident {
        flex: 1 1 auto;
        min-width: 0;
      }
      .debt-card__title {
        margin: 0;
        font-size: var(--fin-text-base);
        font-weight: 650;
      }
      .debt-card__meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-2);
        margin-top: var(--fin-space-2);
        min-width: 0;
      }
      .debt-card__count {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .debt-card__actions {
        display: flex;
        flex-shrink: 0;
        gap: var(--fin-space-1);
      }
      .debt-card__remove:hover {
        background-color: var(--fin-danger-tint);
        color: var(--fin-danger);
      }

      .debt-card__headline {
        margin-bottom: var(--fin-space-3);
      }

      .debt-card__figures {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
        gap: var(--fin-space-3);
        margin: 0;
      }
      .debt-card__figures dd {
        margin: 0.15rem 0 0;
      }

      .debt-card__note {
        margin: var(--fin-space-3) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }

      .debt-card__details {
        margin-top: var(--fin-space-3);
      }
      .debt-card__transactions {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .debt-card__transaction {
        display: flex;
        align-items: center;
        gap: var(--fin-space-2);
      }
      .debt-card__transaction-text {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .debt-card__transaction-title {
        font-size: var(--fin-text-sm);
        font-weight: 550;
      }
      .debt-card__transaction-meta {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-xs);
      }

      .debt-card__hint {
        margin: var(--fin-space-3) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
    `,
  ],
})
export class DebtCardComponent {
  readonly debt = input.required<Debt>();

  readonly edit = output<void>();
  readonly remove = output<void>();
  readonly assign = output<void>();
  /** Die ID der Buchung, deren Zuordnung gelöst werden soll. */
  readonly unlink = output<number>();

  /**
   * Ein zu viel zurückgezahlter Eintrag würde als negative Zahl unnötig verwirren.
   * Angezeigt wird deshalb der Betrag ohne Vorzeichen, die Bedeutung trägt die
   * Beschriftung darüber.
   */
  protected readonly outstandingAmount = computed(() => Math.abs(this.debt().outstandingAmount));

  protected readonly outstandingLabel = computed(() =>
    this.debt().outstandingAmount < 0 ? 'Zu viel zurückbekommen' : 'Offen',
  );

  protected readonly transactionsLabel = computed(() => {
    const count = this.debt().transactionCount;
    if (count === 0) return 'Keine Buchung';
    return count === 1 ? '1 Buchung' : `${count} Buchungen`;
  });

  protected meta(transaction: DebtTransaction): string {
    const direction = transaction.direction === 'Income' ? 'Zurück' : 'Verliehen';
    return `${direction} · ${formatDate(transaction.bookingDate)} · ${transaction.accountName}`;
  }
}
