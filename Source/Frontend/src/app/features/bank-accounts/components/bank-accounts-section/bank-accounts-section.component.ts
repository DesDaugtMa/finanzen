import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { BankAccountApiService } from '../../../../core/services/bank-account-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BankAccountPayload } from '../../../../core/models/bank-account.model';
import { AccountBalance, AccountGroupBalance } from '../../../../core/models/balance.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { accountTypeIcon, accountTypeLabel } from '../../../../shared/utils/account-type';
import { formatMonthShort } from '../../../../shared/utils/month.util';
import { BankAccountCardComponent } from '../bank-account-card/bank-account-card.component';
import { BankAccountFormDialogComponent } from '../bank-account-form-dialog/bank-account-form-dialog.component';

/** Welcher Dialog gerade offen ist. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'form'; account: AccountBalance | null }
  | { kind: 'delete'; account: AccountBalance };

/**
 * Die Konten der Übersicht, nach Kontokategorie gruppiert.
 *
 * Jede Gruppe führt ihre eigene Bilanz und ihr eigenes Vermögen — so ist ohne
 * Zusammenzählen sichtbar, aus welcher Kategorie der Monat kommt. Die Daten
 * kommen von außen (Bilanz-Endpunkt); dieser Bereich besitzt nur die Dialoge
 * zum Anlegen, Bearbeiten und Löschen und meldet Änderungen nach oben.
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
          <h2 id="bankAccountsHeading" class="accounts-title">Kontostände &amp; Bilanz</h2>
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
        <div class="fin-grid fin-grid--cards" role="status" aria-label="Konten werden geladen">
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
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="reload.emit()">
            Erneut versuchen
          </button>
        </div>
      } @else if (groups().length === 0) {
        <app-empty-state
          icon="bank2"
          title="Noch kein Konto angelegt"
          message="Lege dein erstes Girokonto an, um Kontostände, Buchungen und die Bilanz deines Monats im Blick zu behalten."
        >
          <button type="button" class="btn btn-primary btn-lg" (click)="openCreate()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            <span>Erstes Girokonto anlegen</span>
          </button>
        </app-empty-state>
      } @else {
        @for (group of groups(); track group.type) {
          <section class="account-group" [attr.aria-label]="label(group)">
            <header class="account-group__head">
              <span class="fin-emblem fin-emblem--sm fin-emblem--muted" aria-hidden="true">
                <i class="bi" [class]="'bi-' + icon(group)"></i>
              </span>

              <h3 class="account-group__title">{{ label(group) }}</h3>
              <span class="account-group__count">{{ countLabel(group) }}</span>

              <dl class="account-group__figures">
                <div class="account-group__figure">
                  <dt class="account-group__label">Bilanz {{ monthLabel() }}</dt>
                  <dd class="account-group__value">
                    <app-money-amount size="sm" [amount]="group.net" [currency]="group.currency" />
                  </dd>
                </div>
                <div class="account-group__figure">
                  <dt class="account-group__label">Vermögen</dt>
                  <dd class="account-group__value">
                    <app-money-amount
                      size="sm"
                      [amount]="group.balance"
                      [currency]="group.currency"
                    />
                  </dd>
                </div>
              </dl>
            </header>

            <ul class="fin-grid fin-grid--cards fin-stagger accounts-list">
              @for (account of group.accounts; track account.accountId) {
                <li>
                  <app-bank-account-card
                    [account]="account"
                    [month]="month()"
                    (edit)="openEdit($event)"
                    (remove)="openDelete($event)"
                  />
                </li>
              }
            </ul>
          </section>
        }
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
          title="Konto löschen"
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
      .account-group + .account-group {
        margin-top: var(--fin-space-8);
      }
      .account-group__head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-2) var(--fin-space-3);
        margin-bottom: var(--fin-space-4);
        padding-bottom: var(--fin-space-3);
        border-bottom: 1px solid var(--fin-border-subtle);
      }
      .account-group__title {
        margin: 0;
        font-size: var(--fin-text-md);
      }
      .account-group__count {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      /* Die Kennzahlen rücken ans rechte Ende der Kopfzeile; auf schmalen
         Displays fallen sie in die nächste Zeile, statt die Überschrift zu quetschen. */
      .account-group__figures {
        display: flex;
        gap: var(--fin-space-5);
        margin: 0;
        margin-inline-start: auto;
      }
      .account-group__figure {
        text-align: end;
      }
      .account-group__label {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-2xs);
        font-weight: 650;
        letter-spacing: var(--fin-tracking-wide);
        text-transform: uppercase;
      }
      .account-group__value {
        margin: 0;
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
export class BankAccountsSectionComponent {
  /** Die Konten nach Kontokategorie, wie der Bilanz-Endpunkt sie liefert. */
  readonly groups = input<AccountGroupBalance[]>([]);
  /** Der Monat, auf den sich alle Bilanzzahlen beziehen, als `yyyy-MM`. */
  readonly month = input.required<string>();
  readonly loading = input(false);
  readonly error = input('');

  /** Ein Konto wurde angelegt, geändert oder gelöscht — die Bilanz muss neu geladen werden. */
  readonly changed = output<void>();
  readonly reload = output<void>();

  private readonly bankAccountApi = inject(BankAccountApiService);
  private readonly toastService = inject(ToastService);

  protected readonly saving = signal(false);
  protected readonly dialog = signal<DialogState>({ kind: 'none' });

  /** Anzahl der Platzhalter-Karten während des Ladens. */
  protected readonly skeletonSlots = [0, 1, 2];

  protected readonly monthLabel = computed(() => formatMonthShort(this.month()));

  protected label(group: AccountGroupBalance): string {
    return accountTypeLabel(group.type);
  }

  protected icon(group: AccountGroupBalance): string {
    return accountTypeIcon(group.type);
  }

  protected countLabel(group: AccountGroupBalance): string {
    const count = group.accounts.length;
    return count === 1 ? '1 Konto' : `${count} Konten`;
  }

  protected openCreate(): void {
    this.dialog.set({ kind: 'form', account: null });
  }

  protected openEdit(account: AccountBalance): void {
    this.dialog.set({ kind: 'form', account });
  }

  protected openDelete(account: AccountBalance): void {
    this.dialog.set({ kind: 'delete', account });
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialog.set({ kind: 'none' });
  }

  protected submitForm(payload: BankAccountPayload, existing: AccountBalance | null): void {
    this.saving.set(true);

    const request$ = existing
      ? this.bankAccountApi.update(existing.accountId, payload)
      : this.bankAccountApi.create(payload);

    request$.subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog.set({ kind: 'none' });
        // Neu laden statt lokal einsortieren: ein geänderter Anfangssaldo verschiebt
        // Kontostand, Gruppensumme und Gesamtvermögen zugleich — diese Zahlen darf
        // nur der Server bestimmen, sonst zeigt die Übersicht kurzzeitig Falsches.
        this.changed.emit();
        this.toastService.success(existing ? 'Konto aktualisiert.' : 'Girokonto angelegt.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Das Konto konnte nicht gespeichert werden.');
      },
    });
  }

  protected confirmDelete(account: AccountBalance): void {
    this.saving.set(true);

    this.bankAccountApi.delete(account.accountId).subscribe({
      next: () => {
        this.saving.set(false);
        this.dialog.set({ kind: 'none' });
        this.changed.emit();
        this.toastService.success('Konto gelöscht.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Das Konto konnte nicht gelöscht werden.');
      },
    });
  }
}
