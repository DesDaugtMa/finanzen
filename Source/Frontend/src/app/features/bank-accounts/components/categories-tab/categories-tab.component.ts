import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { CategoryApiService } from '../../../../core/services/category-api.service';
import { BankAccountApiService } from '../../../../core/services/bank-account-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BankAccount } from '../../../../core/models/bank-account.model';
import { Category, CategoryPayload } from '../../../../core/models/category.model';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { CategoryFormDialogComponent } from '../category-form-dialog/category-form-dialog.component';
import { CopyCategoriesDialogComponent } from '../copy-categories-dialog/copy-categories-dialog.component';

/** Welcher Dialog gerade offen ist. */
type DialogState =
  | { kind: 'none' }
  | { kind: 'form'; category: Category | null }
  | { kind: 'delete'; category: Category }
  | { kind: 'copy' };

/**
 * Kategorien des Kontos. Sie gelten monatsübergreifend — Änderungen hier wirken sich
 * auf alle Monate aus, die monatlichen Beträge stehen im Bereich „Budgets“.
 */
@Component({
  selector: 'app-categories-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ConfirmDialogComponent,
    EmptyStateComponent,
    CategoryBadgeComponent,
    CategoryFormDialogComponent,
    CopyCategoriesDialogComponent,
  ],
  template: `
    <section class="card border-0 shadow-sm surface-card" aria-labelledby="categoriesHeading">
      <div class="card-body p-3 p-sm-4">
        <header class="d-flex flex-wrap align-items-start justify-content-between gap-2 mb-3">
          <div>
            <h2 id="categoriesHeading" class="h6 fw-bold mb-1">Kategorien dieses Kontos</h2>
            <p class="text-muted small mb-0">
              Kategorien gelten für alle Monate. Wie viel pro Monat zur Verfügung steht, legst du
              unter „Budgets“ fest.
            </p>
          </div>

          <div class="d-flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline-secondary" (click)="openCopy()">
              <i class="bi bi-copy me-1" aria-hidden="true"></i> Aus anderem Konto
            </button>
            <button type="button" class="btn btn-primary" (click)="openCreate()">
              <i class="bi bi-plus-lg me-1" aria-hidden="true"></i> Kategorie
            </button>
          </div>
        </header>

        @if (loading()) {
          <div class="text-center py-5">
            <span class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Kategorien werden geladen …</span>
            </span>
          </div>
        } @else if (error()) {
          <div class="alert alert-danger mb-0" role="alert">{{ error() }}</div>
        } @else if (categories().length === 0) {
          <app-empty-state
            icon="tags"
            title="Noch keine Kategorien"
            message="Mit Kategorien siehst du, wofür dein Geld ausgegeben wird — und kannst pro Monat Budgets festlegen."
          >
            <div class="d-flex flex-wrap gap-2 justify-content-center">
              <button type="button" class="btn btn-primary" (click)="openCreate()">
                Erste Kategorie anlegen
              </button>
              <button type="button" class="btn btn-outline-secondary" (click)="openCopy()">
                Aus anderem Konto übernehmen
              </button>
            </div>
          </app-empty-state>
        } @else {
          <ul class="list-unstyled mb-0">
            @for (category of categories(); track category.id) {
              <li class="category-row d-flex align-items-center gap-2">
                <app-category-badge
                  class="flex-grow-1 min-width-0"
                  [name]="category.name"
                  [color]="category.color"
                  [icon]="category.icon"
                />

                <span class="text-muted small flex-shrink-0 d-none d-sm-inline">
                  {{ category.transactionCount }}
                  {{ category.transactionCount === 1 ? 'Buchung' : 'Buchungen' }}
                </span>

                <button
                  type="button"
                  class="btn btn-sm btn-light icon-button"
                  [attr.aria-label]="'Kategorie ' + category.name + ' bearbeiten'"
                  (click)="openEdit(category)"
                >
                  <i class="bi bi-pencil" aria-hidden="true"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-light icon-button text-danger"
                  [attr.aria-label]="'Kategorie ' + category.name + ' löschen'"
                  (click)="openDelete(category)"
                >
                  <i class="bi bi-trash" aria-hidden="true"></i>
                </button>
              </li>
            }
          </ul>
        }
      </div>
    </section>

    @if (dialog(); as state) {
      @if (state.kind === 'form') {
        <app-category-form-dialog
          [category]="state.category"
          [saving]="saving()"
          (save)="submitForm($event, state.category)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'delete') {
        <app-confirm-dialog
          title="Kategorie löschen"
          [message]="deleteMessage(state.category)"
          confirmLabel="Löschen"
          variant="danger"
          [busy]="saving()"
          (confirmed)="confirmDelete(state.category)"
          (cancelled)="closeDialog()"
        />
      } @else if (state.kind === 'copy') {
        <app-copy-categories-dialog
          [accounts]="otherAccounts()"
          [loading]="accountsLoading()"
          [saving]="saving()"
          (copy)="confirmCopy($event)"
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
      .category-row {
        padding: 0.6rem 0;
        border-bottom: 1px solid var(--bs-border-color-translucent);
      }
      .category-row:last-child {
        border-bottom: none;
      }
      .icon-button {
        width: 2.25rem;
        height: 2.25rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .min-width-0 {
        min-width: 0;
      }
    `,
  ],
})
export class CategoriesTabComponent {
  readonly accountId = input.required<number>();
  readonly categories = input.required<Category[]>();
  readonly loading = input(false);
  readonly error = input('');

