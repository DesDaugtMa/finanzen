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
    <div class="filters">
      <div class="filters__grid">
        <div class="filters__search">
          <label for="txSearch" class="visually-hidden">Buchungen durchsuchen</label>
          <i class="bi bi-search filters__search-icon" aria-hidden="true"></i>
          <input
            type="search"
            id="txSearch"
            class="form-control filters__search-input"
            placeholder="Bezeichnung oder Notiz durchsuchen"
            autocomplete="off"
            [value]="search()"
            (input)="onSearch($event)"
          />
        </div>

        <span class="filters__select">
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
        </span>

        <span class="filters__select">
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
        </span>
      </div>

      @if (hasActiveFilters()) {
        <button type="button" class="btn btn-sm btn-link filters__reset" (click)="reset.emit()">
          <i class="bi bi-x-circle" aria-hidden="true"></i>
          <span>Filter zurücksetzen</span>
        </button>
      }
    </div>
  `,
  styles: [
    `
      .filters {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--fin-space-2);
      }
      .filters__grid {
        display: grid;
        gap: var(--fin-space-2);
        width: 100%;
      }
      /* Suchfeld über die volle Breite, die beiden Auswahlfelder daneben — erst
         ab der Breite, ab der alle drei lesbar nebeneinander passen. */
      @media (min-width: 48rem) {
        .filters__grid {
          grid-template-columns: 2fr 1fr 1fr;
        }
      }
      /* Ohne display:block bliebe das span inline und das Auswahlfeld würde die
         Rasterzelle nicht ausfüllen. */
      .filters__select {
        display: block;
      }
      .filters__search {
        position: relative;
      }
      .filters__search-icon {
        position: absolute;
        top: 50%;
        left: var(--fin-space-3);
        transform: translateY(-50%);
        color: var(--fin-text-subtle);
        pointer-events: none;
      }
      .filters__search-input {
        padding-left: var(--fin-space-10);
      }
      /* Das eigene Löschkreuz von Safari doppelt unsere Zurücksetzen-Aktion. */
      .filters__search-input::-webkit-search-decoration,
      .filters__search-input::-webkit-search-cancel-button {
        appearance: none;
      }
      .filters__reset {
        margin-left: calc(-1 * var(--fin-space-3));
      }
    `,
  ],
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
