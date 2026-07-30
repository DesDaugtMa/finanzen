import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatMoney } from '../../utils/money.util';

/**
 * Fortschritt eines Budgets: wie viel des Betrags bereits ausgegeben ist.
 *
 * Eine Überschreitung ist nicht nur an der Farbe erkennbar, sondern zusätzlich am
 * Warnsymbol und am Text — die Anzeige bleibt damit auch ohne Farbwahrnehmung eindeutig.
 */
@Component({
  selector: 'app-budget-progress',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="budget-progress">
      <div
        class="progress"
        role="progressbar"
        [attr.aria-label]="label()"
        [attr.aria-valuenow]="percent()"
        aria-valuemin="0"
        aria-valuemax="100"
        [attr.aria-valuetext]="valueText()"
      >
        <div
          class="progress-bar"
          [class.progress-bar--over]="isOver()"
          [class.progress-bar--warn]="isNearLimit()"
          [style.width.%]="percent()"
        ></div>
      </div>

      <p class="budget-caption" [class.text-danger]="isOver()">
        @if (isOver()) {
          <i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i>
        }
        <span>{{ caption() }}</span>
      </p>
    </div>
  `,
  styles: [
    `
      .progress {
        height: 0.375rem;
        border-radius: var(--fin-radius-pill);
        background-color: var(--fin-surface-active);
        overflow: hidden;
      }
      .progress-bar {
        height: 100%;
        background-color: var(--fin-accent);
        border-radius: var(--fin-radius-pill);
        /* Der Balken wächst sichtbar mit, wenn sich Ausgaben ändern. Breite ist
           hier bewusst animiert statt transform: der Balken muss exakt am
           Nullpunkt beginnen, eine Skalierung würde ihn verzerren. */
        transition: width var(--fin-duration-slow) var(--fin-ease-out);
      }
      .progress-bar--warn {
        background-color: var(--fin-warn);
      }
      .progress-bar--over {
        background-color: var(--fin-expense);
      }
      .budget-caption {
        display: flex;
        align-items: center;
        gap: var(--fin-space-1);
        margin-top: var(--fin-space-2);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
      .budget-caption.text-danger {
        color: var(--fin-expense) !important;
        font-weight: 550;
      }
    `,
  ],
})
export class BudgetProgressComponent {
  readonly spent = input.required<number>();
  /** `null` bedeutet: für diese Kategorie ist kein Budget gesetzt. */
  readonly budget = input.required<number | null>();
  readonly currency = input.required<string>();
  readonly label = input('Budgetauslastung');

  /** Ab diesem Anteil gilt das Budget als knapp und wird gelb dargestellt. */
  private readonly warnThreshold = 85;

  protected readonly percent = computed(() => {
    const budget = this.budget();
    if (!budget || budget <= 0) return 0;

    return Math.min(100, Math.round((this.spent() / budget) * 100));
  });

  protected readonly isOver = computed(() => {
    const budget = this.budget();
    return budget !== null && this.spent() > budget;
  });

  protected readonly isNearLimit = computed(
    () => !this.isOver() && this.percent() >= this.warnThreshold,
  );

  protected readonly valueText = computed(() => {
    const budget = this.budget();
    if (budget === null) return 'Kein Budget gesetzt';

    return `${formatMoney(this.spent(), this.currency())} von ${formatMoney(budget, this.currency())}`;
  });

  protected readonly caption = computed(() => {
    const budget = this.budget();
    const currency = this.currency();

    if (budget === null) {
      return `${formatMoney(this.spent(), currency)} ausgegeben · kein Budget`;
    }

    // Über Cent gerechnet, damit die Restanzeige nicht durch Gleitkomma-Reste danebenliegt.
    const remainingCents = Math.round(budget * 100) - Math.round(this.spent() * 100);
    const remaining = Math.abs(remainingCents) / 100;

    return remainingCents < 0
      ? `${formatMoney(this.spent(), currency)} von ${formatMoney(budget, currency)} · ${formatMoney(remaining, currency)} darüber`
      : `${formatMoney(this.spent(), currency)} von ${formatMoney(budget, currency)} · ${formatMoney(remaining, currency)} übrig`;
  });
}
