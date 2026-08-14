import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MoneyAmountComponent } from '../money-amount/money-amount.component';
import { formatMoney } from '../../utils/money.util';

/**
 * Der zweite Kontostand: der Stand, den die Bank gerade zeigt — also ohne die
 * Buchungen, die zwar erfasst, aber noch nicht abgebucht sind.
 *
 * Er steht bewusst kleiner und ruhiger unter dem eigentlichen Kontostand. Die
 * führende Zahl bleibt der Stand nach der Abbuchung, weil er die Frage „was kann
 * ich noch ausgeben" beantwortet; diese Zeile beantwortet nur die Nebenfrage
 * „was steht gerade im Banking".
 *
 * Sie erscheint immer, auch wenn nichts offen ist — dann sind beide Zahlen gleich.
 * Das hält die Höhe der Karten und Kacheln stabil, und die Bedeutung des großen
 * Betrags bleibt an jeder Stelle dieselbe.
 *
 * `variant="on-brand"` schaltet auf die Vorderfarben der Markenfläche um; auf
 * normalen Flächen gilt die gedämpfte Textfarbe.
 */
@Component({
  selector: 'app-settled-balance',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent],
  template: `
    <p class="settled" [class.settled--on-brand]="variant() === 'on-brand'">
      <i class="bi bi-bank settled__icon" aria-hidden="true"></i>
      <span class="settled__label">Laut Bank</span>
      <app-money-amount
        class="settled__amount"
        size="sm"
        [amount]="amount()"
        [currency]="currency()"
      />
      @if (pendingCount() > 0) {
        <span class="visually-hidden">{{ pendingText() }}</span>
      }
    </p>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .settled {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0 var(--fin-space-2);
        margin: var(--fin-space-1) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
      .settled__icon {
        font-size: 0.9em;
        opacity: 0.8;
      }
      .settled__label {
        /* Die Beschriftung tritt hinter die Zahl zurück, ohne unter den
           Kontrastwert für kleinen Text zu fallen. */
        letter-spacing: var(--fin-tracking-wide);
      }
      /* Der Betrag behält bewusst die Darstellung aus app-money-amount — ein
         negativer Stand „laut Bank" soll genauso rot sein wie überall sonst. */
      .settled--on-brand {
        color: var(--fin-on-brand-text-muted);
      }
    `,
  ],
})
export class SettledBalanceComponent {
  readonly amount = input.required<number>();
  readonly currency = input.required<string>();
  readonly variant = input<'default' | 'on-brand'>('default');

  /** Nur für die Vorlese-Erklärung: wie viele Buchungen hier herausgerechnet sind. */
  readonly pendingCount = input(0);
  readonly pendingTotal = input(0);

  protected readonly pendingText = computed(() => {
    const count = this.pendingCount();
    const label = count === 1 ? 'Buchung' : 'Buchungen';

    return `ohne ${count} noch nicht abgebuchte ${label} über ${formatMoney(
      this.pendingTotal(),
      this.currency(),
    )}`;
  });
}
