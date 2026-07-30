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
    <section class="fin-panel" aria-labelledby="categoriesHeading">
      <div class="fin-panel__body">
        <header class="categories-header">
          <div class="categories-header__text">
            <h2 id="categoriesHeading" class="categories-title">Kategorien dieses Kontos</h2>
            <p class="categories-note">
              Kategorien gelten für alle Monate. Wie viel pro Monat zur Verfügung steht, legst du
              unter „Budgets“ fest.
            </p>
          </div>

          <div class="categories-actions">
            <button type="button" class="btn btn-outline-secondary" (click)="openCopy()">
              <i class="bi bi-copy" aria-hidden="true"></i>
              <span>Übernehmen</span>
            </button>
            <button type="button" class="btn btn-primary" (click)="openCreate()">
              <i class="bi bi-plus-lg" aria-hidden="true"></i>
              <span>Kategorie</span>
            </button>
          </div>
        </header>

        @if (loading()) {
          <div class="fin-rows" role="status" aria-label="Kategorien werden geladen">
            @for (placeholder of skeletonSlots; track $index) {
              <div class="fin-row">
                <div class="fin-skeleton fin-skeleton--circle categories-skeleton__icon"></div>
                <div class="fin-row__main">
                  <div class="fin-skeleton fin-skeleton--line-short"></div>
                </div>
              </div>
            }
          </div>
        } @else if (error()) {
          <div class="alert alert-danger" role="alert">{{ error() }}</div>
        } @else if (categories().length === 0) {
          <app-empty-state
            icon="tags"
            title="Noch keine Kategorien"
            message="Mit Kategorien siehst du, wofür dein Geld ausgegeben wird — und kannst pro Monat Budgets festlegen."
          >
            <div class="categories-empty-actions">
              <button type="button" class="btn btn-primary" (click)="openCreate()">
                Erste Kategorie anlegen
              </button>
              <button type="button" class="btn btn-outline-secondary" (click)="openCopy()">
                Aus anderem Konto übernehmen
              </button>
            </div>
          </app-empty-state>
        } @else {
          <ul class="fin-rows categories-list">
            @for (category of categories(); track category.id) {
              <li class="fin-row categories-row">
                <app-category-badge
                  class="categories-row__badge"
                  [name]="category.name"
                  [color]="category.color"
                  [icon]="category.icon"
                />

                <span class="categories-row__count">
                  {{ category.transactionCount }}
                  {{ category.transactionCount === 1 ? 'Buchung' : 'Buchungen' }}
                </span>

                <div class="categories-row__actions">
                  <button
                    type="button"
                    class="btn fin-btn-icon"
                    [attr.aria-label]="'Kategorie ' + category.name + ' bearbeiten'"
                    (click)="openEdit(category)"
                  >
                    <i class="bi bi-pencil" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    class="btn fin-btn-icon categories-row__remove"
                    [attr.aria-label]="'Kategorie ' + category.name + ' löschen'"
                    (click)="openDelete(category)"
                  >
                    <i class="bi bi-trash" aria-hidden="true"></i>
                  </button>
                </div>
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
      .categories-header {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        justify-content: space-between;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-4);
      }
      .categories-header__text {
        flex: 1 1 16rem;
        min-width: 0;
      }
      .categories-title {
        margin: 0 0 var(--fin-space-1);
        font-size: var(--fin-text-md);
      }
      .categories-note {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .categories-actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fin-space-2);
      }
      .categories-empty-actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: var(--fin-space-2);
      }

      /* Die Zeilen laufen bis an die Panelkante, der Innenabstand des Panels
         wird dafür lokal zurückgenommen — Trennlinien über die volle Breite
         lesen sich als zusammenhängende Liste. */
      .categories-list {
        margin: 0 calc(-1 * var(--fin-space-5)) calc(-1 * var(--fin-space-5));
      }
      .categories-row__badge {
        flex: 1 1 auto;
        min-width: 0;
      }
      .categories-row__count {
        flex-shrink: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        font-variant-numeric: tabular-nums;
        /* Auf schmalen Displays weichen die Buchungszahlen den Aktionen. */
        display: none;
      }
      @media (min-width: 34rem) {
        .categories-row__count {
          display: inline;
        }
      }
      .categories-row__actions {
        display: flex;
        flex-shrink: 0;
        gap: var(--fin-space-1);
      }
      .categories-row__remove:hover {
        background-color: var(--fin-danger-tint);
        color: var(--fin-danger);
      }
      .categories-skeleton__icon {
        flex-shrink: 0;
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

  /** Anzahl der Platzhalter-Zeilen während des Ladens. */
  protected readonly skeletonSlots = [0, 1, 2, 3];

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
