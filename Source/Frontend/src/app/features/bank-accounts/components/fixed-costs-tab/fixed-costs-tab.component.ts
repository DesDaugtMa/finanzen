import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';
import { FixedCostApiService } from '../../../../core/services/fixed-cost-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Category } from '../../../../core/models/category.model';
import {
  FixedCost,
  FixedCostCopyPreview,
  FixedCostMonth,
  FixedCostPayload,
  FixedCostTransaction,
} from '../../../../core/models/fixed-cost.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { formatMonthLong } from '../../../../shared/utils/month.util';
import { FixedCostRowComponent } from '../fixed-cost-row/fixed-cost-row.component';
import { FixedCostFormDialogComponent } from '../fixed-cost-form-dialog/fixed-cost-form-dialog.component';
import { CopyFixedCostsDialogComponent } from '../copy-fixed-costs-dialog/copy-fixed-costs-dialog.component';
import { AssignTransactionDialogComponent } from '../assign-transaction-dialog/assign-transaction-dialog.component';

/** Welcher Dialog gerade offen ist. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'form'; fixedCost: FixedCost | null }
  | { kind: 'delete'; fixedCost: FixedCost }
  | { kind: 'copy' }
  | { kind: 'assign'; fixedCost: FixedCost };

/** Wartezeit, bevor eine Sucheingabe zur API geht. */
const SEARCH_DEBOUNCE_MS = 300;

/**
 * Fixkosten des gewählten Monats. Eine Position ist ein geplanter Betrag; sobald ihr
 * Buchungen zugeordnet sind, zählt deren Summe — genau diese Zahl geht in das frei
 * verfügbare Geld der Übersicht ein.
 */
@Component({
  selector: 'app-fixed-costs-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ConfirmDialogComponent,
    EmptyStateComponent,
    MoneyAmountComponent,
    FixedCostRowComponent,
    FixedCostFormDialogComponent,
    CopyFixedCostsDialogComponent,
    AssignTransactionDialogComponent,
  ],
  template: `
    @if (loading()) {
      <div class="fin-panel costs-skeleton" role="status" aria-label="Fixkosten werden geladen">
        <div class="fin-skeleton fin-skeleton--title"></div>
        <div class="fin-skeleton fin-skeleton--line"></div>
        <div class="fin-skeleton fin-skeleton--line"></div>
        <div class="fin-skeleton fin-skeleton--line-short"></div>
      </div>
    } @else if (error()) {
      <div class="alert alert-danger costs-error" role="alert">
        <span>{{ error() }}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">
          Erneut versuchen
        </button>
      </div>
    } @else if (data(); as month) {
      @if (month.items.length > 0) {
        <section class="fin-panel costs-summary" aria-labelledby="fixedCostSummaryHeading">
          <div class="fin-panel__body">
            <h2 id="fixedCostSummaryHeading" class="costs-heading">
              Fixkosten im {{ monthLabel() }}
            </h2>

            <dl class="costs-totals">
              <div>
                <dt class="fin-kv__label">Geplant</dt>
                <dd>
                  <app-money-amount [amount]="month.totalPlanned" [currency]="month.currency" />
                </dd>
              </div>
              <div>
                <dt class="fin-kv__label">Gebucht</dt>
                <dd>
                  <app-money-amount [amount]="month.totalBooked" [currency]="month.currency" />
                </dd>
              </div>
              <div>
                <dt class="fin-kv__label">Wird gerechnet</dt>
                <dd>
                  <app-money-amount [amount]="month.totalEffective" [currency]="month.currency" />
                </dd>
              </div>
            </dl>

            <p class="costs-note" aria-live="polite">{{ statusNote() }}</p>
          </div>
        </section>
      }

      <section class="fin-panel" aria-labelledby="fixedCostListHeading">
        <div class="fin-panel__body">
          <header class="costs-header">
            <div class="costs-header__text">
              <h2 id="fixedCostListHeading" class="costs-heading">Positionen</h2>
              <p class="costs-subtitle">
                Fixkosten gelten je Monat. Ordne ihnen deine Buchungen zu, damit die Zahlen dem
                tatsächlichen Geldfluss folgen.
              </p>
            </div>

            <div class="costs-actions">
              <button type="button" class="btn btn-outline-secondary" (click)="openCopy()">
                <i class="bi bi-copy" aria-hidden="true"></i>
                <span>Übernehmen</span>
              </button>
              <button type="button" class="btn btn-primary" (click)="openCreate()">
                <i class="bi bi-plus-lg" aria-hidden="true"></i>
                <span>Fixkosten</span>
              </button>
            </div>
          </header>

          @if (month.items.length === 0) {
            <app-empty-state
              icon="pin-angle"
              title="Noch keine Fixkosten in diesem Monat"
              message="Hinterlege wiederkehrende Ausgaben wie Miete oder Versicherungen — danach siehst du auf der Übersicht, wie viel dir für alles andere bleibt."
            >
              <div class="costs-empty-actions">
                <button type="button" class="btn btn-primary" (click)="openCreate()">
                  Erste Fixkosten anlegen
                </button>
                <button type="button" class="btn btn-outline-secondary" (click)="openCopy()">
                  Aus anderem Monat übernehmen
                </button>
              </div>
            </app-empty-state>
          } @else {
            @for (item of month.items; track item.id) {
              <app-fixed-cost-row
                [fixedCost]="item"
                (edit)="openEdit(item)"
                (remove)="openDelete(item)"
                (assign)="openAssign(item)"
                (unlink)="unlinkTransaction(item, $event)"
              />
            }
          }
        </div>
      </section>
    }

    @if (dialog(); as state) {
      @if (state.kind === 'form') {
        <app-fixed-cost-form-dialog
          [fixedCost]="state.fixedCost"
          [categories]="categories()"
          [month]="month()"
          [saving]="saving()"
          (save)="submitForm($event, state.fixedCost)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'delete') {
        <app-confirm-dialog
          title="Fixkosten löschen"
          [message]="deleteMessage(state.fixedCost)"
          confirmLabel="Löschen"
          variant="danger"
          [busy]="saving()"
          (confirmed)="confirmDelete(state.fixedCost)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'copy') {
        <app-copy-fixed-costs-dialog
          [preview]="copyPreview()"
          [loading]="copyLoading()"
          [error]="copyError()"
          [saving]="saving()"
          (sourceMonthChange)="loadCopyPreview($event)"
          (copy)="confirmCopy($event)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'assign') {
        <app-assign-transaction-dialog
          [fixedCost]="state.fixedCost"
          [transactions]="assignable()"
          [loading]="assignableLoading()"
          [error]="assignableError()"
          [saving]="saving()"
          (searchChange)="searchAssignable($event)"
          (assign)="confirmAssign(state.fixedCost, $event)"
          (cancelled)="closeDialog()"
        />
      }
    }
  `,
  styles: [
    `
      .costs-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }
      .costs-summary {
        margin-bottom: var(--fin-space-4);
      }
      .costs-heading {
        margin: 0;
        font-size: var(--fin-text-md);
      }
      .costs-totals {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
        gap: var(--fin-space-4);
        margin: var(--fin-space-4) 0 0;
      }
      .costs-totals dd {
        margin: 0.15rem 0 0;
      }
      .costs-note {
        margin: var(--fin-space-4) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }

      .costs-header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-4);
      }
      .costs-header__text {
        flex: 1 1 16rem;
        min-width: 0;
      }
      .costs-subtitle {
        margin: var(--fin-space-1) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .costs-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fin-space-2);
      }
      .costs-empty-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--fin-space-2);
      }

      .costs-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-3);
        padding: var(--fin-space-5);
      }
    `,
  ],
})
export class FixedCostsTabComponent {
  readonly accountId = input.required<number>();
  readonly month = input.required<string>();
  readonly categories = input.required<Category[]>();

