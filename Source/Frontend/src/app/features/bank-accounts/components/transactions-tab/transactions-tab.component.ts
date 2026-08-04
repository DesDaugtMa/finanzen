import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TransactionApiService } from '../../../../core/services/transaction-api.service';
import { BudgetApiService } from '../../../../core/services/budget-api.service';
import { FixedCostApiService } from '../../../../core/services/fixed-cost-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Category } from '../../../../core/models/category.model';
import { FixedCost } from '../../../../core/models/fixed-cost.model';
import {
  PagedResult,
  Transaction,
  TransactionFilter,
  TransactionPayload,
  TransactionSort,
  TransferPayload,
} from '../../../../core/models/transaction.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { formatMonthLong } from '../../../../shared/utils/month.util';
import { TransactionListComponent } from '../transaction-list/transaction-list.component';
import {
  TransactionFilterChange,
  TransactionFiltersComponent,
} from '../transaction-filters/transaction-filters.component';
import { TransactionFormDialogComponent } from '../transaction-form-dialog/transaction-form-dialog.component';
import { TransferFormDialogComponent } from '../transfer-form-dialog/transfer-form-dialog.component';

/** Welcher Dialog gerade offen ist. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'transaction'; transaction: Transaction | null }
  | { kind: 'transfer'; transaction: Transaction | null }
  | { kind: 'delete'; transaction: Transaction };

const DEFAULT_PAGE_SIZE = 25;

/**
 * Buchungen des gewählten Monats: Suche, Filter, Sortierung und Seitenwechsel laufen
 * serverseitig. Erfasst wird über zwei Wege — eine normale Buchung oder eine
 * Überweisung zwischen zwei Konten.
 */
