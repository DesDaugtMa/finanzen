import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { CategorySpending } from '../../../../core/models/month-summary.model';
import {
  DonutChartComponent,
  DonutSegment,
} from '../../../../shared/components/donut-chart/donut-chart.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { DEFAULT_ACCENT_COLOR } from '../../../../shared/utils/color-presets';

/**
 * Ab wie vielen Kategorien die kleinsten zusammengefasst werden. Darüber werden die
 * Segmente so dünn, dass der Kreis mehr Striche als Aussage zeigt.
 */
const MAX_SEGMENTS = 6;

/** Farbe für die Sammelgruppe — bewusst neutral, sie steht für keine echte Kategorie. */
const OTHER_COLOR = '#94a3b8';

/**
 * Die Gewichtung der Ausgaben: welche Kategorie wie viel vom Monat ausmacht.
 *
 * Der Donut zeigt die Verhältnisse, die Legende die Zahlen dahinter — ein Kreis allein
 * beantwortet nie, um wie viel Geld es geht.
 */
@Component({
  selector: 'app-account-spending-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DonutChartComponent, EmptyStateComponent],
  template: `
    <section class="fin-panel" aria-labelledby="spendingHeading">
      <div class="fin-panel__body">
        <div class="panel-head">
          <h2 id="spendingHeading" class="panel-heading">Gewichtung der Ausgaben</h2>
          @if (segments().length > 0) {
            <p class="panel-note">Alle Ausgaben des Rechnungsmonats nach Kategorien.</p>
          }
        </div>

        @if (segments().length === 0) {
          <app-empty-state
            icon="receipt"
            title="Noch keine Ausgaben in diesem Monat"
            message="Sobald Buchungen erfasst sind, siehst du hier, wohin dein Geld fließt."
          >
            <button type="button" class="btn btn-primary" (click)="showTransactions.emit()">
              Zu den Transaktionen
            </button>
          </app-empty-state>
        } @else {
          <app-donut-chart
            [segments]="segments()"
            [currency]="currency()"
            ariaLabel="Gewichtung der Ausgaben nach Kategorien"
            totalLabel="Ausgaben"
          />

          @if (collapsedCount() > 0) {
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary panel-toggle"
              (click)="toggleAll()"
            >
              {{
                expanded()
                  ? 'Kleine Kategorien zusammenfassen'
                  : collapsedCount() + ' kleine Kategorien einzeln zeigen'
              }}
            </button>
          }
        }
      </div>
    </section>
  `,
  styles: [
    `
      .panel-head {
        margin-bottom: var(--fin-space-4);
      }
      .panel-heading {
        margin: 0;
        font-size: var(--fin-text-md);
      }
      .panel-note {
        margin: var(--fin-space-1) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .panel-toggle {
        margin-top: var(--fin-space-3);
      }
    `,
  ],
})
export class AccountSpendingPanelComponent {
  readonly spending = input.required<readonly CategorySpending[]>();
  readonly currency = input.required<string>();

  readonly showTransactions = output<void>();

  protected readonly expanded = signal(false);

  /** Wie viele Kategorien aktuell in „Sonstige“ stecken. 0 heißt: es gibt nichts aufzuklappen. */
  protected readonly collapsedCount = computed(() => {
    const relevant = this.relevant();
    return relevant.length > MAX_SEGMENTS ? relevant.length - (MAX_SEGMENTS - 1) : 0;
  });

  /** Nur echte Ausgaben; Kategorien mit 0 € würden als unsichtbares Segment nur die Legende füllen. */
  private readonly relevant = computed(() => this.spending().filter((item) => item.amount > 0));

  protected readonly segments = computed<DonutSegment[]>(() => {
    const relevant = this.relevant();
    const collapsed = this.collapsedCount();

    const toSegment = (item: CategorySpending): DonutSegment => ({
      key: String(item.categoryId ?? 'none'),
      label: item.categoryName,
      value: item.amount,
      share: item.share,
      color: item.categoryColor ?? DEFAULT_ACCENT_COLOR,
      icon: item.categoryIcon,
    });

    if (collapsed === 0 || this.expanded()) return relevant.map(toSegment);

    // Die Liste kommt absteigend sortiert — die letzten sind damit die kleinsten.
    const shown = relevant.slice(0, MAX_SEGMENTS - 1);
    const rest = relevant.slice(MAX_SEGMENTS - 1);

    return [
      ...shown.map(toSegment),
      {
        key: 'other',
        label: `Sonstige (${rest.length})`,
        value: rest.reduce((sum, item) => sum + item.amount, 0),
        share: rest.reduce((sum, item) => sum + item.share, 0),
        color: OTHER_COLOR,
        icon: 'three-dots',
      },
    ];
  });

  protected toggleAll(): void {
    this.expanded.update((value) => !value);
  }
}