  /** Meldet dem Rahmen, dass die Kennzahlen neu geladen werden müssen. */
  readonly changed = output<void>();

  private readonly fixedCostApi = inject(FixedCostApiService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly data = signal<FixedCostMonth | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly saving = signal(false);
  protected readonly dialog = signal<DialogState>({ kind: 'none' });

  protected readonly copyPreview = signal<FixedCostCopyPreview | null>(null);
  protected readonly copyLoading = signal(false);
  protected readonly copyError = signal('');

  protected readonly assignable = signal<FixedCostTransaction[]>([]);
  protected readonly assignableLoading = signal(false);
  protected readonly assignableError = signal('');

  /** Sucheingaben laufen gebündelt zur API, statt bei jedem Tastendruck. */
  private readonly assignSearch = new Subject<string>();

  protected readonly monthLabel = computed(() => formatMonthLong(this.month()));

  protected readonly statusNote = computed(() => {
    const month = this.data();
    if (!month || month.items.length === 0) return '';

    const total = month.items.length;
    const open = month.openCount;
    const rule =
      'Gerechnet wird je Position der bereits gezahlte Betrag plus der offene Rest — ' +
      'eine Teilzahlung senkt den Abzug also nicht.';

    if (open === 0) {
      return `Zu allen ${total} ${total === 1 ? 'Position gibt es' : 'Positionen gibt es'} Buchungen. ${rule}`;
    }

    return `${open} von ${total} ${total === 1 ? 'Position' : 'Positionen'} noch ohne Buchung. ${rule}`;
  });

  constructor() {
    effect(() => {
      const accountId = this.accountId();
      const month = this.month();
      untracked(() => this.load(accountId, month));
    });

    // Der Fehler wird innerhalb von switchMap behandelt: liefe er nach außen, wäre der
    // Strom beendet und jede weitere Sucheingabe bliebe wirkungslos.
    this.assignSearch
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        switchMap((search) => {
          const state = this.dialog();
          const fixedCostId = state.kind === 'assign' ? state.fixedCost.id : 0;

          this.assignableLoading.set(true);
          this.assignableError.set('');

          return this.fixedCostApi
            .getAssignableTransactions(this.accountId(), fixedCostId, search)
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

  protected load(accountId = this.accountId(), month = this.month()): void {
    this.loading.set(true);
    this.error.set('');

    this.fixedCostApi.getMonth(accountId, month).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Die Fixkosten konnten nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  protected openCreate(): void {
    this.dialog.set({ kind: 'form', fixedCost: null });
  }

  protected openEdit(fixedCost: FixedCost): void {
    this.dialog.set({ kind: 'form', fixedCost });
  }

  protected openDelete(fixedCost: FixedCost): void {
    this.dialog.set({ kind: 'delete', fixedCost });
  }

  protected openCopy(): void {
    this.dialog.set({ kind: 'copy' });
    this.copyPreview.set(null);
    this.loadCopyPreview();
  }

  protected openAssign(fixedCost: FixedCost): void {
    this.dialog.set({ kind: 'assign', fixedCost });
    this.assignable.set([]);
    this.loadAssignable(fixedCost.id, '');
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialog.set({ kind: 'none' });
  }

  protected deleteMessage(fixedCost: FixedCost): string {
    const base = `Sollen die Fixkosten „${fixedCost.name}“ für ${formatMonthLong(fixedCost.month)} gelöscht werden?`;

    if (fixedCost.transactionCount === 0) return base;

    const count = fixedCost.transactionCount;
    return (
      `${base} ${count} zugeordnete ${count === 1 ? 'Buchung bleibt' : 'Buchungen bleiben'} erhalten ` +
      `und ${count === 1 ? 'zählt' : 'zählen'} danach wieder als variable Ausgabe.`
    );
  }

  protected submitForm(payload: FixedCostPayload, existing: FixedCost | null): void {
    this.saving.set(true);

    const request$ = existing
      ? this.fixedCostApi.update(this.accountId(), existing.id, payload)
      : this.fixedCostApi.create(this.accountId(), this.month(), payload);

    request$.subscribe({
      next: () => this.finish(existing ? 'Fixkosten aktualisiert.' : 'Fixkosten angelegt.'),
      error: (err: Error) => this.fail(err, 'Die Fixkosten konnten nicht gespeichert werden.'),
    });
  }

  protected confirmDelete(fixedCost: FixedCost): void {
    this.saving.set(true);

    this.fixedCostApi.delete(this.accountId(), fixedCost.id).subscribe({
      next: () => this.finish('Fixkosten gelöscht.'),
      error: (err: Error) => this.fail(err, 'Die Fixkosten konnten nicht gelöscht werden.'),
    });
  }

  protected confirmCopy(fixedCostIds: number[]): void {
    this.saving.set(true);

    this.fixedCostApi.copy(this.accountId(), this.month(), fixedCostIds).subscribe({
      next: (data) => {
        this.data.set(data);
        this.finish('Fixkosten übernommen.', false);
      },
      error: (err: Error) => this.fail(err, 'Die Fixkosten konnten nicht übernommen werden.'),
    });
  }

  protected confirmAssign(fixedCost: FixedCost, transactionId: number): void {
    this.saving.set(true);

    this.fixedCostApi.linkTransaction(this.accountId(), fixedCost.id, transactionId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.finish('Buchung zugeordnet.', false);
      },
      error: (err: Error) => this.fail(err, 'Die Buchung konnte nicht zugeordnet werden.'),
    });
  }

  protected unlinkTransaction(fixedCost: FixedCost, transactionId: number): void {
    this.fixedCostApi.unlinkTransaction(this.accountId(), fixedCost.id, transactionId).subscribe({
      next: (data) => {
        this.data.set(data);
        this.toastService.success('Zuordnung gelöst.');
        this.changed.emit();
      },
      error: (err: Error) =>
        this.toastService.error(err.message || 'Die Zuordnung konnte nicht gelöst werden.'),
    });
  }

  protected searchAssignable(search: string): void {
    this.assignSearch.next(search);
  }

  /** @param sourceMonth Ohne Angabe wählt der Server den jüngsten Monat vor dem Zielmonat. */
  protected loadCopyPreview(sourceMonth?: string): void {
    this.copyLoading.set(true);
    this.copyError.set('');

    this.fixedCostApi.getCopyPreview(this.accountId(), this.month(), sourceMonth).subscribe({
      next: (preview) => {
        this.copyPreview.set(preview);
        this.copyLoading.set(false);
      },
      error: (err: Error) => {
        this.copyError.set(
          err.message || 'Die Fixkosten des anderen Monats konnten nicht geladen werden.',
        );
        this.copyLoading.set(false);
      },
    });
  }

  private loadAssignable(fixedCostId: number, search: string): void {
    this.assignableLoading.set(true);
    this.assignableError.set('');

    this.fixedCostApi.getAssignableTransactions(this.accountId(), fixedCostId, search).subscribe({
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
   * @param reload Ob der Monat neu geladen werden muss. Endpunkte, die den Monatsstand
   * bereits zurückgeben, sparen den zweiten Aufruf.
   */
  private finish(message: string, reload = true): void {
    this.saving.set(false);
    this.dialog.set({ kind: 'none' });
    this.toastService.success(message);

    if (reload) this.load();
    this.changed.emit();
  }

  private fail(err: Error, fallback: string): void {
    this.saving.set(false);
    this.toastService.error(err.message || fallback);
  }
}
