import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FixedCost, FixedCostTransaction } from '../../../../core/models/fixed-cost.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { formatDate, formatMonthLong } from '../../../../shared/utils/month.util';

/**
 * Ordnet einer Fixkosten-Position eine bereits erfasste Ausgabe zu. Zur Auswahl stehen
 * bewusst Buchungen aus allen Monaten — eine Jahresrechnung kann in einem anderen Monat
 * gebucht sein als die Position, für die sie zählt.
 */
@Component({
  selector: 'app-assign-transaction-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ModalDialogComponent,
    MoneyAmountComponent,
    CategoryBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-modal-dialog [title]="title()" size="lg" (closed)="cancelled.emit()">
      <div class="assign-search">
        <label for="assignSearch" class="form-label">Buchung suchen</label>
        <input
          type="search"
          id="assignSearch"
          class="form-control"
          placeholder="Bezeichnung, z. B. Miete"
          autocomplete="off"
          [value]="search()"
          [disabled]="saving()"
          (input)="onSearch($event)"
        />
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

                @if (transaction.categoryName) {
                  <app-category-badge
                    class="assign-row__category"
                    [name]="transaction.categoryName"
                    [color]="transaction.categoryColor"
                    [icon]="transaction.categoryIcon"
                  />
                }

                <app-money-amount
                  size="sm"
                  tone="expense"
                  [amount]="transaction.amount"
                  [currency]="transaction.currency"
                />
              </button>
            </li>
          }
        </ul>

        <p class="assign-note mb-0">
          Es werden nur Ausgaben angezeigt, die noch keiner Fixkosten-Position zugeordnet sind.
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
      .assign-search {
        margin-bottom: var(--fin-space-4);
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
      /* Auf schmalen Displays weicht die Kategorie dem Betrag. */
      .assign-row__category {
        display: none;
        min-width: 0;
        font-size: var(--fin-text-sm);
      }
      @media (min-width: 34rem) {
        .assign-row__category {
          display: inline-flex;
          flex: 0 1 9rem;
        }
      }
      .assign-note {
        margin-top: var(--fin-space-3);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
    `,
  ],
})
export class AssignTransactionDialogComponent {
  readonly fixedCost = input.required<FixedCost>();
  readonly transactions = input.required<FixedCostTransaction[]>();
  readonly loading = input(false);
  readonly saving = input(false);
  readonly error = input('');

  readonly searchChange = output<string>();
  /** Die ID der Buchung, die zugeordnet werden soll. */
  readonly assign = output<number>();
  readonly cancelled = output<void>();

  protected readonly search = signal('');

  protected readonly title = computed(() => `Buchung zu „${this.fixedCost().name}“ zuordnen`);

  protected readonly emptyMessage = computed(() =>
    this.search()
      ? 'Zu dieser Suche gibt es keine offene Ausgabe. Prüfe die Schreibweise oder erfasse die Buchung zuerst im Bereich „Transaktionen“.'
      : 'Alle Ausgaben dieses Kontos sind bereits zugeordnet. Erfasse die Buchung zuerst im Bereich „Transaktionen“.',
  );

  protected meta(transaction: FixedCostTransaction): string {
    return `${formatDate(transaction.bookingDate)} · Abrechnung ${formatMonthLong(transaction.accountingMonth)}`;
  }

  protected onSearch(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.search.set(value);
    this.searchChange.emit(value);
  }
}
