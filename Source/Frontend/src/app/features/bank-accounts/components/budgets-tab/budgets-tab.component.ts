import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { BudgetApiService } from '../../../../core/services/budget-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BudgetMonth } from '../../../../core/models/budget.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { BudgetProgressComponent } from '../../../../shared/components/budget-progress/budget-progress.component';
import { formatMonthLong } from '../../../../shared/utils/month.util';
import { BudgetRowComponent } from '../budget-row/budget-row.component';

/**
 * Budgets des gewählten Monats. Jede Zeile speichert für sich; die Werte des
 * Vormonats werden nur als Vorschlag angezeigt und erst durch „Übernehmen“ gespeichert.
 */
@Component({
  selector: 'app-budgets-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent, EmptyStateComponent, BudgetProgressComponent, BudgetRowComponent],
  template: `
    @if (loading()) {
      <div class="fin-panel budget-skeleton" role="status" aria-label="Budgets werden geladen">
        <div class="fin-skeleton fin-skeleton--title"></div>
        <div class="fin-skeleton fin-skeleton--line"></div>
        <div class="fin-skeleton fin-skeleton--line"></div>
        <div class="fin-skeleton fin-skeleton--line-short"></div>
      </div>
    } @else if (error()) {
      <div class="alert alert-danger budgets-error" role="alert">
        <span>{{ error() }}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">
          Erneut versuchen
        </button>
      </div>
    } @else if (data(); as month) {
      @if (month.items.length === 0) {
        <app-empty-state
          icon="tags"
          title="Noch keine Kategorien angelegt"
          message="Budgets werden je Kategorie festgelegt. Lege zuerst im Bereich „Kategorien“ fest, wofür du Geld ausgibst."
        />
      } @else {
        <section class="fin-panel budgets-panel" aria-labelledby="budgetSummaryHeading">
          <div class="fin-panel__body">
            <h2 id="budgetSummaryHeading" class="budgets-heading">Gesamt im {{ monthLabel() }}</h2>

            <dl class="budget-totals">
              <div>
                <dt class="fin-kv__label">Budgetiert</dt>
                <dd>
                  <app-money-amount [amount]="month.totalBudget" [currency]="month.currency" />
                </dd>
              </div>
              <div>
                <dt class="fin-kv__label">Ausgegeben</dt>
                <dd>
                  <app-money-amount
                    [amount]="month.totalSpentBudgeted"
                    [currency]="month.currency"
                  />
                </dd>
              </div>
              <div>
                <dt class="fin-kv__label">
                  {{ month.totalRemaining < 0 ? 'Überschritten' : 'Übrig' }}
                </dt>
                <dd>
                  <app-money-amount [amount]="month.totalRemaining" [currency]="month.currency" />
                </dd>
              </div>
            </dl>

            <app-budget-progress
              label="Auslastung aller Budgets"
              [spent]="month.totalSpentBudgeted"
              [budget]="month.totalBudget > 0 ? month.totalBudget : null"
              [currency]="month.currency"
            />
          </div>
        </section>

        @if (month.hasSuggestions) {
          <div class="alert alert-info suggestion-bar" role="status">
            <i class="bi bi-lightbulb suggestion-bar__icon" aria-hidden="true"></i>
            <span class="suggestion-bar__text">
              Für einige Kategorien gibt es Werte aus {{ suggestionSourceLabel() }}. Sie sind noch
              nicht gespeichert.
            </span>
            <button
              type="button"
              class="btn btn-sm btn-primary"
              [disabled]="applying()"
              (click)="applySuggestions()"
            >
              @if (applying()) {
                <span
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
              }
              Übernehmen
            </button>
          </div>
        }

        <section class="fin-panel" aria-labelledby="budgetListHeading">
          <div class="fin-panel__body">
            <h2 id="budgetListHeading" class="budgets-heading budgets-heading--tight">
              Budget je Kategorie
            </h2>
            <p class="budgets-note">
              Änderungen werden automatisch gespeichert. Ein leeres Feld entfernt das Budget für
              diesen Monat.
            </p>

            @for (line of month.items; track line.categoryId) {
              <app-budget-row
                [budget]="line"
                [currency]="month.currency"
                [saving]="savingCategoryId() === line.categoryId"
                (save)="setBudget(line.categoryId, $event)"
              />
            }
          </div>
        </section>
      }
    }
  `,
  styles: [
    `
      .budgets-error,
      .suggestion-bar {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-3);
      }
      .budgets-error {
        justify-content: space-between;
      }
      .suggestion-bar {
        margin-bottom: var(--fin-space-4);
      }
      .suggestion-bar__icon {
        flex-shrink: 0;
        font-size: var(--fin-text-md);
      }
      .suggestion-bar__text {
        /* Nimmt den freien Platz, damit die Schaltfläche rechts außen sitzt und
           erst bei echtem Platzmangel umbricht. */
        flex: 1 1 14rem;
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
      .budgets-panel {
        margin-bottom: var(--fin-space-4);
      }
      .budgets-heading {
        margin: 0 0 var(--fin-space-4);
        font-size: var(--fin-text-md);
      }
      .budgets-heading--tight {
        margin-bottom: var(--fin-space-1);
      }
      .budgets-note {
        margin: 0 0 var(--fin-space-4);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .budget-totals {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
        gap: var(--fin-space-4);
        margin: 0 0 var(--fin-space-5);
      }
      .budget-totals dd {
        margin: 0.15rem 0 0;
      }
      .budget-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-4);
        padding: var(--fin-space-5);
      }
    `,
  ],
})
export class BudgetsTabComponent {
  readonly accountId = input.required<number>();
  readonly month = input.required<string>();
  readonly currency = input.required<string>();

