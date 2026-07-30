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
    <div class="transaction-table-wrap">
      <table class="table align-middle transaction-table">
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
                <span class="transaction-title">
                  <span class="fin-break-all">{{ item.title }}</span>
                  @if (item.isTransfer) {
                    <span class="fin-chip">
                      <i class="bi bi-arrow-left-right" aria-hidden="true"></i>
                      {{ item.counterAccountName }}
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
              <td>
                <div class="transaction-actions">
                  <button
                    type="button"
                    class="btn fin-btn-icon"
                    [attr.aria-label]="'Buchung ' + item.title + ' bearbeiten'"
                    (click)="edit.emit(item)"
                  >
                    <i class="bi bi-pencil" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    class="btn fin-btn-icon row-remove"
                    [attr.aria-label]="'Buchung ' + item.title + ' löschen'"
                    (click)="remove.emit(item)"
                  >
                    <i class="bi bi-trash" aria-hidden="true"></i>
                  </button>
                </div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Zeilenliste auf schmalen Displays -->
    <ul class="fin-rows transaction-rows">
      @for (item of transactions(); track item.id) {
        <li class="fin-row">
          <span class="row-icon" aria-hidden="true">
            <app-category-badge
              [showLabel]="false"
              [name]="item.categoryName"
              [color]="item.categoryColor"
              [icon]="item.categoryIcon"
            />
          </span>

          <div class="fin-row__main">
            <p class="fin-row__title">{{ item.title }}</p>
            <p class="fin-row__meta">
              <span>{{ formatDate(item.bookingDate) }}</span>
              <span class="fin-dot"></span>
              <span class="row-category">{{ item.categoryName ?? 'Ohne Kategorie' }}</span>
              @if (item.isTransfer) {
                <span class="fin-chip">
                  <i class="bi bi-arrow-left-right" aria-hidden="true"></i>
                  {{ item.counterAccountName }}
                </span>
              }
              @if (item.note) {
                <i class="bi bi-chat-left-text" [attr.title]="item.note" aria-hidden="true"></i>
              }
            </p>
          </div>

          <div class="fin-row__aside">
            <app-money-amount
              [amount]="item.amount"
              [currency]="item.currency"
              [tone]="item.type === 'Income' ? 'income' : 'expense'"
            />
            <button
              type="button"
              class="btn fin-btn-icon"
              [attr.aria-label]="'Buchung ' + item.title + ' bearbeiten'"
              (click)="edit.emit(item)"
            >
              <i class="bi bi-pencil" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              class="btn fin-btn-icon row-remove"
              [attr.aria-label]="'Buchung ' + item.title + ' löschen'"
              (click)="remove.emit(item)"
            >
              <i class="bi bi-trash" aria-hidden="true"></i>
            </button>
          </div>
        </li>
      }
    </ul>
  `,
  styles: [
    `
      /* Ab Tablet die Tabelle, darunter die Zeilenliste. Der Umschaltpunkt ist
         die Breite, ab der vier Spalten plus Aktionen ohne Quetschen passen. */
      .transaction-table-wrap {
        display: none;
        overflow-x: auto;
      }
      .transaction-rows {
        display: flex;
      }
      @media (min-width: 48rem) {
        .transaction-table-wrap {
          display: block;
        }
        .transaction-rows {
          display: none;
        }
      }

      .sort-button {
        display: inline-flex;
        align-items: center;
        gap: var(--fin-space-1);
        /* Volle Zellhöhe als Klickfläche, damit die Sortierung auch mit dem
           Finger gut zu treffen ist. */
        min-height: var(--fin-touch-min);
        padding: 0;
        border: none;
        background: none;
        color: inherit;
        font: inherit;
        letter-spacing: inherit;
        text-transform: inherit;
        cursor: pointer;
        transition: color var(--fin-duration-fast) var(--fin-ease-out);
      }
      .sort-button:hover {
        color: var(--fin-text-strong);
      }
      .sort-button:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: 2px;
      }
      /* Das inaktive Sortiersymbol bleibt sichtbar, aber zurückgenommen — es
         zeigt, dass die Spalte sortierbar ist, ohne die Kopfzeile zu füllen. */
      .sort-button .bi-arrow-down-up {
        opacity: 0.35;
      }

      .transaction-table td {
        border-color: var(--fin-border-subtle);
      }
      .transaction-title {
        display: inline-flex;
        align-items: center;
        gap: var(--fin-space-2);
        flex-wrap: wrap;
      }
      .transaction-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--fin-space-1);
      }
      .row-remove:hover {
        background-color: var(--fin-danger-tint);
        color: var(--fin-danger);
      }

      .row-icon {
        flex-shrink: 0;
      }
      /* In der Zeilenliste steht der Kategoriename schon als Text in der
         Metazeile — das Symbol daneben genügt. */
      .row-category {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 12rem;
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