  /** Meldet dem Rahmen, dass die Kategorien neu geladen werden müssen. */
  readonly changed = output<void>();

  private readonly categoryApi = inject(CategoryApiService);
  private readonly bankAccountApi = inject(BankAccountApiService);
  private readonly toastService = inject(ToastService);

  protected readonly dialog = signal<DialogState>({ kind: 'none' });
  protected readonly saving = signal(false);
  protected readonly accounts = signal<BankAccount[]>([]);
  protected readonly accountsLoading = signal(false);

  /** Als Quelle kommen nur die übrigen Konten des Nutzers in Frage. */
  protected readonly otherAccounts = computed(() =>
    this.accounts().filter((a) => a.id !== this.accountId()),
  );

  protected openCreate(): void {
    this.dialog.set({ kind: 'form', category: null });
  }

  protected openEdit(category: Category): void {
    this.dialog.set({ kind: 'form', category });
  }

  protected openDelete(category: Category): void {
    this.dialog.set({ kind: 'delete', category });
  }

  protected openCopy(): void {
    this.dialog.set({ kind: 'copy' });
    this.loadAccounts();
  }

  protected closeDialog(): void {
    if (this.saving()) return;
    this.dialog.set({ kind: 'none' });
  }

  protected deleteMessage(category: Category): string {
    if (category.transactionCount === 0) {
      return `Soll die Kategorie „${category.name}“ wirklich gelöscht werden?`;
    }

    const count = category.transactionCount;
    return (
      `Soll die Kategorie „${category.name}“ wirklich gelöscht werden? ` +
      `${count} ${count === 1 ? 'Buchung bleibt erhalten und wird' : 'Buchungen bleiben erhalten und werden'} ` +
      'künftig ohne Kategorie geführt. Hinterlegte Budgets dieser Kategorie werden entfernt.'
    );
  }

  protected submitForm(payload: CategoryPayload, existing: Category | null): void {
    this.saving.set(true);

    const request$ = existing
      ? this.categoryApi.update(this.accountId(), existing.id, payload)
      : this.categoryApi.create(this.accountId(), payload);

    request$.subscribe({
      next: () => {
        this.finish(existing ? 'Kategorie aktualisiert.' : 'Kategorie angelegt.');
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Die Kategorie konnte nicht gespeichert werden.');
      },
    });
  }

  protected confirmDelete(category: Category): void {
    this.saving.set(true);

    this.categoryApi.delete(this.accountId(), category.id).subscribe({
      next: () => this.finish('Kategorie gelöscht.'),
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Die Kategorie konnte nicht gelöscht werden.');
      },
    });
  }

  protected confirmCopy(sourceAccountId: number): void {
    this.saving.set(true);

    this.categoryApi.copyFrom(this.accountId(), sourceAccountId).subscribe({
      next: () => this.finish('Kategorien übernommen.'),
      error: (err: Error) => {
        this.saving.set(false);
        this.toastService.error(err.message || 'Die Kategorien konnten nicht übernommen werden.');
      },
    });
  }

  private finish(message: string): void {
    this.saving.set(false);
    this.dialog.set({ kind: 'none' });
    this.toastService.success(message);
    this.changed.emit();
  }

  private loadAccounts(): void {
    if (this.accounts().length > 0) return;

    this.accountsLoading.set(true);

    this.bankAccountApi.list().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.accountsLoading.set(false);
      },
      error: (err: Error) => {
        this.accountsLoading.set(false);
        this.toastService.error(err.message || 'Die Konten konnten nicht geladen werden.');
      },
    });
  }
}
