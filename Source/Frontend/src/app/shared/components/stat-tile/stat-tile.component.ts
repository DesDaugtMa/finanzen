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
    <div class="stat-tile">
      <div class="stat-head">
        <span class="fin-emblem fin-emblem--sm fin-emblem--muted" aria-hidden="true">
          <i class="bi bi-{{ icon() }}"></i>
        </span>
        <span class="fin-eyebrow stat-label">{{ label() }}</span>
      </div>

      <app-money-amount [amount]="amount()" [currency]="currency()" [tone]="tone()" size="lg" />

      @if (hint()) {
        <p class="stat-hint">{{ hint() }}</p>
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
        display: flex;
        flex-direction: column;
        /* Gleiche Höhe im Raster, auch wenn nur ein Teil der Kacheln einen
           Zusatzhinweis hat. */
        height: 100%;
        padding: var(--fin-space-4);
        background-color: var(--fin-surface);
        border: 1px solid var(--fin-border-subtle);
        border-radius: var(--fin-radius-lg);
        box-shadow: var(--fin-shadow-sm);
      }
      .stat-head {
        display: flex;
        align-items: center;
        gap: var(--fin-space-2);
        margin-bottom: var(--fin-space-3);
      }
      .stat-label {
        /* Bricht bei langen Beschriftungen, statt die Kachel zu weiten. */
        min-width: 0;
      }
      .stat-hint {
        margin: var(--fin-space-1) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
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
