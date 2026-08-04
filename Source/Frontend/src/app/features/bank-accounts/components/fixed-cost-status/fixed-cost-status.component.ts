import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FixedCostStatus } from '../../../../core/models/fixed-cost.model';

/** Beschriftung, Symbol und Farbton je Stand — an einer Stelle, damit die Anzeige überall gleich ist. */
const STATUS_PRESETS: Record<FixedCostStatus, { label: string; icon: string; tone: string }> = {
  Open: { label: 'Offen', icon: 'circle', tone: 'outline' },
  Partial: { label: 'Teilweise gebucht', icon: 'circle-half', tone: 'warn' },
  Booked: { label: 'Gebucht', icon: 'check-circle-fill', tone: 'income' },
  Exceeded: { label: 'Über Plan', icon: 'exclamation-circle-fill', tone: 'expense' },
};

/**
 * Stand einer Fixkosten-Position. Der Unterschied steckt in Symbol und Text, nicht nur
 * in der Farbe — die Anzeige bleibt damit auch ohne Farbwahrnehmung eindeutig.
 */
@Component({
  selector: 'app-fixed-cost-status',
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
export class FixedCostStatusComponent {
  readonly status = input.required<FixedCostStatus>();

  protected readonly preset = computed(() => STATUS_PRESETS[this.status()]);
}
