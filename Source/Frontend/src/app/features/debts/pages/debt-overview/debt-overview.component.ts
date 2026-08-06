import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';
import { DebtApiService } from '../../../../core/services/debt-api.service';
import { BankAccountApiService } from '../../../../core/services/bank-account-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BankAccount } from '../../../../core/models/bank-account.model';
import {
  Debt,
  DebtOverview,
  DebtPayload,
  DebtTransaction,
} from '../../../../core/models/debt.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { StatTileComponent } from '../../../../shared/components/stat-tile/stat-tile.component';
import {
  DebtTransactionEvent,
  DebtorGroupComponent,
} from '../../components/debtor-group/debtor-group.component';
import { DebtFormDialogComponent } from '../../components/debt-form-dialog/debt-form-dialog.component';
import { AssignDebtTransactionDialogComponent } from '../../components/assign-debt-transaction-dialog/assign-debt-transaction-dialog.component';

/** Welcher Dialog gerade offen ist. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'form'; debt: Debt | null }
  | { kind: 'delete'; debt: Debt }
  | { kind: 'assign'; debt: Debt };

/** Wartezeit, bevor eine Sucheingabe zur API geht. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Die Schuldnerliste: Geld, das der Nutzer anderen geliehen hat, gruppiert nach Person.
 * Ein Eintrag trägt keinen eigenen Betrag — was offen ist, ergibt sich aus den
 * zugeordneten Buchungen der Geldkonten und ist damit immer belegt.
 */
