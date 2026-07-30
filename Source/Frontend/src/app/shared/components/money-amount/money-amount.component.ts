import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DEFAULT_CURRENCY, formatMoney, formatMoneyAbsolute } from '../../utils/money.util';

/**
 * Einheitliche Darstellung von Geldbeträgen.
 *
 * - `neutral`  – Salden und Summen: Vorzeichen kommt aus der Zahl selbst.
 * - `income`   – Einnahmen: `+` und Pfeil nach oben.
 * - `expense`  – Ausgaben: `−` und Pfeil nach unten.
 *
 * Die Richtung ist nie nur über die Farbe erkennbar (Vorzeichen und Symbol),
 * damit die Anzeige auch ohne Farbwahrnehmung eindeutig bleibt.
 */
export type MoneyTone = 'neutral' | 'income' | 'expense';
export type MoneySize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-money-amount',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="money"
      [class.money--negative]="isNegativeBalance()"
      [class.money--income]="tone() === 'income'"
      [class.money--expense]="tone() === 'expense'"
      [class.money--sm]="size() === 'sm'"
      [class.money--lg]="size() === 'lg'"
    >
      @if (tone() !== 'neutral') {
        <i
          class="bi"
          [class.bi-arrow-up-short]="tone() === 'income'"
          [class.bi-arrow-down-short]="tone() === 'expense'"
          aria-hidden="true"
        ></i>
      }
      <span aria-hidden="true">{{ display() }}</span>
      <span class="visually-hidden">{{ screenReaderText() }}</span>
    </span>
  `,
  styles: [
    `
      .money {
        display: inline-flex;
        align-items: center;
        gap: 0.15rem;
        font-variant-numeric: tabular-nums;
        font-weight: 600;
        white-space: nowrap;
      }
      .money--sm {
        font-size: 0.875rem;
      }
      .money--lg {
        font-size: 1.5rem;
        letter-spacing: -0.02em;
      }
      .money--negative,
      .money--expense {
        color: var(--color-expense);
      }
      .money--income {
        color: var(--color-income);
      }
      .bi {
        font-size: 1.1em;
        margin-inline-start: -0.15em;
      }
    `,
  ],
})
export class MoneyAmountComponent {
  readonly amount = input.required<number>();
  readonly currency = input<string>(DEFAULT_CURRENCY);
  readonly tone = input<MoneyTone>('neutral');
  readonly size = input<MoneySize>('md');

  /** Bei `neutral` färbt ein negativer Saldo den Betrag rot ein. */
  protected readonly isNegativeBalance = computed(
    () => this.tone() === 'neutral' && this.amount() < 0,
  );

  protected readonly display = computed(() => {
    const value = this.amount();
    const currency = this.currency();

    switch (this.tone()) {
      case 'income':
        return `+${formatMoneyAbsolute(value, currency)}`;
      case 'expense':
        return `−${formatMoneyAbsolute(value, currency)}`;
      default:
        return formatMoney(value, currency);
    }
  });

  protected readonly screenReaderText = computed(() => {
    const value = this.amount();
    const formatted = formatMoneyAbsolute(value, this.currency());

    switch (this.tone()) {
      case 'income':
        return `Einnahme ${formatted}`;
      case 'expense':
        return `Ausgabe ${formatted}`;
      default:
        return value < 0 ? `minus ${formatted}` : formatted;
    }
  });
}
