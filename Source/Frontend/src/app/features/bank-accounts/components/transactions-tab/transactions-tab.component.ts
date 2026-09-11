import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  Injector,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import { TransactionApiService } from '../../../../core/services/transaction-api.service';
import { BudgetApiService } from '../../../../core/services/budget-api.service';
import { FixedCostApiService } from '../../../../core/services/fixed-cost-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Category } from '../../../../core/models/category.model';
import { FixedCost } from '../../../../core/models/fixed-cost.model';
import {
  LinkedTransaction,
  SortDirection,
  Transaction,
  TransactionFilter,
  TransactionSort,
} from '../../../../core/models/transaction.model';
import { AccountType } from '../../../../core/models/balance.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { formatMoney } from '../../../../shared/utils/money.util';
import { formatMonthLong } from '../../../../shared/utils/month.util';
import { TransactionListComponent } from '../transaction-list/transaction-list.component';
import {
  TransactionFilterChange,
  TransactionFiltersComponent,
} from '../transaction-filters/transaction-filters.component';
import {
  TransactionFormDialogComponent,
  TransactionFormResult,
} from '../transaction-form-dialog/transaction-form-dialog.component';
import { LinkedTransactionDialogComponent } from '../linked-transaction-dialog/linked-transaction-dialog.component';

/** Welcher Dialog gerade offen ist. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'transaction'; transaction: Transaction | null }
  | { kind: 'delete'; transaction: Transaction }
  | { kind: 'settleMonth' }
  /** Die Gegenbuchung von `transaction`, aufgerufen über das Kennzeichen in der Liste. */
  | { kind: 'link'; transaction: Transaction };

/** Wie lange die angesprungene Buchung hervorgehoben bleibt. */
const HIGHLIGHT_DURATION_MS = 2600;

