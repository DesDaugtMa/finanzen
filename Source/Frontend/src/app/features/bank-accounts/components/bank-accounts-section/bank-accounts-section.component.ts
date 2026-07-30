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
    <section class="fin-section" aria-labelledby="bankAccountsHeading">
      <header class="fin-section-header">
        <div>
          <span class="fin-eyebrow">Deine Konten</span>
          <h2 id="bankAccountsHeading" class="accounts-title">Girokonten</h2>
        </div>

        <button type="button" class="btn btn-primary" (click)="openCreate()">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          <span>Girokonto</span>
        </button>
      </header>

      @if (loading()) {
        <!--
          Skelett statt Spinner: es zeigt bereits die Form der kommenden Karten,
          die Seite springt beim Eintreffen der Daten nicht, und die Wartezeit
          wirkt kürzer, weil Struktur sichtbar ist.
        -->
        <div class="fin-grid fin-grid--cards" role="status" aria-label="Girokonten werden geladen">
          @for (placeholder of skeletonSlots; track $index) {
            <div class="fin-panel account-skeleton">
              <div class="account-skeleton__head">
                <div class="fin-skeleton fin-skeleton--circle"></div>
                <div class="account-skeleton__lines">
                  <div class="fin-skeleton fin-skeleton--title"></div>
                  <div class="fin-skeleton fin-skeleton--line-short"></div>
                </div>
              </div>
              <div class="fin-skeleton fin-skeleton--amount"></div>
            </div>
          }
        </div>
      } @else if (error()) {
        <div class="alert alert-danger accounts-error" role="alert">
          <span>{{ error() }}</span>
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
          <button type="button" class="btn btn-primary btn-lg" (click)="openCreate()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            <span>Erstes Girokonto anlegen</span>
          </button>
        </app-empty-state>
      } @else {
        <!-- Gesamtsumme als eigene Markenfläche über dem Raster: die wichtigste
             Zahl der Startseite bekommt den prominentesten Platz. -->
        <div class="fin-brand-surface accounts-total">
          <span class="accounts-total__label">Gesamtvermögen</span>
          <app-money-amount
            class="accounts-total__value"
            [amount]="totalBalance()"
            [currency]="totalCurrency()"
            size="lg"
          />
          <span class="accounts-total__hint">
            über {{ accounts().length }} {{ accounts().length === 1 ? 'Konto' : 'Konten' }}
          </span>
        </div>

        <ul class="fin-grid fin-grid--cards fin-stagger accounts-list">
          @for (account of accounts(); track account.id) {
            <li>
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
  styles: [
    `
      .accounts-title {
        margin: 0;
        font-size: var(--fin-text-xl);
      }
      .accounts-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }
      .accounts-total {
        padding: var(--fin-space-5);
        margin-bottom: var(--fin-space-4);
        /* Auf der dunklen Markenfläche brauchen die Geldfarben aufgehellte
           Varianten, sonst reicht der Kontrast eines negativen Saldos nicht.
           Custom Properties durchdringen die View-Encapsulation und erreichen
           damit das eingebettete app-money-amount. */
        --fin-expense: #ffb3a1;
        --fin-income: #9fe6bf;
      }
      @media (min-width: 34rem) {
        .accounts-total {
          padding: var(--fin-space-6) var(--fin-space-8);
        }
      }
      .accounts-total__label {
        display: block;
        color: rgba(255, 255, 255, 0.72);
        font-size: var(--fin-text-2xs);
        font-weight: 650;
        letter-spacing: var(--fin-tracking-wider);
        text-transform: uppercase;
      }
      .accounts-total__value {
        display: block;
        margin-top: var(--fin-space-2);
        /* Auf der dunklen Markenfläche muss der Betrag weiß bleiben — die
           Vorzeichenfarbe aus app-money-amount würde hier zu wenig Kontrast
           haben. Das Vorzeichen selbst bleibt erhalten. */
        color: #fff;
        font-size: var(--fin-text-3xl);
      }
      .accounts-total__hint {
        display: block;
        margin-top: var(--fin-space-1);
        color: rgba(255, 255, 255, 0.68);
        font-size: var(--fin-text-sm);
      }
      .accounts-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .account-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-5);
        padding: var(--fin-space-4);
      }
      .account-skeleton__head {
        display: flex;
        align-items: center;
        gap: var(--fin-space-3);
      }
      .account-skeleton__lines {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
      }
    `,
  ],
})
export class BankAccountsSectionComponent implements OnInit {
  private readonly bankAccountApi = inject(BankAccountApiService);
  private readonly toastService = inject(ToastService);

  protected readonly accounts = signal<BankAccount[]>([]);
  protected readonly loading = signal(true);
  protected readonly saving = signal(false);
  protected readonly error = signal('');
  protected readonly dialog = signal<DialogState>({ kind: 'none' });

  /** Anzahl der Platzhalter-Karten während des Ladens. */
  protected readonly skeletonSlots = [0, 1, 2];

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
