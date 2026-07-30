import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { BudgetLine } from '../../../../core/models/budget.model';
import { BudgetProgressComponent } from '../../../../shared/components/budget-progress/budget-progress.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { formatMoney, parseMoneyInput } from '../../../../shared/utils/money.util';

/**
 * Eine Kategorie-Zeile im Budget-Bereich. Der Betrag wird beim Verlassen des Feldes
 * oder mit der Eingabetaste gespeichert — es gibt bewusst keinen Speichern-Knopf je Zeile.
 * Ein leeres Feld entfernt das Budget wieder.
 */
@Component({
  selector: 'app-budget-row',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BudgetProgressComponent, CategoryBadgeComponent],
  template: `
    @let line = budget();

    <div class="budget-row">
      <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
        <app-category-badge
          class="flex-grow-1 min-width-0"
          [name]="line.categoryName"
          [color]="line.categoryColor"
          [icon]="line.categoryIcon"
        />

        <div class="budget-input">
          <div class="input-group input-group-sm">
            <input
              type="text"
              class="form-control text-end"
              inputmode="decimal"
              autocomplete="off"
              [id]="inputId()"
              [value]="draft()"
              [placeholder]="placeholder()"
              [disabled]="saving()"
              [class.is-invalid]="invalid()"
              [attr.aria-label]="'Budget für ' + line.categoryName"
              [attr.aria-describedby]="invalid() ? errorId() : null"
              (input)="onInput($event)"
              (blur)="commit()"
              (keydown.enter)="commit()"
              (keydown.escape)="reset()"
            />
            <span class="input-group-text" aria-hidden="true">€</span>
          </div>

          @if (saving()) {
            <span class="row-status text-muted">
              <span
                class="spinner-border spinner-border-sm me-1"
                role="status"
                aria-hidden="true"
              ></span>
              Wird gespeichert …
            </span>
          } @else if (invalid()) {
            <span [id]="errorId()" class="row-status text-danger"
              >Bitte einen gültigen Betrag eingeben.</span
            >
          } @else if (line.amount === null && line.suggestedAmount !== null) {
            <span class="row-status text-muted">Vorschlag: {{ suggestionLabel() }}</span>
          }
        </div>
      </div>

      <app-budget-progress
        [label]="'Budgetauslastung ' + line.categoryName"
        [spent]="line.spent"
        [budget]="line.amount"
        [currency]="currency()"
      />
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .budget-row {
        padding: 0.85rem 0;
        border-bottom: 1px solid var(--bs-border-color-translucent);
      }
      :host(:last-of-type) .budget-row {
        border-bottom: none;
      }
      .budget-input {
        width: 9.5rem;
        flex-shrink: 0;
      }
      .row-status {
        display: block;
        margin-top: 0.2rem;
        font-size: 0.75rem;
      }
      .min-width-0 {
        min-width: 0;
      }
    `,
  ],
})
export class BudgetRowComponent {
  readonly budget = input.required<BudgetLine>();
  readonly currency = input.required<string>();
  readonly saving = input(false);

  /** `null` bedeutet: Budget für diesen Monat entfernen. */
  readonly save = output<number | null>();

  protected readonly draft = signal('');
  protected readonly invalid = signal(false);

  protected readonly inputId = computed(() => `budget-input-${this.budget().categoryId}`);
  protected readonly errorId = computed(() => `budget-error-${this.budget().categoryId}`);

  protected readonly placeholder = computed(() => {
    const suggestion = this.budget().suggestedAmount;
    return suggestion === null ? 'Kein Budget' : formatAmount(suggestion);
  });

  protected readonly suggestionLabel = computed(() => {
    const suggestion = this.budget().suggestedAmount;
    return suggestion === null ? '' : formatMoney(suggestion, this.currency());
  });

  constructor() {
    // Der Entwurf folgt dem Serverstand, solange nicht gerade getippt wird.
    effect(() => {
      const amount = this.budget().amount;
      this.draft.set(amount === null ? '' : formatAmount(amount));
      this.invalid.set(false);
    });
  }

  protected onInput(event: Event): void {
    this.draft.set((event.target as HTMLInputElement).value);
    this.invalid.set(false);
  }

  protected reset(): void {
    const amount = this.budget().amount;
    this.draft.set(amount === null ? '' : formatAmount(amount));
    this.invalid.set(false);
  }

  protected commit(): void {
    const raw = this.draft().trim();
    const current = this.budget().amount;

    if (!raw) {
      // Leeres Feld heißt „kein Budget“ — nur melden, wenn vorher eines gesetzt war.
      if (current !== null) this.save.emit(null);
      return;
    }

    const parsed = parseMoneyInput(raw);

    if (parsed === null || parsed < 0) {
      this.invalid.set(true);
      return;
    }

    const rounded = Math.round(parsed * 100) / 100;
    this.draft.set(formatAmount(rounded));

    // Unveränderte Werte lösen keinen Request aus.
    if (current !== null && Math.round(current * 100) === Math.round(rounded * 100)) return;

    this.save.emit(rounded);
  }
}

/** Eingabefreundliche Schreibweise ohne Währungszeichen, z. B. `400,00`. */
function formatAmount(value: number): string {
  return value.toFixed(2).replace('.', ',');
}
