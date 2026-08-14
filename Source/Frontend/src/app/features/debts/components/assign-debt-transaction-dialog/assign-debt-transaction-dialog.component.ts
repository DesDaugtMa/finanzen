import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { Debt, DebtTransaction } from '../../../../core/models/debt.model';
import { BankAccount } from '../../../../core/models/bank-account.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { formatDate } from '../../../../shared/utils/month.util';

/**
 * Ordnet einem Schuldeintrag eine bereits erfasste Buchung zu. Zur Auswahl stehen
 * Buchungen aller Geldkonten und beider Richtungen: eine Ausgabe ist verliehenes Geld,
 * eine Einnahme eine Rückzahlung.
 */
@Component({
  selector: 'app-assign-debt-transaction-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent, MoneyAmountComponent, EmptyStateComponent],
  template: `
    <app-modal-dialog [title]="title()" size="lg" (closed)="cancelled.emit()">
      <div class="assign-filters">
        <div class="assign-filters__search">
          <label for="debtAssignSearch" class="form-label">Buchung suchen</label>
          <input
            type="search"
            id="debtAssignSearch"
            class="form-control"
            placeholder="Bezeichnung, z. B. Urlaub"
            autocomplete="off"
            [value]="search()"
            [disabled]="saving()"
            (input)="onSearch($event)"
          />
        </div>

        <div class="assign-filters__account">
          <label for="debtAssignAccount" class="form-label">Geldkonto</label>
          <select
            id="debtAssignAccount"
            class="form-select"
            [value]="accountId()"
            [disabled]="saving()"
            (change)="onAccountChange($event)"
          >
            <option value="">Alle Konten</option>
            @for (account of accounts(); track account.id) {
              <option [value]="account.id">{{ account.name }}</option>
            }
          </select>
        </div>
      </div>

      @if (loading()) {
        <div class="assign-loading" role="status">
          <span class="spinner-border" aria-hidden="true"></span>
          <span class="visually-hidden">Buchungen werden geladen …</span>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger mb-0" role="alert">{{ error() }}</div>
      } @else if (transactions().length === 0) {
        <app-empty-state icon="search" title="Keine passende Buchung" [message]="emptyMessage()" />
      } @else {
        <ul class="fin-rows assign-list">
          @for (transaction of transactions(); track transaction.id) {
            <li class="fin-row assign-row">
              <button
                type="button"
                class="assign-row__button"
                [disabled]="saving()"
                (click)="assign.emit(transaction.id)"
              >
                <span class="assign-row__text">
                  <span class="assign-row__title fin-truncate">{{ transaction.title }}</span>
                  <span class="assign-row__meta">{{ meta(transaction) }}</span>
                </span>

                <app-money-amount
                  size="sm"
                  [tone]="transaction.direction === 'Income' ? 'income' : 'expense'"
                  [amount]="transaction.amount"
                  [currency]="transaction.currency"
                />
              </button>
            </li>
          }
        </ul>

        <p class="assign-note mb-0">
          Ausgaben sind verliehenes Geld, Einnahmen sind Rückzahlungen. Angezeigt werden nur
          Buchungen, die noch keinem Eintrag zugeordnet sind.
        </p>
      }

      <div dialogFooter class="fin-dialog-actions">
        <button
          type="button"
          class="btn btn-light"
          [disabled]="saving()"
          (click)="cancelled.emit()"
        >
          Schließen
        </button>
      </div>
    </app-modal-dialog>
  `,
  styles: [
    `
      .assign-filters {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-4);
      }
      .assign-filters__search {
        flex: 2 1 12rem;
        min-width: 0;
      }
      .assign-filters__account {
        flex: 1 1 9rem;
        min-width: 0;
      }
      .assign-loading {
        display: flex;
        justify-content: center;
        padding: var(--fin-space-6) 0;
        color: var(--fin-accent);
      }
      .assign-row {
        padding: 0;
      }
      /* Die gesamte Zeile ist die Schaltfläche — größere Trefferfläche als ein
         eigener Knopf am Rand und auf dem Smartphone deutlich leichter zu treffen. */
      .assign-row__button {
        display: flex;
        align-items: center;
        gap: var(--fin-space-3);
        width: 100%;
        min-height: var(--fin-touch-min);
        padding: var(--fin-space-3) var(--fin-space-1);
        border: 0;
        border-radius: var(--fin-radius-sm);
        background-color: transparent;
        text-align: start;
        cursor: pointer;
        transition: background-color var(--fin-duration-fast) var(--fin-ease-out);
      }
      .assign-row__button:hover:not(:disabled) {
        background-color: var(--fin-surface-hover);
      }
      .assign-row__button:disabled {
        cursor: default;
        opacity: 0.6;
      }
      .assign-row__text {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .assign-row__title {
        font-weight: 550;
      }
      .assign-row__meta {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-xs);
      }
      .assign-note {
        margin-top: var(--fin-space-3);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
    `,
  ],
})
export class AssignDebtTransactionDialogComponent {
  readonly debt = input.required<Debt>();
  readonly transactions = input.required<DebtTransaction[]>();
  readonly accounts = input.required<BankAccount[]>();
  readonly loading = input(false);
  readonly saving = input(false);
  readonly error = input('');

  readonly searchChange = output<string>();
  /** Das gewählte Geldkonto, oder `null` für alle. */
  readonly accountChange = output<number | null>();
  /** Die ID der Buchung, die zugeordnet werden soll. */
  readonly assign = output<number>();
  readonly cancelled = output<void>();

  protected readonly search = signal('');
  protected readonly accountId = signal('');

  protected readonly title = computed(() => `Buchung zu „${this.debt().title}“ zuordnen`);

  protected readonly emptyMessage = computed(() =>
    this.search() || this.accountId()
      ? 'Zu dieser Auswahl gibt es keine freie Buchung. Prüfe die Schreibweise oder wähle ein anderes Konto.'
      : 'Alle Buchungen sind bereits zugeordnet. Erfasse die Buchung zuerst beim jeweiligen Geldkonto.',
  );

  protected meta(transaction: DebtTransaction): string {
    const direction = transaction.direction === 'Income' ? 'Einnahme' : 'Ausgabe';
    return `${direction} · ${formatDate(transaction.bookingDate)} · ${transaction.accountName}`;
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.searchChange.emit(value);
  }

  protected onAccountChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.accountId.set(value);
    this.accountChange.emit(value ? Number(value) : null);
  }
}
