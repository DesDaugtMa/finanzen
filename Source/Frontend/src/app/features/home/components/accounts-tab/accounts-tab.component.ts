import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { BankAccountApiService } from '../../../../core/services/bank-account-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BankAccountPayload } from '../../../../core/models/bank-account.model';
import { AccountBalance, AccountGroupBalance, AccountType } from '../../../../core/models/balance.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { Period } from '../../../../shared/utils/period.util';
import { BankAccountFormDialogComponent } from '../../../bank-accounts/components/bank-account-form-dialog/bank-account-form-dialog.component';
import { AccountGroupComponent } from '../account-group/account-group.component';

/** Welcher Dialog gerade offen ist. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'form'; account: AccountBalance | null }
  | { kind: 'delete'; account: AccountBalance };

/**
 * Der Reiter „Konten“: alle Kontobereiche des gewählten Zeitraums untereinander.
 *
 * Die Daten kommen von außen (Zeitraum-Bilanz); dieser Reiter besitzt nur die
 * Dialoge zum Anlegen, Bearbeiten und Löschen und meldet Änderungen nach oben.
 * Gezeigt werden ausschließlich Kategorien, in denen es Konten gibt — ein leerer
 * Bereich für eine Kategorie, die man gar nicht anlegen kann, wäre ein Versprechen
 * ohne Deckung.
 */
@Component({
  selector: 'app-accounts-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccountGroupComponent,
    BankAccountFormDialogComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
  ],
  template: `
    @if (loading()) {
      <!--
        Skelett statt Spinner: es zeigt bereits die Form der kommenden Karten,
        die Seite springt beim Eintreffen der Daten nicht, und die Wartezeit
        wirkt kürzer, weil Struktur sichtbar ist.
      -->
      <div class="skeletons" role="status" aria-label="Konten werden geladen">
        <div class="fin-skeleton fin-skeleton--title skeletons__head"></div>
        <div class="skeletons__grid">
          @for (placeholder of skeletonSlots; track $index) {
            <div class="fin-panel skeletons__card">
              <div class="skeletons__card-head">
                <div class="fin-skeleton fin-skeleton--circle"></div>
                <div class="skeletons__lines">
                  <div class="fin-skeleton fin-skeleton--title"></div>
                  <div class="fin-skeleton fin-skeleton--line-short"></div>
                </div>
              </div>
              <div class="fin-skeleton fin-skeleton--amount"></div>
            </div>
          }
        </div>
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
        message="Lege dein erstes Girokonto an, um Kontostände, Buchungen und die Bilanz deines Zeitraums im Blick zu behalten."
      >
        <button type="button" class="btn btn-primary btn-lg" (click)="openCreate()">
          <i class="bi bi-plus-lg" aria-hidden="true"></i>
          <span>Erstes Girokonto anlegen</span>
        </button>
      </app-empty-state>
    } @else {
      <div class="accounts">
        @for (group of groups(); track group.type) {
          <app-account-group
            [group]="group"
            [period]="period()"
            (edit)="openEdit($event)"
            (remove)="openDelete($event)"
            (reordered)="reorderAccounts($event)"
          />
        }

        <!-- Die Anlege-Handlung steht am Ende der Bereiche und nicht in jedem
             Bereichskopf: es gibt genau eine anlegbare Kontoart, und eine
             wiederholte Schaltfläche würde diese Wahl vortäuschen. -->
        <div class="accounts__action">
          <button type="button" class="btn btn-primary" (click)="openCreate()">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
            <span>Girokonto anlegen</span>
          </button>
        </div>
      </div>
    }

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
      :host {
        display: block;
      }
      .accounts {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-10);
      }
      .accounts__action {
        display: flex;
        justify-content: center;
      }
      .accounts-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
        margin: 0;
      }
      .skeletons__head {
        max-width: 12rem;
        margin-bottom: var(--fin-space-5);
      }
      .skeletons__grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--fin-space-4);
      }
      @media (min-width: 48rem) {
        .skeletons__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (min-width: 64rem) {
        .skeletons__grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      .skeletons__card {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-5);
        padding: var(--fin-space-4);
      }
      .skeletons__card-head {
        display: flex;
        align-items: center;
        gap: var(--fin-space-3);
      }
      .skeletons__lines {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
      }
    `,
  ],
})
export class AccountsTabComponent {
  /** Die Konten nach Kontokategorie, wie der Zeitraum-Endpunkt sie liefert. */
  readonly groups = input<AccountGroupBalance[]>([]);
  /** Der Zeitraum, auf den sich alle Bilanzzahlen beziehen. */
  readonly period = input.required<Period>();
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

  /**
   * Speichert die neue Kontenreihenfolge im Hintergrund. Die Karte selbst steht dank
   * `account-group` bereits optimistisch an der neuen Position; egal ob der Aufruf
   * gelingt oder fehlschlägt, wird die Bilanz neu geladen — bei Erfolg bestätigt das
   * die neue Reihenfolge, bei einem Fehler setzt es sie auf den Serverstand zurück.
   */
  protected reorderAccounts(event: { accountType: AccountType; accountIds: number[] }): void {
    this.bankAccountApi.reorder(event).subscribe({
      next: () => this.changed.emit(),
      error: (err: Error) => {
        this.toastService.error(err.message || 'Die Reihenfolge konnte nicht gespeichert werden.');
        this.changed.emit();
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
