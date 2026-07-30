import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  SortDirection,
  Transaction,
  TransactionSort,
} from '../../../../core/models/transaction.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { formatDate } from '../../../../shared/utils/month.util';

interface SortableColumn {
  key: TransactionSort;
  label: string;
}

/**
 * Liste der Buchungen eines Monats. Ab Tablet als Tabelle mit sortierbaren Spalten,
 * darunter als Karten — dieselben Daten, jeweils in der Form, die auf dem Gerät
 * gut lesbar ist.
 */
@Component({
  selector: 'app-transaction-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent, CategoryBadgeComponent],
  template: `
    <!-- Tabelle ab Tablet -->
    <div class="table-responsive d-none d-md-block">
      <table class="table align-middle mb-0 transaction-table">
        <caption class="visually-hidden">
          Buchungen des gewählten Monats
        </caption>
        <thead>
          <tr>
            @for (column of columns; track column.key) {
              <th
                scope="col"
                [class.text-end]="column.key === 'Amount'"
                [attr.aria-sort]="ariaSort(column.key)"
              >
                <button type="button" class="sort-button" (click)="sortChange.emit(column.key)">
                  {{ column.label }}
                  <i class="bi" [class]="sortIcon(column.key)" aria-hidden="true"></i>
                </button>
              </th>
            }
            <th scope="col"><span class="visually-hidden">Aktionen</span></th>
          </tr>
        </thead>
        <tbody>
          @for (item of transactions(); track item.id) {
            <tr>
              <td class="text-nowrap">{{ formatDate(item.bookingDate) }}</td>
              <td>
                <span class="d-inline-flex align-items-center gap-2">
                  <span class="text-break">{{ item.title }}</span>
                  @if (item.isTransfer) {
                    <span class="badge transfer-badge">
                      <i class="bi bi-arrow-left-right me-1" aria-hidden="true"></i
                      >{{ item.counterAccountName }}
                    </span>
                  }
                  @if (item.note) {
                    <i
                      class="bi bi-chat-left-text text-muted"
                      [attr.title]="item.note"
                      aria-hidden="true"
                    ></i>
                  }
                </span>
              </td>
              <td>
                <app-category-badge
                  [name]="item.categoryName"
                  [color]="item.categoryColor"
                  [icon]="item.categoryIcon"
                />
              </td>
              <td class="text-end">
                <app-money-amount
                  [amount]="item.amount"
                  [currency]="item.currency"
                  [tone]="item.type === 'Income' ? 'income' : 'expense'"
                />
              </td>
              <td class="text-end text-nowrap">
                <button
                  type="button"
                  class="btn btn-sm btn-light icon-button"
                  [attr.aria-label]="'Buchung ' + item.title + ' bearbeiten'"
                  (click)="edit.emit(item)"
                >
                  <i class="bi bi-pencil" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-light icon-button text-danger ms-1"
                  [attr.aria-label]="'Buchung ' + item.title + ' löschen'"
                  (click)="remove.emit(item)"
                >
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Karten auf schmalen Displays -->
    <ul class="list-unstyled mb-0 d-md-none">
      @for (item of transactions(); track item.id) {
        <li class="transaction-card">
          <div class="d-flex align-items-start gap-2">
            <div class="flex-grow-1 min-width-0">
              <p class="fw-semibold mb-1 text-break">{{ item.title }}</p>
              <div class="d-flex flex-wrap align-items-center gap-2">
                <app-category-badge
                  [name]="item.categoryName"
                  [color]="item.categoryColor"
                  [icon]="item.categoryIcon"
                />
                <span class="text-muted small">{{ formatDate(item.bookingDate) }}</span>
              </div>
              @if (item.isTransfer) {
                <span class="badge transfer-badge mt-2">
                  <i class="bi bi-arrow-left-right me-1" aria-hidden="true"></i
                  >{{ item.counterAccountName }}
                </span>
              }
            </div>

            <div class="text-end flex-shrink-0">
              <app-money-amount
                [amount]="item.amount"
                [currency]="item.currency"
                [tone]="item.type === 'Income' ? 'income' : 'expense'"
              />
              <div class="mt-2">
                <button
                  type="button"
                  class="btn btn-sm btn-light icon-button"
                  [attr.aria-label]="'Buchung ' + item.title + ' bearbeiten'"
                  (click)="edit.emit(item)"
                >
                  <i class="bi bi-pencil" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-light icon-button text-danger ms-1"
                  [attr.aria-label]="'Buchung ' + item.title + ' löschen'"
                  (click)="remove.emit(item)"
                >
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              </div>
            </div>
          </div>
        </li>
      }
    </ul>
  `,
  styles: [
    `
      .transaction-table th {
        font-size: 0.75rem;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--bs-secondary-color);
        font-weight: 600;
      }
      .sort-button {
        border: none;
        background: none;
        padding: 0;
        color: inherit;
        font: inherit;
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }
      .sort-button:focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: 2px;
      }
      .transaction-card {
        padding: 0.85rem 0;
        border-bottom: 1px solid var(--bs-border-color-translucent);
      }
      .transaction-card:last-child {
        border-bottom: none;
      }
      .transfer-badge {
        background-color: var(--bs-secondary-bg);
        color: var(--bs-secondary-color);
        font-weight: 500;
      }
      .icon-button {
        width: 2.25rem;
        height: 2.25rem;
        line-height: 1;
      }
      .min-width-0 {
        min-width: 0;
      }
    `,
  ],
})
export class TransactionListComponent {
  readonly transactions = input.required<Transaction[]>();
  readonly sort = input.required<TransactionSort>();
  readonly direction = input.required<SortDirection>();

  readonly sortChange = output<TransactionSort>();
  readonly edit = output<Transaction>();
  readonly remove = output<Transaction>();

  protected readonly columns: readonly SortableColumn[] = [
    { key: 'BookingDate', label: 'Datum' },
    { key: 'Title', label: 'Bezeichnung' },
    { key: 'Category', label: 'Kategorie' },
    { key: 'Amount', label: 'Betrag' },
  ];

  protected readonly formatDate = formatDate;

  protected ariaSort(key: TransactionSort): 'ascending' | 'descending' | 'none' {
    if (this.sort() !== key) return 'none';
    return this.direction() === 'Ascending' ? 'ascending' : 'descending';
  }

  protected sortIcon(key: TransactionSort): string {
    if (this.sort() !== key) return 'bi-arrow-down-up opacity-25';
    return this.direction() === 'Ascending' ? 'bi-sort-up' : 'bi-sort-down';
  }
}
