import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DebtStatus } from '../../../../core/models/debt.model';

/** Beschriftung, Symbol und Farbton je Stand — an einer Stelle, damit die Anzeige überall gleich ist. */
const STATUS_PRESETS: Record<DebtStatus, { label: string; icon: string; tone: string }> = {
  Empty: { label: 'Ohne Buchung', icon: 'circle', tone: 'outline' },
  Open: { label: 'Offen', icon: 'hourglass-split', tone: 'warn' },
  Settled: { label: 'Beglichen', icon: 'check-circle-fill', tone: 'income' },
  Overpaid: { label: 'Zu viel zurück', icon: 'exclamation-circle-fill', tone: 'expense' },
};

/**
 * Stand eines Schuldeintrags. Der Unterschied steckt in Symbol und Text, nicht nur in
 * der Farbe — die Anzeige bleibt damit auch ohne Farbwahrnehmung eindeutig.
 */
@Component({
  selector: 'app-debt-status',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span
      class="fin-chip"
      [class.fin-chip--outline]="preset().tone === 'outline'"
      [class.fin-chip--warn]="preset().tone === 'warn'"
      [class.fin-chip--income]="preset().tone === 'income'"
      [class.fin-chip--expense]="preset().tone === 'expense'"
    >
      <i class="bi bi-{{ preset().icon }}" aria-hidden="true"></i>
      <span>{{ preset().label }}</span>
    </span>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        min-width: 0;
      }
    `,
  ],
})
export class DebtStatusComponent {
  readonly status = input.required<DebtStatus>();

  protected readonly preset = computed(() => STATUS_PRESETS[this.status()]);
}
