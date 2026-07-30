import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { BankAccountApiService } from '../../../../core/services/bank-account-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BankAccount, BankAccountPayload } from '../../../../core/models/bank-account.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { DEFAULT_CURRENCY } from '../../../../shared/utils/money.util';
import { BankAccountCardComponent } from '../bank-account-card/bank-account-card.component';
import { BankAccountFormDialogComponent } from '../bank-account-form-dialog/bank-account-form-dialog.component';

/** Welcher Dialog gerade offen ist. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'form'; account: BankAccount | null }
  | { kind: 'delete'; account: BankAccount };

/**
 * Girokonten-Bereich der Startseite: Gesamtsumme, Kartenraster und die Dialoge
 * zum Anlegen, Bearbeiten und Löschen.
 */
@Component({
  selector: 'app-bank-accounts-section',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BankAccountCardComponent,
    BankAccountFormDialogComponent,
    ConfirmDialogComponent,
    MoneyAmountComponent,
    EmptyStateComponent,
  ],
  template: `
    <section aria-labelledby="bankAccountsHeading">
      <header class="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h2 id="bankAccountsHeading" class="h5 fw-bold mb-1">Girokonten</h2>
          @if (accounts().length > 0) {
            <p class="text-muted small mb-0">
              <span
                >Gesamt über {{ accounts().length }}
                {{ accounts().length === 1 ? 'Konto' : 'Konten' }}:</span
              >
              <app-money-amount
                class="ms-1"
                [amount]="totalBalance()"
                [currency]="totalCurrency()"
                size="sm"
              />
            </p>
          }
        </div>

        <button type="button" class="btn btn-primary" (click)="openCreate()">
          <i class="bi bi-plus-lg me-1" aria-hidden="true"></i> Girokonto hinzufügen
        </button>
      </header>

      @if (loading()) {
        <div class="text-center py-5">
          <span class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Girokonten werden geladen …</span>
          </span>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
          <span class="me-auto">{{ error() }}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">
            Erneut versuchen
          </button>
        </div>
      } @else if (accounts().length === 0) {
        <app-empty-state
          icon="bank2"
          title="Noch kein Girokonto angelegt"
          message="Lege dein erstes Girokonto an, um Kontostände und Buchungen im Blick zu behalten."
        >
          <button type="button" class="btn btn-primary" (click)="openCreate()">
            <i class="bi bi-plus-lg me-1" aria-hidden="true"></i> Erstes Girokonto anlegen
          </button>
        </app-empty-state>
      } @else {
        <ul class="row row-cols-1 row-cols-sm-2 row-cols-xl-3 g-3 list-unstyled mb-0">
          @for (account of accounts(); track account.id) {
            <li class="col">
              <app-bank-account-card
                [account]="account"
                (edit)="openEdit($event)"
                (remove)="openDelete($event)"
              />
            </li>
          }
        </ul>
      }
    </section>

    @if (dialog(); as state) {
      @if (state.kind === 'form') {
        <app-bank-account-form-dialog
          [account]="state.account"
          [saving]="saving()"
          (save)="submitForm($event, state.account)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'delete') {
        <app-confirm-dialog
          title="Girokonto löschen"
          [message]="
            'Soll „' +
            state.account.name +
            '“ wirklich gelöscht werden? Zugehörige Buchungen werden ausgeblendet.'
          "
          confirmLabel="Löschen"
          variant="danger"
          [busy]="saving()"
          (confirmed)="confirmDelete(state.account)"
          (cancelled)="closeDialog()"
        />
      }
    }
  `,
})
export class BankAccountsSectionComponent implements OnInit {
  private readonly bankAccountApi = inject(BankAccountApiService);
  private readonly toastService = inject(ToastService);

  protected readonly accounts = signal<BankAccount[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly dialog = signal<DialogState>({ kind: 'none' });

  /**
   * Summe aller Kontostände. Über Cent gerechnet, damit sich beim Addieren
   * keine Gleitkomma-Ungenauigkeiten sichtbar aufsummieren.
   */
  protected readonly totalBalance = computed(() => {
    const cents = this.accounts().reduce(
      (sum, account) => sum + Math.round(account.currentBalance * 100),
      0,
    );
    return cents / 100;
  });

  /** Solange nur EUR unterstützt wird, ist das die Währung des ersten Kontos. */
  protected readonly totalCurrency = computed(
    () => this.accounts()[0]?.currency ?? DEFAULT_CURRENCY,
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');

    this.bankAccountApi.list().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Die Girokonten konnten nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.dialog.set({ kind: 'form', account: null });
  }

  protected openEdit(account: BankAccount): void {
    this.dialog.set({ kind: 'form', account });
  }

  protected openDelete(account: BankAccount): void {
    this.dialog.set({ kind: 'delete', account });
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialog.set({ kind: 'none' });
  }

  protected submitForm(payload: BankAccountPayload, existing: BankAccount | null): void {
    this.saving.set(true);

    const request$ = existing
      ? this.bankAccountApi.update(existing.id, payload)
      : this.bankAccountApi.create(payload);

    request$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.dialog.set({ kind: 'none' });
        this.upsert(saved, existing !== null);
        this.toastService.success(existing ? 'Girokonto aktualisiert.' : 'Girokonto angelegt.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Das Girokonto konnte nicht gespeichert werden.');
      },
    });
  }

  protected confirmDelete(account: BankAccount): void {
    this.saving.set(true);

    this.bankAccountApi.delete(account.id).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog.set({ kind: 'none' });
        this.accounts.update((list) => list.filter((a) => a.id !== account.id));
        this.toastService.success('Girokonto gelöscht.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Das Girokonto konnte nicht gelöscht werden.');
      },
    });
  }

  /** Fügt ein Konto ein bzw. ersetzt es und hält die alphabetische Sortierung des Backends. */
  private upsert(saved: BankAccount, isUpdate: boolean): void {
    this.accounts.update((list) => {
      const next = isUpdate ? list.map((a) => (a.id === saved.id ? saved : a)) : [...list, saved];
      return next.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    });
  }
}