@Component({
  selector: 'app-transactions-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ConfirmDialogComponent,
    EmptyStateComponent,
    TransactionListComponent,
    TransactionFiltersComponent,
    TransactionFormDialogComponent,
    TransferFormDialogComponent,
  ],
  template: `
    <section class="fin-panel" aria-labelledby="transactionsHeading">
      <div class="fin-panel__body">
        <header class="transactions-header">
          <div>
            <h2 id="transactionsHeading" class="transactions-title">
              Buchungen im {{ monthLabel() }}
            </h2>
            <p class="transactions-count" aria-live="polite">{{ resultLabel() }}</p>
          </div>

          <!-- Auf breiten Displays sitzen die Aktionen in der Kopfzeile, mobil
               unten in der Aktionsleiste in Daumenreichweite. -->
          <div class="transactions-actions">
            <button type="button" class="btn btn-outline-secondary" (click)="openTransfer(null)">
              <i class="bi bi-arrow-left-right" aria-hidden="true"></i>
              <span>Überweisung</span>
            </button>
            <button type="button" class="btn btn-primary" (click)="openTransaction(null)">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              <span>Buchung</span>
            </button>
          </div>
        </header>

        <app-transaction-filters
          class="transactions-filters"
          [categories]="categories()"
          [search]="filter().search"
          [type]="filter().type"
          [categoryIds]="filter().categoryIds"
          [includeUncategorized]="filter().includeUncategorized"
          (filterChange)="applyFilter($event)"
          (reset)="resetFilters()"
        />

        @if (loading()) {
          <div class="fin-rows" role="status" aria-label="Buchungen werden geladen">
            @for (placeholder of skeletonSlots; track $index) {
              <div class="fin-row">
                <div class="fin-skeleton fin-skeleton--circle row-skeleton__icon"></div>
                <div class="fin-row__main row-skeleton__lines">
                  <div class="fin-skeleton fin-skeleton--line-short"></div>
                  <div class="fin-skeleton fin-skeleton--text"></div>
                </div>
                <div class="fin-skeleton fin-skeleton--amount"></div>
              </div>
            }
          </div>
        } @else if (error()) {
          <div class="alert alert-danger transactions-error" role="alert">
            <span>{{ error() }}</span>
            <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">
              Erneut versuchen
            </button>
          </div>
        } @else if (transactions().length === 0) {
          @if (hasActiveFilters()) {
            <app-empty-state
              icon="funnel"
              title="Keine Treffer"
              message="Zu den gewählten Filtern gibt es in diesem Monat keine Buchungen."
            >
              <button type="button" class="btn btn-outline-secondary" (click)="resetFilters()">
                Filter zurücksetzen
              </button>
            </app-empty-state>
          } @else {
            <app-empty-state
              icon="receipt"
              title="Noch keine Buchungen in diesem Monat"
              message="Erfasse deine erste Einnahme oder Ausgabe, um den Monat auszuwerten."
            >
              <button type="button" class="btn btn-primary" (click)="openTransaction(null)">
                Buchung erfassen
              </button>
            </app-empty-state>
          }
        } @else {
          <app-transaction-list
            [transactions]="transactions()"
            [sort]="filter().sort"
            [direction]="filter().direction"
            (sortChange)="toggleSort($event)"
            (edit)="openForEdit($event)"
            (remove)="openDelete($event)"
          />

          @if (totalPages() > 1) {
            <nav class="pager" aria-label="Seiten">
              <span class="pager__status"> Seite {{ filter().page }} von {{ totalPages() }} </span>
              <div class="pager__buttons">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  [disabled]="filter().page <= 1"
                  (click)="goToPage(filter().page - 1)"
                >
                  <i class="bi bi-chevron-left" aria-hidden="true"></i>
                  <span>Zurück</span>
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  [disabled]="filter().page >= totalPages()"
                  (click)="goToPage(filter().page + 1)"
                >
                  <span>Weiter</span>
                  <i class="bi bi-chevron-right" aria-hidden="true"></i>
                </button>
              </div>
            </nav>
          }
        }
      </div>
    </section>

    <!-- Mobile Aktionsleiste: klebt über der Tab-Bar am unteren Rand und bleibt
         damit erreichbar, ohne die Liste zu verdecken. -->
    <div class="action-bar">
      <button type="button" class="btn btn-outline-secondary" (click)="openTransfer(null)">
        <i class="bi bi-arrow-left-right" aria-hidden="true"></i>
        <span>Überweisung</span>
      </button>
      <button type="button" class="btn btn-primary" (click)="openTransaction(null)">
        <i class="bi bi-plus-lg" aria-hidden="true"></i>
        <span>Buchung</span>
      </button>
    </div>

    @if (dialog(); as state) {
      @if (state.kind === 'transaction') {
        <app-transaction-form-dialog
          [transaction]="state.transaction"
          [categories]="categories()"
          [fixedCosts]="fixedCosts()"
          [month]="month()"
          [currency]="currency()"
          [saving]="saving()"
          [remainingByCategory]="remainingByCategory()"
          (save)="submitTransaction($event, state.transaction)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'transfer') {
        <app-transfer-form-dialog
          [transaction]="state.transaction"
          [accountId]="accountId()"
          [currency]="currency()"
          [categories]="categories()"
          [month]="month()"
          [saving]="saving()"
          (save)="submitTransfer($event, state.transaction)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'delete') {
        <app-confirm-dialog
          title="Buchung löschen"
          [message]="deleteMessage(state.transaction)"
          confirmLabel="Löschen"
          variant="danger"
          [busy]="saving()"
          (confirmed)="confirmDelete(state.transaction)"
          (cancelled)="closeDialog()"
        />
      }
    }
  `,
  styles: [
    `
      .transactions-header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-4);
      }
      .transactions-title {
        margin: 0;
        font-size: var(--fin-text-md);
      }
      .transactions-count {
        margin: 0.15rem 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      /* Die Aktionen liegen ab Tablet in der Kopfzeile; auf Mobil übernimmt das
         die klebende Leiste am unteren Rand. */
      .transactions-actions {
        display: none;
        flex-wrap: wrap;
        gap: var(--fin-space-2);
      }
      .transactions-filters {
        display: block;
        margin-bottom: var(--fin-space-4);
      }
      .transactions-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }

      .pager {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
        margin-top: var(--fin-space-4);
        padding-top: var(--fin-space-4);
        border-top: 1px solid var(--fin-border-subtle);
      }
      .pager__status {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        font-variant-numeric: tabular-nums;
      }
      .pager__buttons {
        display: flex;
        gap: var(--fin-space-2);
      }

      .action-bar {
        position: sticky;
        /* Sitzt direkt über der Tab-Bar; deren Höhe steckt inklusive
           Home-Indicator in --fin-tabbar-total. */
        bottom: calc(var(--fin-tabbar-total) + var(--fin-space-3));
        z-index: var(--fin-z-sticky);
        display: flex;
        gap: var(--fin-space-2);
        margin-top: var(--fin-space-4);
        padding: var(--fin-space-2);
        border: 1px solid var(--fin-border);
        border-radius: var(--fin-radius-lg);
        background-color: var(--fin-bg-elevated);
        box-shadow: var(--fin-shadow-lg);
      }
      .action-bar .btn {
        flex: 1 1 0;
        min-width: 0;
      }

      .row-skeleton__icon {
        flex-shrink: 0;
      }
      .row-skeleton__lines {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
      }

      @media (min-width: 34rem) {
        .transactions-actions {
          display: flex;
        }
        .action-bar {
          display: none;
        }
      }
    `,
  ],
})
export class TransactionsTabComponent {
  readonly accountId = input.required<number>();
  readonly month = input.required<string>();
  readonly currency = input.required<string>();
  readonly categories = input.required<Category[]>();

