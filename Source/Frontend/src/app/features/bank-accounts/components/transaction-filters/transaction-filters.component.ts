import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Category } from '../../../../core/models/category.model';
import { TransactionType } from '../../../../core/models/transaction.model';

/** Änderungen, die die Filterleiste meldet. Jede Angabe ist optional. */
export interface TransactionFilterChange {
  search?: string;
  type?: TransactionType | null;
  categoryIds?: number[];
  includeUncategorized?: boolean;
}

/**
 * Such- und Filterleiste der Transaktionsliste. Filtert immer innerhalb des
 * gewählten Monats; die Auswertung übernimmt der Server.
 */
@Component({
  selector: 'app-transaction-filters',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="d-flex flex-column gap-2">
      <div class="row g-2">
        <div class="col-12 col-lg-6">
          <label for="txSearch" class="visually-hidden">Buchungen durchsuchen</label>
          <div class="input-group">
            <span class="input-group-text" aria-hidden="true"><i class="bi bi-search"></i></span>
            <input
              type="search"
              id="txSearch"
              class="form-control"
              placeholder="Bezeichnung oder Notiz durchsuchen"
              autocomplete="off"
              [value]="search()"
              (input)="onSearch($event)"
            />
          </div>
        </div>

        <div class="col-12 col-sm-6 col-lg-3">
          <label for="txTypeFilter" class="visually-hidden">Art der Buchung</label>
          <select
            id="txTypeFilter"
            class="form-select"
            [value]="type() ?? ''"
            (change)="onType($event)"
          >
            <option value="">Einnahmen und Ausgaben</option>
            <option value="Income">Nur Einnahmen</option>
            <option value="Expense">Nur Ausgaben</option>
          </select>
        </div>

        <div class="col-12 col-sm-6 col-lg-3">
          <label for="txCategoryFilter" class="visually-hidden">Kategorie</label>
          <select
            id="txCategoryFilter"
            class="form-select"
            [value]="categoryValue()"
            (change)="onCategory($event)"
          >
            <option value="">Alle Kategorien</option>
            <option value="none">Ohne Kategorie</option>
            @for (category of categories(); track category.id) {
              <option [value]="category.id">{{ category.name }}</option>
            }
          </select>
        </div>
      </div>

      @if (hasActiveFilters()) {
        <div>
          <button
            type="button"
            class="btn btn-sm btn-link px-0 text-decoration-none"
            (click)="reset.emit()"
          >
            <i class="bi bi-x-circle me-1" aria-hidden="true"></i> Filter zurücksetzen
          </button>
        </div>
      }
    </div>
  `,
})
export class TransactionFiltersComponent {
  readonly categories = input.required<Category[]>();
  readonly search = input('');
  readonly type = input<TransactionType | null>(null);
  readonly categoryIds = input<number[]>([]);
  readonly includeUncategorized = input(false);

  readonly filterChange = output<TransactionFilterChange>();
  readonly reset = output<void>();

  /** Die Kategorieauswahl kennt drei Zustände: alle, ohne Kategorie, eine bestimmte. */
  protected readonly categoryValue = computed(() => {
    if (this.includeUncategorized()) return 'none';
    return this.categoryIds().length > 0 ? String(this.categoryIds()[0]) : '';
  });

  protected readonly hasActiveFilters = computed(
    () => Boolean(this.search()) || this.type() !== null || this.categoryValue() !== '',
  );

  protected onSearch(event: Event): void {
    this.filterChange.emit({ search: (event.target as HTMLInputElement).value });
  }

  protected onType(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.filterChange.emit({ type: value ? (value as TransactionType) : null });
  }

  protected onCategory(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;

    if (value === '') {
      this.filterChange.emit({ categoryIds: [], includeUncategorized: false });
      return;
    }

    if (value === 'none') {
      this.filterChange.emit({ categoryIds: [], includeUncategorized: true });
      return;
    }

    this.filterChange.emit({ categoryIds: [Number(value)], includeUncategorized: false });
  }
}
