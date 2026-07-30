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
      <div class="budget-row__head">
        <app-category-badge
          class="budget-row__category"
          [name]="line.categoryName"
          [color]="line.categoryColor"
          [icon]="line.categoryIcon"
        />

        <div class="budget-input">
          <div class="input-group input-group-sm">
            <input
              type="text"
              class="form-control fin-input-amount"
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
            <span class="row-status">
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              Wird gespeichert …
            </span>
          } @else if (invalid()) {
            <span [id]="errorId()" class="row-status row-status--error">
              Bitte einen gültigen Betrag eingeben.
            </span>
          } @else if (line.amount === null && line.suggestedAmount !== null) {
            <span class="row-status">Vorschlag: {{ suggestionLabel() }}</span>
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
        padding: var(--fin-space-4) 0;
        border-top: 1px solid var(--fin-border-subtle);
      }
      /* Erste Zeile ohne Linie: sie schließt direkt an die Überschrift an. */
      :host(:first-of-type) .budget-row {
        border-top: none;
        padding-top: var(--fin-space-2);
      }
      .budget-row__head {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-2);
        margin-bottom: var(--fin-space-3);
      }
      .budget-row__category {
        flex: 1 1 auto;
        min-width: 0;
      }
      .budget-input {
        flex-shrink: 0;
        width: 9.5rem;
      }
      .row-status {
        display: flex;
        align-items: center;
        gap: var(--fin-space-1);
        margin-top: var(--fin-space-1);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-xs);
        font-variant-numeric: tabular-nums;
      }
      .row-status--error {
        color: var(--fin-danger);
        font-weight: 550;
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