  /** Meldet dem Rahmen, dass die Kennzahlen neu geladen werden müssen. */
  readonly changed = output<void>();

  private readonly transactionApi = inject(TransactionApiService);
  private readonly budgetApi = inject(BudgetApiService);
  private readonly fixedCostApi = inject(FixedCostApiService);
  private readonly toastService = inject(ToastService);

  protected readonly result = signal<PagedResult<Transaction> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly dialog = signal<DialogState>({ kind: 'none' });

  /** Restbudget je Kategorie — nur für den Hinweis im Erfassungsdialog. */
  protected readonly remainingByCategory = signal<ReadonlyMap<number, number>>(new Map());

  /** Fixkosten des Monats — zur Auswahl im Erfassungsdialog. */
  protected readonly fixedCosts = signal<FixedCost[]>([]);

  protected readonly filter = signal<TransactionFilter>({
    month: '',
    search: '',
    categoryIds: [],
    includeUncategorized: false,
    type: null,
    sort: 'BookingDate',
    direction: 'Descending',
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  protected readonly transactions = computed(() => this.result()?.items ?? []);
  protected readonly totalPages = computed(() => this.result()?.totalPages ?? 0);
  protected readonly monthLabel = computed(() => formatMonthLong(this.month()));

  /** Anzahl der Platzhalter-Zeilen während des Ladens. */
  protected readonly skeletonSlots = [0, 1, 2, 3, 4];

  protected readonly hasActiveFilters = computed(() => {
    const filter = this.filter();
    return (
      Boolean(filter.search) ||
      filter.type !== null ||
      filter.categoryIds.length > 0 ||
      filter.includeUncategorized
    );
  });

  protected readonly resultLabel = computed(() => {
    const result = this.result();
    if (!result) return '';

    const count = result.totalCount;
    if (count === 0) return 'Keine Buchungen';

    return count === 1 ? '1 Buchung' : `${count} Buchungen`;
  });

  constructor() {
    // Beim Monatswechsel beginnt die Liste wieder auf Seite 1.
    effect(() => {
      const month = this.month();
      untracked(() => {
        this.filter.update((filter) => ({ ...filter, month, page: 1 }));
        this.load();
        this.loadRemainingBudgets();
        this.loadFixedCosts();
      });
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');

    this.transactionApi.list(this.accountId(), this.filter()).subscribe({
      next: (result) => {
        this.result.set(result);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Die Buchungen konnten nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  protected applyFilter(change: TransactionFilterChange): void {
    this.filter.update((filter) => ({ ...filter, ...change, page: 1 }));
    this.load();
  }

  protected resetFilters(): void {
    this.filter.update((filter) => ({
      ...filter,
      search: '',
      type: null,
      categoryIds: [],
      includeUncategorized: false,
      page: 1,
    }));
    this.load();
  }

  /** Erneutes Klicken auf dieselbe Spalte dreht die Richtung um. */
  protected toggleSort(sort: TransactionSort): void {
    this.filter.update((filter) => ({
      ...filter,
      sort,
      direction:
        filter.sort === sort
          ? filter.direction === 'Ascending'
            ? 'Descending'
            : 'Ascending'
          : 'Descending',
      page: 1,
    }));
    this.load();
  }

  protected goToPage(page: number): void {
    this.filter.update((filter) => ({ ...filter, page }));
    this.load();
  }

  protected openTransaction(transaction: Transaction | null): void {
    this.dialog.set({ kind: 'transaction', transaction });
  }

  protected openTransfer(transaction: Transaction | null): void {
    this.dialog.set({ kind: 'transfer', transaction });
  }

  /** Überweisungen führen in ihren eigenen Dialog, weil beide Seiten zusammengehören. */
  protected openForEdit(transaction: Transaction): void {
    if (transaction.isTransfer) {
      this.openTransfer(transaction);
      return;
    }

    this.openTransaction(transaction);
  }

  protected openDelete(transaction: Transaction): void {
    this.dialog.set({ kind: 'delete', transaction });
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialog.set({ kind: 'none' });
  }

  protected deleteMessage(transaction: Transaction): string {
    const base = `Soll die Buchung „${transaction.title}“ endgültig gelöscht werden?`;

    return transaction.isTransfer
      ? `${base} Die zugehörige Gegenbuchung auf „${transaction.counterAccountName}“ wird ebenfalls gelöscht.`
      : base;
  }

  protected submitTransaction(payload: TransactionPayload, existing: Transaction | null): void {
    this.saving.set(true);

    const request$ = existing
      ? this.transactionApi.update(this.accountId(), existing.id, payload)
      : this.transactionApi.create(this.accountId(), payload);

    request$.subscribe({
      next: () => this.finish(existing ? 'Buchung aktualisiert.' : 'Buchung erfasst.'),
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Die Buchung konnte nicht gespeichert werden.');
      },
    });
  }

  protected submitTransfer(payload: TransferPayload, existing: Transaction | null): void {
    this.saving.set(true);

    const request$ = existing
      ? this.transactionApi.updateTransfer(this.accountId(), existing.id, payload)
      : this.transactionApi.createTransfer(this.accountId(), payload);

    request$.subscribe({
      next: () => this.finish(existing ? 'Überweisung aktualisiert.' : 'Überweisung erfasst.'),
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Die Überweisung konnte nicht gespeichert werden.');
      },
    });
  }

  protected confirmDelete(transaction: Transaction): void {
    this.saving.set(true);

    this.transactionApi.delete(this.accountId(), transaction.id).subscribe({
      next: () => this.finish('Buchung gelöscht.'),
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Die Buchung konnte nicht gelöscht werden.');
      },
    });
  }

  private finish(message: string): void {
    this.saving.set(false);
    this.dialog.set({ kind: 'none' });
    this.toastService.success(message);

    this.load();
    this.loadRemainingBudgets();
    this.loadFixedCosts();
    this.changed.emit();
  }

  /**
   * Holt die Budgets des Monats, um im Dialog vor einer Überschreitung zu warnen.
   * Fehler bleiben still — der Hinweis ist eine Zusatzinformation, keine Voraussetzung.
   */
  private loadRemainingBudgets(): void {
    this.budgetApi.getMonth(this.accountId(), this.month()).subscribe({
      next: (data) => {
        const remaining = new Map<number, number>();

        for (const line of data.items) {
          if (line.remaining !== null) remaining.set(line.categoryId, line.remaining);
        }

        this.remainingByCategory.set(remaining);
      },
      error: () => this.remainingByCategory.set(new Map()),
    });
  }

  /**
   * Holt die Fixkosten des Monats für die Auswahl im Dialog. Fehler bleiben still —
   * ohne die Liste bleibt das Feld verborgen, die Buchung selbst ist davon unberührt.
   */
  private loadFixedCosts(): void {
    this.fixedCostApi.getMonth(this.accountId(), this.month()).subscribe({
      next: (data) => this.fixedCosts.set(data.items),
      error: () => this.fixedCosts.set([]),
    });
  }
}
