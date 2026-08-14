import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BankAccountApiService } from '../../../../core/services/bank-account-api.service';
import { TransactionApiService } from '../../../../core/services/transaction-api.service';
import { BankAccount } from '../../../../core/models/bank-account.model';
import { LinkedTransaction, TransactionType } from '../../../../core/models/transaction.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { formatMoney } from '../../../../shared/utils/money.util';
import { formatDate, formatMonthLong } from '../../../../shared/utils/month.util';

/** Wartezeit, bevor eine Eingabe zur Suche wird — hält die Tipp-Eingabe flüssig. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Wählt die Gegenbuchung für eine Verknüpfung aus. Erst das Konto, dann die Buchung:
 * Eine Verknüpfung verbindet immer zwei verschiedene Konten, und mit dem Konto steht
 * fest, in welcher Liste überhaupt gesucht wird.
 *
 * Angeboten werden nur Buchungen, die das Backend auch annehmen würde — Gegenrichtung,
 * gleicher Betrag, noch nicht verknüpft. Eine Auswahl, die anschließend am Server
 * scheitert, wäre für den Nutzer nicht nachvollziehbar.
 */
@Component({
  selector: 'app-link-transaction-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ModalDialogComponent,
    MoneyAmountComponent,
    CategoryBadgeComponent,
    EmptyStateComponent,
  ],
  template: `
    <app-modal-dialog title="Buchung verknüpfen" size="lg" (closed)="cancelled.emit()">
      <p class="link-intro">
        Gesucht wird die Gegenbuchung zu
        <strong>{{ ownLabel() }}</strong>
        auf einem anderen Konto.
      </p>

      <div class="link-picker">
        <div>
          <label for="linkAccount" class="form-label">Konto</label>
          @if (accountsLoading()) {
            <div class="form-control d-flex align-items-center gap-2 text-muted">
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              Konten werden geladen …
            </div>
          } @else if (selectableAccounts().length === 0) {
            <p class="alert alert-info mb-0">
              Zum Verknüpfen brauchst du ein zweites Konto in derselben Währung.
            </p>
          } @else {
            <select
              id="linkAccount"
              class="form-select"
              [value]="counterAccountId() ?? ''"
              [disabled]="saving()"
              (change)="selectAccount($event)"
            >
              <option value="">Bitte wählen</option>
              @for (account of selectableAccounts(); track account.id) {
                <option [value]="account.id">{{ account.name }}</option>
              }
            </select>
          }
        </div>

        @if (counterAccountId() !== null) {
          <div>
            <label for="linkSearch" class="form-label">Buchung suchen</label>
            <input
              type="search"
              id="linkSearch"
              class="form-control"
              placeholder="Bezeichnung oder Notiz"
              autocomplete="off"
              [value]="search()"
              [disabled]="saving()"
              (input)="onSearch($event)"
            />
          </div>
        }
      </div>

      @if (counterAccountId() === null) {
        @if (!accountsLoading() && selectableAccounts().length > 0) {
          <app-empty-state
            icon="bank"
            title="Konto wählen"
            message="Wähle zuerst das Konto, auf dem die Gegenbuchung liegt."
          />
        }
      } @else if (loading()) {
        <div class="link-loading" role="status">
          <span class="spinner-border" aria-hidden="true"></span>
          <span class="visually-hidden">Buchungen werden geladen …</span>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger mb-0" role="alert">{{ error() }}</div>
      } @else if (candidates().length === 0) {
        <app-empty-state icon="search" title="Keine passende Buchung" [message]="emptyMessage()" />
      } @else {
        <ul class="fin-rows link-list">
          @for (candidate of candidates(); track candidate.id) {
            <li class="fin-row link-row">
              <button
                type="button"
                class="link-row__button"
                [disabled]="saving()"
                (click)="selected.emit(candidate)"
              >
                <span class="link-row__text">
                  <span class="link-row__title fin-truncate">{{ candidate.title }}</span>
                  <span class="link-row__meta">{{ meta(candidate) }}</span>
                </span>

                @if (candidate.categoryName) {
                  <app-category-badge
                    class="link-row__category"
                    [name]="candidate.categoryName"
                    [color]="candidate.categoryColor"
                    [icon]="candidate.categoryIcon"
                  />
                }

                <app-money-amount
                  size="sm"
                  [amount]="candidate.amount"
                  [currency]="candidate.currency"
                  [tone]="candidate.type === 'Income' ? 'income' : 'expense'"
                />
              </button>
            </li>
          }
        </ul>

        <p class="link-hint mb-0">
          Angezeigt werden nur betragsgleiche, noch nicht verknüpfte
          {{ wantedTypeLabel() }} dieses Kontos — aus allen Monaten.
        </p>
      }

      <div dialogFooter class="fin-dialog-actions">
        <button
          type="button"
          class="btn btn-light"
          [disabled]="saving()"
          (click)="cancelled.emit()"
        >
          Abbrechen
        </button>
      </div>
    </app-modal-dialog>
  `,
  styles: [
    `
      .link-intro {
        margin-bottom: var(--fin-space-4);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
      .link-intro strong {
        color: var(--fin-text-strong);
        white-space: nowrap;
      }

      /* Konto und Suche stehen auf dem Smartphone untereinander, ab 34rem
         nebeneinander — die Suche braucht dann noch genug Breite für eine
         Bezeichnung. */
      .link-picker {
        display: grid;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-4);
      }
      @media (min-width: 34rem) {
        .link-picker {
          grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        }
      }

      .link-loading {
        display: flex;
        justify-content: center;
        padding: var(--fin-space-6) 0;
        color: var(--fin-accent);
      }

      .link-row {
        padding: 0;
      }
      /* Die gesamte Zeile ist die Schaltfläche — dieselbe großzügige Trefferfläche
         wie beim Zuordnen einer Fixkosten-Buchung. */
      .link-row__button {
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
      .link-row__button:hover:not(:disabled) {
        background-color: var(--fin-surface-hover);
      }
      .link-row__button:disabled {
        cursor: default;
        opacity: 0.6;
      }
      .link-row__text {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .link-row__title {
        font-weight: 550;
      }
      .link-row__meta {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-xs);
      }
      /* Auf schmalen Displays weicht die Kategorie dem Betrag. */
      .link-row__category {
        display: none;
        min-width: 0;
        font-size: var(--fin-text-sm);
      }
      @media (min-width: 34rem) {
        .link-row__category {
          display: inline-flex;
          flex: 0 1 9rem;
        }
      }

      .link-hint {
        margin-top: var(--fin-space-3);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
    `,
  ],
})
export class LinkTransactionDialogComponent implements OnInit {
  /** Das geöffnete Konto — es scheidet als Gegenkonto aus. */
  readonly accountId = input.required<number>();
  readonly currency = input.required<string>();
  /** Richtung der eigenen Seite; gesucht wird jeweils die Gegenrichtung. */
  readonly type = input.required<TransactionType>();
  /** Betrag der eigenen Seite; nur betragsgleiche Buchungen kommen in Frage. */
  readonly amount = input.required<number>();
  /** Die eigene Buchung beim Bearbeiten — sie kann nie ihr eigener Kandidat sein. */
  readonly ownTransactionId = input<number | null>(null);
  /** Läuft das Verknüpfen gerade, bleibt die Liste stehen, aber gesperrt. */
  readonly saving = input(false);

