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
import { ToastService } from '../../../../core/services/toast.service';
import { Category } from '../../../../core/models/category.model';
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
    <section class="card border-0 shadow-sm surface-card" aria-labelledby="transactionsHeading">
      <div class="card-body p-3 p-sm-4">
        <header class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
          <div>
            <h2 id="transactionsHeading" class="h6 fw-bold mb-1">
              Buchungen im {{ monthLabel() }}
            </h2>
            <p class="text-muted small mb-0" aria-live="polite">{{ resultLabel() }}</p>
          </div>

          <!-- Auf breiten Displays sitzen die Aktionen in der Kopfzeile, mobil unten in Daumenreichweite. -->
          <div class="d-none d-sm-flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline-secondary" (click)="openTransfer(null)">
              <i class="bi bi-arrow-left-right me-1" aria-hidden="true"></i> Überweisung
            </button>
            <button type="button" class="btn btn-primary" (click)="openTransaction(null)">
              <i class="bi bi-plus-lg me-1" aria-hidden="true"></i> Buchung
            </button>
          </div>
        </header>

        <app-transaction-filters
          class="d-block mb-3"
          [categories]="categories()"
          [search]="filter().search"
          [type]="filter().type"
          [categoryIds]="filter().categoryIds"
          [includeUncategorized]="filter().includeUncategorized"
          (filterChange)="applyFilter($event)"
          (reset)="resetFilters()"
        />

        @if (loading()) {
          <div class="text-center py-5">
            <span class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Buchungen werden geladen …</span>
            </span>
          </div>
        } @else if (error()) {
          <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
            <span class="me-auto">{{ error() }}</span>
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
            <nav
              class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3"
              aria-label="Seiten"
            >
              <span class="text-muted small">Seite {{ filter().page }} von {{ totalPages() }}</span>
              <div class="btn-group">
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  [disabled]="filter().page <= 1"
                  (click)="goToPage(filter().page - 1)"
                >
                  <i class="bi bi-chevron-left me-1" aria-hidden="true"></i> Zurück
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  [disabled]="filter().page >= totalPages()"
                  (click)="goToPage(filter().page + 1)"
                >
                  Weiter <i class="bi bi-chevron-right ms-1" aria-hidden="true"></i>
                </button>
              </div>
            </nav>
          }
        }
      </div>
    </section>

    <!-- Mobile Aktionsleiste: immer erreichbar, ohne die Liste zu verdecken. -->
    <div class="action-bar d-sm-none">
      <button
        type="button"
        class="btn btn-outline-secondary flex-grow-1"
        (click)="openTransfer(null)"
      >
        <i class="bi bi-arrow-left-right me-1" aria-hidden="true"></i> Überweisung
      </button>
      <button type="button" class="btn btn-primary flex-grow-1" (click)="openTransaction(null)">
        <i class="bi bi-plus-lg me-1" aria-hidden="true"></i> Buchung
      </button>
    </div>

    @if (dialog(); as state) {
      @if (state.kind === 'transaction') {
        <app-transaction-form-dialog
          [transaction]="state.transaction"
          [categories]="categories()"
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
      .surface-card {
        border-radius: 1rem;
        background-color: var(--color-surface);
      }
      .action-bar {
        position: sticky;
        /* Abstand zum unteren Rand, damit die Leiste nicht unter Systemleisten rutscht. */
        bottom: calc(0.75rem + env(safe-area-inset-bottom));
        z-index: 1020;
        display: flex;
        gap: 0.5rem;
        margin-top: 0.75rem;
        padding: 0.5rem;
        border-radius: 1rem;
        background-color: var(--color-surface);
        box-shadow: var(--bs-box-shadow);
      }
      .action-bar .btn {
        min-height: 2.75rem;
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
  private readonly toastService = inject(ToastService);

  protected readonly result = signal<PagedResult<Transaction> | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly dialog = signal<DialogState>({ kind: 'none' });

  /** Restbudget je Kategorie — nur für den Hinweis im Erfassungsdialog. */
  protected readonly remainingByCategory = signal<ReadonlyMap<number, number>>(new Map());

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
}