/**
 * Buchungen des gewählten Monats: Ein Request pro Monatswechsel lädt alle Buchungen,
 * Suche, Filter und Sortierung laufen danach clientseitig auf der geladenen Liste.
 * Jede Buchung lässt sich 1-zu-1 mit einer Buchung eines anderen Kontos verknüpfen —
 * etwa die beiden Seiten einer Umbuchung.
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
    LinkedTransactionDialogComponent,
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

          <!-- Auf breiten Displays sitzt die Aktion in der Kopfzeile, mobil
               unten in der Aktionsleiste in Daumenreichweite. -->
          <div class="transactions-actions">
            <button type="button" class="btn btn-primary" (click)="openTransaction(null)">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              <span>Buchung</span>
            </button>
          </div>
        </header>

        <!--
          Die Hinweisleiste erscheint nur, wenn dieser Monat offene Buchungen hat.
          Sie nennt Anzahl und Summe, damit der Sammel-Klick nicht blind erfolgt —
          und steht über der Liste, weil sie sich auf genau diese Liste bezieht.
        -->
        @if (pendingCount() > 0) {
          <div class="pending-bar" role="status">
            <i class="bi bi-hourglass-split pending-bar__icon" aria-hidden="true"></i>
            <p class="pending-bar__text">
              <strong>{{ pendingLabel() }}</strong>
              <span class="pending-bar__note">
                Sie zählen bereits im Kontostand, nicht aber im Stand laut Bank.
              </span>
            </p>
            <button
              type="button"
              class="btn btn-outline-secondary btn-sm pending-bar__action"
              [disabled]="settlingMonth()"
              (click)="openSettleMonth()"
            >
              @if (settlingMonth()) {
                <span
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              }
              <span>Alle als abgebucht</span>
            </button>
          </div>
        }

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
            [settling]="settlingId()"
            [highlighted]="highlightedId()"
            (sortChange)="toggleSort($event)"
            (edit)="openTransaction($event)"
            (remove)="openDelete($event)"
            (settle)="settleOne($event)"
            (openLink)="openLink($event)"
          />
        }
      </div>
    </section>

    <!-- Mobile Aktionsleiste: klebt über der Tab-Bar am unteren Rand und bleibt
         damit erreichbar, ohne die Liste zu verdecken. -->
    <div class="action-bar">
      <button type="button" class="btn btn-primary" (click)="openTransaction(null)">
        <i class="bi bi-plus-lg" aria-hidden="true"></i>
        <span>Buchung erfassen</span>
      </button>
    </div>

    @if (dialog(); as state) {
      @if (state.kind === 'transaction') {
        <app-transaction-form-dialog
          [transaction]="state.transaction"
          [accountId]="accountId()"
          [categories]="categories()"
          [fixedCosts]="fixedCosts()"
          [month]="month()"
          [currency]="currency()"
          [accountType]="accountType()"
          [saving]="saving()"
          [remainingByCategory]="remainingByCategory()"
          (save)="submitTransaction($event, state.transaction)"
          (linkChanged)="onLinkChanged()"
          (jump)="jumpToLinked($event)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'link') {
        <app-linked-transaction-dialog
          [linked]="linked()"
          [loading]="linkLoading()"
          [error]="linkError()"
          [busy]="saving()"
          (jump)="jumpToLinked(linked()!)"
          (unlink)="unlinkFromList(state.transaction)"
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
      } @else if (state.kind === 'settleMonth') {
        <app-confirm-dialog
          title="Alle als abgebucht markieren"
          [message]="settleMonthMessage()"
          confirmLabel="Als abgebucht markieren"
          [busy]="settlingMonth()"
          (confirmed)="confirmSettleMonth()"
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

      /* Die Leiste sitzt zwischen Kopfzeile und Filtern: sie gehört zur Liste,
         soll sie aber nicht überlagern. Auf Mobil bricht die Schaltfläche in eine
         eigene Zeile über die volle Breite, statt auf Icon-Breite zu schrumpfen. */
      .pending-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-2) var(--fin-space-3);
        margin-bottom: var(--fin-space-4);
        padding: var(--fin-space-3) var(--fin-space-4);
        border: 1px solid var(--fin-warn);
        border-radius: var(--fin-radius-md);
        background-color: var(--fin-warn-tint);
        color: var(--fin-text-strong);
      }
      .pending-bar__icon {
        flex-shrink: 0;
        color: var(--fin-warn);
      }
      .pending-bar__text {
        flex: 1 1 12rem;
        margin: 0;
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
      .pending-bar__note {
        display: block;
        color: var(--fin-text-muted);
      }
      .pending-bar__action {
        flex: 1 1 100%;
      }
      @media (min-width: 34rem) {
        .pending-bar__action {
          flex: 0 0 auto;
        }
      }
      .transactions-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
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
  /** Entscheidet, ob eine Buchung überhaupt „noch nicht abgebucht“ sein kann. */
  readonly accountType = input.required<AccountType>();
  /** Noch nicht abgebuchte Buchungen dieses Monats — Bezug der Hinweisleiste. */
  readonly pendingCount = input(0);
  readonly pendingTotal = input(0);

  /**
   * Die Buchung, zu der ein Sprung von ihrer Gegenbuchung geführt hat. Sie wird auf
   * jeden Fall angezeigt — Filter werden dafür zurückgesetzt und die Buchung im
   * bereits geladenen Monat gesucht und hervorgehoben.
   */
  readonly focusTransactionId = input<number | null>(null);

  /** Meldet dem Rahmen, dass die Kennzahlen neu geladen werden müssen. */
  readonly changed = output<void>();
  /** Der Sprung ist angekommen — die Angabe darf aus der URL verschwinden. */
  readonly focusHandled = output<void>();

  private readonly transactionApi = inject(TransactionApiService);
  private readonly budgetApi = inject(BudgetApiService);
  private readonly fixedCostApi = inject(FixedCostApiService);
  private readonly toastService = inject(ToastService);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  /** Alle Buchungen des gewählten Monats, ungefiltert wie vom Server geladen. */
  protected readonly rawTransactions = signal<Transaction[]>([]);
  /** True, sobald der erste Ladevorgang abgeschlossen ist — verhindert eine falsche „Keine Buchungen“-Anzeige vor dem ersten Laden. */
  protected readonly loadedOnce = signal(false);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly dialog = signal<DialogState>({ kind: 'none' });

  /** Die Buchung, deren Abhaken gerade läuft — null, solange nichts läuft. */
  protected readonly settlingId = signal<number | null>(null);
  protected readonly settlingMonth = signal(false);

  /** Die angesprungene Buchung, solange die Hervorhebung läuft. */
  protected readonly highlightedId = signal<number | null>(null);

  /** Die Gegenbuchung für das Popup aus der Liste heraus. */
  protected readonly linked = signal<LinkedTransaction | null>(null);
  protected readonly linkLoading = signal(false);
  protected readonly linkError = signal('');

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
  });

  /** Die geladene Liste, gefiltert und sortiert nach dem aktuellen Filterzustand. */
  protected readonly transactions = computed(() => {
    const filter = this.filter();
    const search = filter.search.trim().toLocaleLowerCase('de');

    const filtered = this.rawTransactions().filter((item) => {
      if (search && !matchesSearch(item, search)) return false;
      if (filter.type !== null && item.type !== filter.type) return false;
      return matchesCategory(item, filter);
    });

    return filtered.sort((a, b) => compareTransactions(a, b, filter.sort, filter.direction));
  });

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

  protected readonly pendingLabel = computed(() => {
    const count = this.pendingCount();
    const label = count === 1 ? 'offene Buchung' : 'offene Buchungen';

    return `${count} ${label} · ${formatMoney(this.pendingTotal(), this.currency())}`;
  });

  protected readonly settleMonthMessage = computed(() => {
    const count = this.pendingCount();
    const label = count === 1 ? 'Buchung' : 'Buchungen';

    return `Sollen alle ${count} noch offenen ${label} im ${this.monthLabel()} als abgebucht markiert werden? Der Kontostand laut Bank sinkt dadurch um ${formatMoney(
      this.pendingTotal(),
      this.currency(),
    )}.`;
  });

  protected readonly resultLabel = computed(() => {
    if (!this.loadedOnce()) return '';

    const count = this.transactions().length;
    if (count === 0) return 'Keine Buchungen';

    return count === 1 ? '1 Buchung' : `${count} Buchungen`;
  });

  constructor() {
    // Beim Monatswechsel wird die Liste komplett neu geladen.
    effect(() => {
      const month = this.month();
      untracked(() => {
        this.filter.update((filter) => ({ ...filter, month }));
        this.load();
        this.loadRemainingBudgets();
        this.loadFixedCosts();
      });
    });

    // Ein Sprung von der Gegenbuchung setzt die Filter zurück: Bliebe ein Filter
    // stehen, könnte er genau die Buchung ausblenden, für die der Sprung gedacht war.
    // Die Buchungen des Monats sind ohnehin bereits geladen (oder werden es durch den
    // Monatswechsel-Effect gerade) — ein eigener Ladevorgang ist dafür nicht nötig.
    effect(() => {
      const focusId = this.focusTransactionId();
      if (focusId === null) return;

      untracked(() => {
        this.filter.update((filter) => ({
          ...filter,
          search: '',
          type: null,
          categoryIds: [],
          includeUncategorized: false,
        }));
        this.resolveFocus();
      });
    });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');

    this.transactionApi.list(this.accountId(), this.month()).subscribe({
      next: (items) => {
        this.rawTransactions.set(items);
        this.loadedOnce.set(true);
        this.loading.set(false);
        this.resolveFocus();
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Die Buchungen konnten nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  protected applyFilter(change: TransactionFilterChange): void {
    this.filter.update((filter) => ({ ...filter, ...change }));
  }

  protected resetFilters(): void {
    this.filter.update((filter) => ({
      ...filter,
      search: '',
      type: null,
      categoryIds: [],
      includeUncategorized: false,
    }));
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
    }));
  }

  /**
   * Sucht die angesprungene Buchung im bereits geladenen Monat und hebt sie hervor.
   * Steht sie (noch) nicht in der aktuell geladenen Liste — etwa weil ein Monatswechsel
   * parallel noch lädt —, bleibt der Versuch folgenlos; `load()` ruft nach dem nächsten
   * Ladevorgang erneut auf.
   */
  private resolveFocus(): void {
    const focusId = this.focusTransactionId();
    if (focusId === null) return;

    const target = this.rawTransactions().some((item) => item.id === focusId);
    if (target) this.highlight(focusId);
  }

  protected openTransaction(transaction: Transaction | null): void {
    this.dialog.set({ kind: 'transaction', transaction });
  }

  /**
   * Öffnet die Gegenbuchung. Sie liegt auf einem anderen Konto und ist deshalb in der
   * Liste nicht enthalten — die Details werden erst beim Öffnen geholt, damit die
   * Monatsliste sie nicht für jede Zeile mitschleppen muss.
   */
  protected openLink(transaction: Transaction): void {
    this.dialog.set({ kind: 'link', transaction });
    this.linked.set(null);
    this.linkError.set('');
    this.linkLoading.set(true);

    this.transactionApi.getLink(this.accountId(), transaction.id).subscribe({
      next: (item) => {
        this.linked.set(item);
        this.linkLoading.set(false);
      },
      error: (err: Error) => {
        this.linkError.set(err.message || 'Die verknüpfte Buchung konnte nicht geladen werden.');
        this.linkLoading.set(false);
      },
    });
  }

  protected openDelete(transaction: Transaction): void {
    this.dialog.set({ kind: 'delete', transaction });
  }

  protected openSettleMonth(): void {
    this.dialog.set({ kind: 'settleMonth' });
  }

  protected closeDialog(): void {
    if (this.saving() || this.settlingMonth()) return;
    this.dialog.set({ kind: 'none' });
  }

  /**
   * Hakt eine einzelne Buchung ab. Die Liste wird danach neu geholt statt lokal
   * umgeschrieben: dieselbe Aktion verschiebt auch den Stand „laut Bank" im Kopf
   * der Seite, und diese Zahlen darf nur der Server bestimmen.
   */
  protected settleOne(transaction: Transaction): void {
    if (this.settlingId() !== null) return;

    this.settlingId.set(transaction.id);

    this.transactionApi.settle(this.accountId(), transaction.id).subscribe({
      next: () => {
        this.settlingId.set(null);
        this.toastService.success(`„${transaction.title}“ ist als abgebucht markiert.`);
        this.load();
        this.changed.emit();
      },
      error: (err: Error) => {
        this.settlingId.set(null);
        this.toastService.error(err.message || 'Die Buchung konnte nicht markiert werden.');
      },
    });
  }

  protected confirmSettleMonth(): void {
    this.settlingMonth.set(true);

    this.transactionApi.settleMonth(this.accountId(), this.month()).subscribe({
      next: (result) => {
        this.settlingMonth.set(false);
        this.dialog.set({ kind: 'none' });
        this.toastService.success(
          result.settledCount === 1
            ? '1 Buchung als abgebucht markiert.'
            : `${result.settledCount} Buchungen als abgebucht markiert.`,
        );

        this.load();
        this.changed.emit();
      },
      error: (err: Error) => {
        this.settlingMonth.set(false);
        this.toastService.error(err.message || 'Die Buchungen konnten nicht markiert werden.');
      },
    });
  }

  protected deleteMessage(transaction: Transaction): string {
    const base = `Soll die Buchung „${transaction.title}“ endgültig gelöscht werden?`;

    return transaction.isLinked
      ? `${base} Die verknüpfte Buchung auf „${transaction.linkedAccountName}“ bleibt bestehen und verliert nur ihre Verknüpfung.`
      : base;
  }

  /** Wechselt zum Konto der verknüpften Buchung und hebt sie dort hervor. */
  protected jumpToLinked(item: LinkedTransaction): void {
    this.dialog.set({ kind: 'none' });

    this.router.navigate(['/girokonten', item.accountId], {
      queryParams: { monat: item.accountingMonth, tab: 'transaktionen', buchung: item.id },
    });
  }

  /** Eine Verknüpfung, die im Erfassungsdialog gesetzt oder gelöst wurde. */
  protected onLinkChanged(): void {
    this.load();
    this.changed.emit();
  }

  protected unlinkFromList(transaction: Transaction): void {
    this.saving.set(true);

    this.transactionApi.unlink(this.accountId(), transaction.id).subscribe({
      next: () => this.finish('Verknüpfung gelöst.'),
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Die Verknüpfung konnte nicht gelöst werden.');
      },
    });
  }

  protected submitTransaction(result: TransactionFormResult, existing: Transaction | null): void {
    this.saving.set(true);

    const request$ = existing
      ? this.transactionApi.update(this.accountId(), existing.id, result.payload)
      : this.transactionApi.create(this.accountId(), result.payload);

    request$.subscribe({
      next: (saved) => {
        // Beim Anlegen gibt es die Buchung erst jetzt — die vorgemerkte Verknüpfung
        // lässt sich deshalb erst im Anschluss setzen.
        if (result.linkTo !== null) {
          this.linkAfterCreate(saved.id, result.linkTo);
          return;
        }

        this.finish(existing ? 'Buchung aktualisiert.' : 'Buchung erfasst.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Die Buchung konnte nicht gespeichert werden.');
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
   * Setzt die vorgemerkte Verknüpfung nach dem Anlegen. Schlägt sie fehl, ist die
   * Buchung trotzdem gespeichert — das wird auch so gemeldet, statt einen Fehlschlag
   * zu behaupten, der die erfasste Buchung in Frage stellen würde.
   */
  private linkAfterCreate(transactionId: number, counterTransactionId: number): void {
    this.transactionApi.link(this.accountId(), transactionId, counterTransactionId).subscribe({
      next: () => this.finish('Buchung erfasst und verknüpft.'),
      error: (err: Error) => {
        this.finish('Buchung erfasst.');
        this.toastService.error(
          err.message || 'Die Buchung wurde erfasst, ließ sich aber nicht verknüpfen.',
        );
      },
    });
  }

  /**
   * Hebt die angesprungene Buchung hervor und rollt sie ins Bild. Die Hervorhebung
   * endet nach kurzer Zeit von selbst: Sie beantwortet die Frage „wo bin ich gelandet“
   * und wäre danach nur noch eine Markierung ohne Bedeutung.
   */
  private highlight(transactionId: number): void {
    this.highlightedId.set(transactionId);
    this.focusHandled.emit();

    afterNextRender(
      () => {
        this.document
          .getElementById(`tx-${transactionId}`)
          ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      },
      { injector: this.injector },
    );

    setTimeout(() => {
      if (this.highlightedId() === transactionId) this.highlightedId.set(null);
    }, HIGHLIGHT_DURATION_MS);
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

/** Case-insensitive Volltextsuche über Bezeichnung und Notiz. */
function matchesSearch(item: Transaction, search: string): boolean {
  const haystack = `${item.title} ${item.note ?? ''}`.toLocaleLowerCase('de');
  return haystack.includes(search);
}

/**
 * Kategorie-Filter: Ist sowohl eine Kategorie als auch „Ohne Kategorie“ gewählt, zählt
 * eine passende Kategorie oder das Fehlen einer Kategorie. Die Filterleiste selbst
 * erlaubt aktuell nur eine der beiden Auswahlen gleichzeitig — die Kombination bleibt
 * hier trotzdem korrekt behandelt.
 */
function matchesCategory(item: Transaction, filter: TransactionFilter): boolean {
  const { categoryIds, includeUncategorized } = filter;

  if (categoryIds.length > 0 && includeUncategorized)
    return item.categoryId === null || categoryIds.includes(item.categoryId);

  if (categoryIds.length > 0) return item.categoryId !== null && categoryIds.includes(item.categoryId);

  if (includeUncategorized) return item.categoryId === null;

  return true;
}

/**
 * Vergleicht zwei Buchungen nach dem gewählten Kriterium, mit der Id als stabilem
 * Tie-Breaker in derselben Richtung — spiegelt die bisherige Server-Sortierung.
 */
function compareTransactions(
  a: Transaction,
  b: Transaction,
  sort: TransactionSort,
  direction: SortDirection,
): number {
  const factor = direction === 'Ascending' ? 1 : -1;
  const primary = comparePrimary(a, b, sort, factor);

  return primary !== 0 ? primary : (a.id - b.id) * factor;
}

function comparePrimary(a: Transaction, b: Transaction, sort: TransactionSort, factor: number): number {
  switch (sort) {
    case 'Amount':
      return (a.amount - b.amount) * factor;
    case 'Title':
      return a.title.localeCompare(b.title, 'de', { sensitivity: 'base' }) * factor;
    case 'Category':
      return compareCategory(a, b, factor);
    default:
      return (a.bookingDate < b.bookingDate ? -1 : a.bookingDate > b.bookingDate ? 1 : 0) * factor;
  }
}

/** Buchungen ohne Kategorie landen unabhängig von der Sortierrichtung immer am Ende. */
function compareCategory(a: Transaction, b: Transaction, factor: number): number {
  if (a.categoryName === null && b.categoryName === null) return 0;
  if (a.categoryName === null) return 1;
  if (b.categoryName === null) return -1;

  return a.categoryName.localeCompare(b.categoryName, 'de', { sensitivity: 'base' }) * factor;
}