@Component({
  selector: 'app-debt-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ConfirmDialogComponent,
    EmptyStateComponent,
    StatTileComponent,
    DebtorGroupComponent,
    DebtFormDialogComponent,
    AssignDebtTransactionDialogComponent,
  ],
  template: `
    <div class="container">
      <header class="fin-page-header">
        <div class="fin-page-header__text">
          <span class="fin-eyebrow">Forderungen</span>
          <h1 class="fin-page-header__title">Schuldner</h1>
          <p class="fin-page-header__subtitle">
            Wem du Geld geliehen hast — und wie viel davon noch offen ist.
          </p>
        </div>

        <div class="fin-page-header__actions">
          <button type="button" class="btn btn-primary" (click)="openCreate()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            <span>Eintrag</span>
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="fin-panel debts-skeleton" role="status" aria-label="Schuldner werden geladen">
          <div class="fin-skeleton fin-skeleton--title"></div>
          <div class="fin-skeleton fin-skeleton--line"></div>
          <div class="fin-skeleton fin-skeleton--line"></div>
          <div class="fin-skeleton fin-skeleton--line-short"></div>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger debts-error" role="alert">
          <span>{{ error() }}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">
            Erneut versuchen
          </button>
        </div>
      } @else if (data(); as overview) {
        @if (overview.debtCount > 0) {
          <section class="fin-section" aria-labelledby="debtTotalsHeading">
            <h2 id="debtTotalsHeading" class="visually-hidden">Summen</h2>

            <div class="fin-grid fin-grid--stats">
              <app-stat-tile
                label="Offene Forderungen"
                icon="hourglass-split"
                [amount]="overview.totalOutstanding"
                [currency]="overview.currency"
                [hint]="outstandingHint()"
              />
              <app-stat-tile
                label="Verliehen"
                icon="arrow-up-right"
                [amount]="overview.totalLent"
                [currency]="overview.currency"
                hint="Summe aller zugeordneten Ausgaben."
              />
              <app-stat-tile
                label="Zurückbekommen"
                icon="arrow-down-left"
                [amount]="overview.totalRepaid"
                [currency]="overview.currency"
                hint="Summe aller zugeordneten Einnahmen."
              />
            </div>
          </section>
        }

        <section class="fin-section" aria-labelledby="debtListHeading">
          <div class="fin-section-header">
            <h2 id="debtListHeading" class="h5 mb-0">Einträge</h2>
            @if (overview.debtCount > 0) {
              <p class="debts-subtitle mb-0">{{ listSubtitle() }}</p>
            }
          </div>

          @if (overview.debtors.length === 0) {
            <app-empty-state
              icon="people"
              title="Noch niemand schuldet dir Geld"
              message="Lege einen Eintrag an und verknüpfe die Buchung, mit der du das Geld verliehen hast. Danach siehst du hier jederzeit, wer dir noch wie viel schuldet."
            >
              <button type="button" class="btn btn-primary" (click)="openCreate()">
                Ersten Eintrag anlegen
              </button>
            </app-empty-state>
          } @else {
            <div class="debts-list">
              @for (debtor of overview.debtors; track debtor.personName) {
                <app-debtor-group
                  [debtor]="debtor"
                  (edit)="openEdit($event)"
                  (remove)="openDelete($event)"
                  (assign)="openAssign($event)"
                  (unlink)="unlinkTransaction($event)"
                />
              }
            </div>
          }
        </section>
      }
    </div>

    @if (dialog(); as state) {
      @if (state.kind === 'form') {
        <app-debt-form-dialog
          [debt]="state.debt"
          [knownPersons]="knownPersons()"
          [saving]="saving()"
          (save)="submitForm($event, state.debt)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'delete') {
        <app-confirm-dialog
          title="Eintrag löschen"
          [message]="deleteMessage(state.debt)"
          confirmLabel="Löschen"
          variant="danger"
          [busy]="saving()"
          (confirmed)="confirmDelete(state.debt)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'assign') {
        <app-assign-debt-transaction-dialog
          [debt]="state.debt"
          [transactions]="assignable()"
          [accounts]="accounts()"
          [loading]="assignableLoading()"
          [error]="assignableError()"
          [saving]="saving()"
          (searchChange)="searchAssignable($event)"
          (accountChange)="filterAssignable($event)"
          (assign)="confirmAssign(state.debt, $event)"
          (cancelled)="closeDialog()"
        />
      }
    }
  `,
  styles: [
    `
      .debts-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }
      .debts-subtitle {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .debts-list {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-4);
      }
      .debts-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-3);
        padding: var(--fin-space-5);
      }
    `,
  ],
})
export class DebtOverviewComponent {
  private readonly debtApi = inject(DebtApiService);
  private readonly bankAccountApi = inject(BankAccountApiService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly data = signal<DebtOverview | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly dialog = signal<DialogState>({ kind: 'none' });

  protected readonly accounts = signal<BankAccount[]>([]);

  protected readonly assignable = signal<DebtTransaction[]>([]);
  protected readonly assignableLoading = signal(false);
  protected readonly assignableError = signal('');

  /** Kontofilter des Zuordnungs-Dialogs; `null` heißt „alle Konten“. */
  private readonly assignAccountId = signal<number | null>(null);
  private assignSearchTerm = '';

  /** Sucheingaben laufen gebündelt zur API, statt bei jedem Tastendruck. */
  private readonly assignSearch = new Subject<string>();

  protected readonly knownPersons = computed(() =>
    (this.data()?.debtors ?? []).map((debtor) => debtor.personName),
  );

  protected readonly outstandingHint = computed(() => {
    const overview = this.data();
    if (!overview) return '';

    if (overview.openCount === 0) {
      return 'Alle Einträge sind beglichen.';
    }

    const entries =
      overview.openCount === 1 ? '1 Eintrag ist offen' : `${overview.openCount} Einträge sind offen`;
    const people =
      overview.debtorCount === 1 ? '1 Person' : `${overview.debtorCount} Personen`;

    return `${entries} · ${people} insgesamt.`;
  });

  protected readonly listSubtitle = computed(() => {
    const overview = this.data();
    if (!overview) return '';

    const entries = overview.debtCount === 1 ? '1 Eintrag' : `${overview.debtCount} Einträge`;
    const people = overview.debtorCount === 1 ? '1 Person' : `${overview.debtorCount} Personen`;

    return `${entries} bei ${people}`;
  });

  constructor() {
    this.load();
    this.loadAccounts();

    // Der Fehler wird innerhalb von switchMap behandelt: liefe er nach außen, wäre der
    // Strom beendet und jede weitere Sucheingabe bliebe wirkungslos.
    this.assignSearch
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        switchMap((search) => {
          const state = this.dialog();
          const debtId = state.kind === 'assign' ? state.debt.id : 0;

          this.assignableLoading.set(true);
          this.assignableError.set('');

          return this.debtApi
            .getAssignableTransactions(debtId, search, this.assignAccountId())
            .pipe(
              catchError((err: Error) => {
                this.assignableError.set(
                  err.message || 'Die Buchungen konnten nicht geladen werden.',
                );
                this.assignableLoading.set(false);
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((items) => {
        this.assignable.set(items);
        this.assignableLoading.set(false);
      });
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');

    this.debtApi.getOverview().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Die Schuldnerliste konnte nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.dialog.set({ kind: 'form', debt: null });
  }

  protected openEdit(debt: Debt): void {
    this.dialog.set({ kind: 'form', debt });
  }

  protected openDelete(debt: Debt): void {
    this.dialog.set({ kind: 'delete', debt });
  }

  protected openAssign(debt: Debt): void {
    this.dialog.set({ kind: 'assign', debt });
    this.assignable.set([]);
    this.assignAccountId.set(null);
    this.assignSearchTerm = '';
    this.loadAssignable(debt.id);
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialog.set({ kind: 'none' });
  }

  protected deleteMessage(debt: Debt): string {
    const base = `Soll der Eintrag „${debt.title}“ von ${debt.personName} gelöscht werden?`;

    if (debt.transactionCount === 0) return base;

    const count = debt.transactionCount;
    return (
      `${base} ${count} zugeordnete ${count === 1 ? 'Buchung bleibt' : 'Buchungen bleiben'} erhalten ` +
      `und ${count === 1 ? 'verliert' : 'verlieren'} nur die Zuordnung.`
    );
  }

  protected submitForm(payload: DebtPayload, existing: Debt | null): void {
    this.saving.set(true);

    const request$ = existing
      ? this.debtApi.update(existing.id, payload)
      : this.debtApi.create(payload);

    request$.subscribe({
      next: () => this.finish(existing ? 'Eintrag aktualisiert.' : 'Eintrag angelegt.'),
      error: (err: Error) => this.fail(err, 'Der Eintrag konnte nicht gespeichert werden.'),
    });
  }

  protected confirmDelete(debt: Debt): void {
    this.saving.set(true);

    this.debtApi.delete(debt.id).subscribe({
      next: () => this.finish('Eintrag gelöscht.'),
      error: (err: Error) => this.fail(err, 'Der Eintrag konnte nicht gelöscht werden.'),
    });
  }

  protected confirmAssign(debt: Debt, transactionId: number): void {
    this.saving.set(true);

    this.debtApi.linkTransaction(debt.id, transactionId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.finish('Buchung zugeordnet.', false);
      },
      error: (err: Error) => this.fail(err, 'Die Buchung konnte nicht zugeordnet werden.'),
    });
  }

  protected unlinkTransaction(event: DebtTransactionEvent): void {
    this.debtApi.unlinkTransaction(event.debt.id, event.transactionId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.toastService.success('Zuordnung gelöst.');
      },
      error: (err: Error) =>
        this.toastService.error(err.message || 'Die Zuordnung konnte nicht gelöst werden.'),
    });
  }

  protected searchAssignable(search: string): void {
    this.assignSearchTerm = search;
    this.assignSearch.next(search);
  }

  protected filterAssignable(accountId: number | null): void {
    this.assignAccountId.set(accountId);

    const state = this.dialog();
    if (state.kind !== 'assign') return;

    // Ein Kontowechsel ist eine bewusste Auswahl und lädt sofort, ohne Verzögerung.
    this.loadAssignable(state.debt.id);
  }

  private loadAssignable(debtId: number): void {
    this.assignableLoading.set(true);
    this.assignableError.set('');

    this.debtApi
      .getAssignableTransactions(debtId, this.assignSearchTerm, this.assignAccountId())
      .subscribe({
        next: (items) => {
          this.assignable.set(items);
          this.assignableLoading.set(false);
        },
        error: (err: Error) => {
          this.assignableError.set(err.message || 'Die Buchungen konnten nicht geladen werden.');
          this.assignableLoading.set(false);
        },
      });
  }

  /**
   * Die Konten dienen nur dem Filter im Zuordnungs-Dialog. Ein Fehler bleibt hier
   * stumm: die Seite funktioniert auch ohne Filter vollständig.
   */
  private loadAccounts(): void {
    this.bankAccountApi.list().subscribe({
      next: (accounts) => this.accounts.set(accounts),
      error: () => this.accounts.set([]),
    });
  }

  /**
   * @param reload Ob die Übersicht neu geladen werden muss. Endpunkte, die den Stand
   * bereits zurückgeben, sparen den zweiten Aufruf.
   */
  private finish(message: string, reload = true): void {
    this.saving.set(false);
    this.dialog.set({ kind: 'none' });
    this.toastService.success(message);

    if (reload) this.load();
  }

  private fail(err: Error, fallback: string): void {
    this.saving.set(false);
    this.toastService.error(err.message || fallback);
  }
}