  readonly selected = output<LinkedTransaction>();
  readonly cancelled = output<void>();

  private readonly bankAccountApi = inject(BankAccountApiService);
  private readonly transactionApi = inject(TransactionApiService);

  protected readonly accounts = signal<BankAccount[]>([]);
  protected readonly accountsLoading = signal(true);

  protected readonly counterAccountId = signal<number | null>(null);
  protected readonly search = signal('');

  protected readonly candidates = signal<LinkedTransaction[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  /** Entkoppelt die Tastatureingabe von der Abfrage. */
  private readonly searchInput = new Subject<string>();

  /** Nur eigene Konten in derselben Währung — andere lehnt das Backend ohnehin ab. */
  protected readonly selectableAccounts = computed(() =>
    this.accounts().filter(
      (account) => account.id !== this.accountId() && account.currency === this.currency(),
    ),
  );

  protected readonly wantedTypeLabel = computed(() =>
    this.type() === 'Expense' ? 'Einnahmen' : 'Ausgaben',
  );

  protected readonly ownLabel = computed(
    () =>
      `${this.type() === 'Expense' ? 'Ausgabe' : 'Einnahme'} über ${formatMoney(
        this.amount(),
        this.currency(),
      )}`,
  );

  protected readonly emptyMessage = computed(() =>
    this.search()
      ? `Zu dieser Suche gibt es auf dem gewählten Konto keine passende Buchung. Prüfe die Schreibweise oder wähle ein anderes Konto.`
      : `Auf dem gewählten Konto gibt es keine noch freie ${
          this.type() === 'Expense' ? 'Einnahme' : 'Ausgabe'
        } über ${formatMoney(this.amount(), this.currency())}. Erfasse sie dort zuerst.`,
  );

  constructor() {
    this.searchInput
      .pipe(debounceTime(SEARCH_DEBOUNCE_MS), distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((value) => {
        this.search.set(value);
      });

    // Kontowechsel und Suchbegriff führen beide zur selben Abfrage.
    effect(() => {
      const counterAccountId = this.counterAccountId();
      const search = this.search();

      if (counterAccountId === null) {
        this.candidates.set([]);
        return;
      }

      this.loadCandidates(counterAccountId, search);
    });
  }

  ngOnInit(): void {
    this.bankAccountApi.list().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.accountsLoading.set(false);
      },
      error: () => {
        this.accounts.set([]);
        this.accountsLoading.set(false);
        this.error.set('Die Konten konnten nicht geladen werden.');
      },
    });
  }

  protected selectAccount(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    // Der Suchbegriff gehört zum vorigen Konto und würde die neue Liste sonst
    // ohne sichtbaren Grund leer wirken lassen.
    this.search.set('');
    this.counterAccountId.set(value ? Number(value) : null);
  }

  protected onSearch(event: Event): void {
    this.searchInput.next((event.target as HTMLInputElement).value);
  }

  protected meta(candidate: LinkedTransaction): string {
    return `${formatDate(candidate.bookingDate)} · Abrechnung ${formatMonthLong(
      candidate.accountingMonth,
    )}`;
  }

  private loadCandidates(counterAccountId: number, search: string): void {
    this.loading.set(true);
    this.error.set('');

    this.transactionApi
      .linkCandidates(this.accountId(), {
        counterAccountId,
        type: this.type(),
        amount: this.amount(),
        search,
        excludeTransactionId: this.ownTransactionId(),
      })
      .subscribe({
        next: (items) => {
          this.candidates.set(items);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.candidates.set([]);
          this.error.set(err.message || 'Die Buchungen konnten nicht geladen werden.');
          this.loading.set(false);
        },
      });
  }
}
