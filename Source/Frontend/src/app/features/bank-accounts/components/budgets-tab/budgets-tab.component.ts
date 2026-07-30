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
      <div class="text-center py-5">
        <span class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Budgets werden geladen …</span>
        </span>
      </div>
    } @else if (error()) {
      <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
        <span class="me-auto">{{ error() }}</span>
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
        <section
          class="card border-0 shadow-sm surface-card mb-3"
          aria-labelledby="budgetSummaryHeading"
        >
          <div class="card-body p-3 p-sm-4">
            <h2 id="budgetSummaryHeading" class="h6 fw-bold mb-3">Gesamt im {{ monthLabel() }}</h2>

            <dl class="row g-3 mb-3">
              <div class="col-4">
                <dt class="text-muted small fw-normal">Budgetiert</dt>
                <dd class="mb-0">
                  <app-money-amount [amount]="month.totalBudget" [currency]="month.currency" />
                </dd>
              </div>
              <div class="col-4">
                <dt class="text-muted small fw-normal">Ausgegeben</dt>
                <dd class="mb-0">
                  <app-money-amount
                    [amount]="month.totalSpentBudgeted"
                    [currency]="month.currency"
                  />
                </dd>
              </div>
              <div class="col-4">
                <dt class="text-muted small fw-normal">
                  {{ month.totalRemaining < 0 ? 'Überschritten' : 'Übrig' }}
                </dt>
                <dd class="mb-0">
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
          <div class="alert alert-info d-flex flex-wrap align-items-center gap-2" role="status">
            <i class="bi bi-lightbulb" aria-hidden="true"></i>
            <span class="me-auto">
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
                  class="spinner-border spinner-border-sm me-1"
                  role="status"
                  aria-hidden="true"
                ></span>
              }
              Vorschläge übernehmen
            </button>
          </div>
        }

        <section class="card border-0 shadow-sm surface-card" aria-labelledby="budgetListHeading">
          <div class="card-body p-3 p-sm-4">
            <h2 id="budgetListHeading" class="h6 fw-bold mb-1">Budget je Kategorie</h2>
            <p class="text-muted small mb-3">
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
      .surface-card {
        border-radius: 1rem;
        background-color: var(--color-surface);
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
