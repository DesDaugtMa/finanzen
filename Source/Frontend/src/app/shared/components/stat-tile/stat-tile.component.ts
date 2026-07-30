import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MoneyAmountComponent, MoneyTone } from '../money-amount/money-amount.component';

/**
 * Kennzahl-Kachel für Übersichten: Beschriftung, Geldbetrag und optionaler
 * Zusatzhinweis. Der Betrag läuft über <code>app-money-amount</code>, damit
 * Formatierung und Vorzeichen überall identisch aussehen.
 */
@Component({
  selector: 'app-stat-tile',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent],
  template: `
    <div class="stat-tile h-100">
      <div class="d-flex align-items-center gap-2 mb-1">
        <i class="bi bi-{{ icon() }} stat-icon" aria-hidden="true"></i>
        <span class="stat-label text-uppercase">{{ label() }}</span>
      </div>

      <app-money-amount [amount]="amount()" [currency]="currency()" [tone]="tone()" size="lg" />

      @if (hint()) {
        <p class="stat-hint mb-0">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }
      .stat-tile {
        background-color: var(--color-surface);
        border: 1px solid var(--bs-border-color-translucent);
        border-radius: 1rem;
        padding: 1rem;
      }
      .stat-label {
        font-size: 0.7rem;
        letter-spacing: 0.06em;
        color: var(--bs-secondary-color);
      }
      .stat-icon {
        color: var(--bs-secondary-color);
        font-size: 0.9rem;
      }
      .stat-hint {
        margin-top: 0.25rem;
        font-size: 0.8125rem;
        color: var(--bs-secondary-color);
      }
    `,
  ],
})
export class StatTileComponent {
  readonly label = input.required<string>();
  readonly amount = input.required<number>();
  readonly currency = input.required<string>();
  readonly icon = input('graph-up');
  readonly tone = input<MoneyTone>('neutral');
  readonly hint = input('');
}