  /** Meldet dem Rahmen, dass die Kennzahlen neu geladen werden müssen. */
  readonly changed = output<void>();

  private readonly budgetApi = inject(BudgetApiService);
  private readonly toastService = inject(ToastService);

  protected readonly data = signal<BudgetMonth | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly savingCategoryId = signal<number | null>(null);
  protected readonly applying = signal(false);

  protected readonly monthLabel = computed(() => formatMonthLong(this.month()));
  protected readonly suggestionSourceLabel = computed(() => {
    const source = this.data()?.suggestionSourceMonth;
    return source ? formatMonthLong(source) : '';
  });

  constructor() {
    effect(() => {
      const accountId = this.accountId();
      const month = this.month();
      untracked(() => this.load(accountId, month));
    });
  }

  protected load(accountId = this.accountId(), month = this.month()): void {
    this.loading.set(true);
    this.error.set('');

    this.budgetApi.getMonth(accountId, month).subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Die Budgets konnten nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  protected setBudget(categoryId: number, amount: number | null): void {
    this.savingCategoryId.set(categoryId);

    this.budgetApi.set(this.accountId(), categoryId, this.month(), amount).subscribe({
      next: (data) => {
        this.data.set(data);
        this.savingCategoryId.set(null);
        this.changed.emit();
      },
      error: (err: Error) => {
        this.savingCategoryId.set(null);
        this.toastService.error(err.message || 'Das Budget konnte nicht gespeichert werden.');
        // Der Serverstand bleibt maßgeblich: neu laden, damit das Feld nicht falsch stehen bleibt.
        this.load();
      },
    });
  }

  protected applySuggestions(): void {
    this.applying.set(true);

    this.budgetApi.applySuggestions(this.accountId(), this.month()).subscribe({
      next: (data) => {
        this.data.set(data);
        this.applying.set(false);
        this.toastService.success('Budgets aus dem Vormonat übernommen.');
        this.changed.emit();
      },
      error: (err: Error) => {
        this.applying.set(false);
        this.toastService.error(err.message || 'Die Vorschläge konnten nicht übernommen werden.');
      },
    });
  }
}
