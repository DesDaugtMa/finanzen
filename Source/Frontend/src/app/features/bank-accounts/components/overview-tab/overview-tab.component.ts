import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AccountType } from '../../../../core/models/balance.model';
import { MonthSummary } from '../../../../core/models/month-summary.model';
import { AccountStatistics } from '../../../../core/models/account-statistics.model';
import { StatTileComponent } from '../../../../shared/components/stat-tile/stat-tile.component';
import { AccountBasicOverviewTabComponent } from '../basic-overview-tab/basic-overview-tab.component';
import { AccountTrendPanelComponent } from '../trend-panel/trend-panel.component';
import { AccountSpendingPanelComponent } from '../spending-panel/spending-panel.component';
import { AccountPlanComparisonPanelComponent } from '../plan-comparison-panel/plan-comparison-panel.component';
import { formatMoney } from '../../../../shared/utils/money.util';

/**
 * Die Übersicht des gewählten Monats. Rein anzeigend — verändert wird in den anderen
 * Bereichen.
 *
 * Girokonten bekommen die volle Auswertung: vier Kennzahlen, die alle nach vorn
 * schauen, darunter Verlauf, Gewichtung und Plan-Ist-Vergleich. Bilanz, Kontostand,
 * Einnahmen und Ausgaben stehen bereits im Kopf der Seite und werden hier bewusst
 * nicht wiederholt — sie hätten den Platz gekostet, den die Auswertungen brauchen.
 *
 * Alle anderen Kontotypen behalten die schlichte Übersicht: dort trägt ein
 * Tagesverlauf keine Aussage.
 */
@Component({
  selector: 'app-account-overview-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StatTileComponent,
    AccountBasicOverviewTabComponent,
    AccountTrendPanelComponent,
    AccountSpendingPanelComponent,
    AccountPlanComparisonPanelComponent,
  ],
  template: `
    @if (loading()) {
      <div
        class="fin-grid fin-grid--stats-compact"
        role="status"
        aria-label="Kennzahlen werden geladen"
      >
        @for (placeholder of skeletonSlots; track $index) {
          <div class="fin-panel stat-skeleton">
            <div class="fin-skeleton fin-skeleton--line-short"></div>
            <div class="fin-skeleton fin-skeleton--amount"></div>
          </div>
        }
      </div>
      <div class="fin-panel chart-skeleton">
        <div class="fin-skeleton fin-skeleton--line-short"></div>
        <div class="fin-skeleton chart-skeleton__area"></div>
      </div>
    } @else if (error()) {
      <div class="alert alert-danger overview-error" role="alert">
        <span>{{ error() }}</span>
        <button type="button" class="btn btn-sm btn-outline-danger" (click)="retry.emit()">
          Erneut versuchen
        </button>
      </div>
    } @else if (summary(); as data) {
      @if (statistics(); as stats) {
        <div class="fin-grid fin-grid--stats-compact overview-stats">
          <app-stat-tile
            size="sm"
            [label]="allowanceLabel()"
            [icon]="allowanceIcon()"
            [amount]="stats.dailyAllowance.amount"
            [currency]="data.currency"
            [hint]="allowanceHint()"
          />
          <app-stat-tile
            size="sm"
            label="Frei verfügbar"
            icon="piggy-bank"
            [amount]="data.disposable"
            [currency]="data.currency"
            [hint]="disposableHint()"
          />
          <app-stat-tile
            size="sm"
            label="Prognose Monatsende"
            icon="graph-up-arrow"
            [amount]="stats.forecast.amount"
            [currency]="data.currency"
            [hint]="forecastHint()"
          />
          <app-stat-tile
            size="sm"
            label="Kontostand"
            icon="wallet2"
            [amount]="data.currentBalance"
            [currency]="data.currency"
            [hint]="settledHint()"
          />
        </div>

        <div class="overview-panels">
          <app-account-trend-panel [statistics]="stats" />

          <app-account-spending-panel
            [spending]="data.spending"
            [currency]="data.currency"
            (showTransactions)="showTransactions.emit()"
          />

          <app-account-plan-comparison-panel [statistics]="stats" />
        </div>
      } @else {
        <app-account-basic-overview-tab
          [summary]="data"
          [month]="month()"
          (showTransactions)="showTransactions.emit()"
        />
      }
    }
  `,
  styles: [
    `
      .overview-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }
      .overview-stats {
        margin-bottom: var(--fin-space-4);
      }
      .overview-panels {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-4);
      }

      .stat-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-3);
        padding: var(--fin-space-3);
      }
      .chart-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-3);
        margin-top: var(--fin-space-4);
        padding: var(--fin-space-4);
      }
      .chart-skeleton__area {
        height: 8rem;
        border-radius: var(--fin-radius-md);
      }
    `,
  ],
})
export class AccountOverviewTabComponent {
  readonly summary = input<MonthSummary | null>(null);
  /**
   * Die Auswertungen. `null` für Kontotypen, die sie nicht bekommen — dann fällt die
   * Ansicht auf die schlichte Übersicht zurück.
   */
  readonly statistics = input<AccountStatistics | null>(null);
  readonly loading = input(false);
  readonly error = input('');
  readonly month = input.required<string>();
  /** Bestimmt, ob der Stand „laut Bank“ überhaupt eine eigene Aussage hat. */
  readonly accountType = input.required<AccountType>();

  readonly retry = output<void>();
  readonly showTransactions = output<void>();

  /** Anzahl der Platzhalter-Kacheln während des Ladens. */
  protected readonly skeletonSlots = [0, 1, 2, 3];

  // --- Maximale Ausgabe pro Tag ---------------------------------------

  /**
   * Ein abgeschlossener Monat hat keinen Spielraum mehr — dort steht dieselbe Kachel
   * für den erreichten Tagesschnitt. Der Titel muss das sagen, sonst liest sich eine
   * rückblickende Zahl wie eine Erlaubnis.
   */
  protected readonly allowanceLabel = computed(() =>
    this.statistics()?.dailyAllowance.mode === 'PastAverage'
      ? 'Ausgaben pro Tag'
      : 'Max. Ausgabe pro Tag',
  );

  protected readonly allowanceIcon = computed(() =>
    this.statistics()?.dailyAllowance.mode === 'PastAverage' ? 'clock-history' : 'speedometer2',
  );

  protected readonly allowanceHint = computed(() => {
    const stats = this.statistics();
    const data = this.summary();
    if (!stats || !data) return '';

    const allowance = stats.dailyAllowance;
    const open = formatMoney(allowance.openFixedCosts, data.currency);

    if (allowance.mode === 'PastAverage') {
      return `im Schnitt über ${allowance.days} Tage — der Monat ist abgeschlossen`;
    }

    // Reicht der Kontostand die offenen Fixkosten nicht mehr, steht die Kachel bei 0 €.
    // Ohne diesen Hinweis sähe das nach „nichts mehr übrig“ statt nach Unterdeckung aus.
    if (allowance.available < 0) {
      return `Der Kontostand deckt ${open} offene Fixkosten nicht — es fehlen ${formatMoney(-allowance.available, data.currency)}`;
    }

    const days = `${allowance.days} ${allowance.days === 1 ? 'Tag' : 'Tage'}`;
    const scope = allowance.mode === 'RemainingDays' ? `noch ${days}` : `alle ${days} des Monats`;

    return allowance.openFixedCosts > 0
      ? `${scope}, nach ${open} offenen Fixkosten`
      : `${scope} — keine offenen Fixkosten mehr`;
  });

  // --- Prognose --------------------------------------------------------

  protected readonly forecastHint = computed(() => {
    const stats = this.statistics();
    const data = this.summary();
    if (!stats || !data) return '';

    const forecast = stats.forecast;

    if (!forecast.isProjected) {
      return stats.position === 'Past'
        ? 'tatsächliches Ergebnis — der Monat ist abgeschlossen'
        : 'nach Fixkosten — für eine Hochrechnung fehlt noch der Verlauf';
    }

    const rate = formatMoney(forecast.dailyAverageExpenses, data.currency);
    const days = `${forecast.remainingDays} ${forecast.remainingDays === 1 ? 'Tag' : 'Tage'}`;

    return `erwartet bei ${rate} pro Tag über ${days}`;
  });

  // --- Übernommene Kennzahlen -----------------------------------------

  /**
   * Der Stand „laut Bank“ unter dem Kontostand. Gibt es offene Buchungen, sagt der
   * Hinweis zusätzlich, wie viele — sonst bliebe unerklärt, warum die beiden Zahlen
   * auseinanderlaufen.
   */
  protected readonly settledHint = computed(() => {
    const data = this.summary();
    // Nur Girokonten kennen den Zustand „erfasst, aber noch nicht abgebucht“.
    if (!data || this.accountType() !== 'CheckingAccount') return '';

    const settled = `Laut Bank ${formatMoney(data.settledBalance, data.currency)}`;
    if (data.pendingCount === 0) return settled;

    const label = data.pendingCount === 1 ? 'offene Buchung' : 'offene Buchungen';
    return `${settled} — ${data.pendingCount} ${label} über ${formatMoney(data.pendingTotal, data.currency)}`;
  });

  /**
   * Macht die Rechnung hinter „frei verfügbar“ sichtbar. Reichen die Einnahmen nicht,
   * steht die Kennzahl bei 0 € — dann hat die Unterdeckung Vorrang vor der Erklärung,
   * sonst verschwände sie hinter einer harmlos aussehenden Null.
   */
  protected readonly disposableHint = computed(() => {
    const data = this.summary();
    if (!data) return '';

    if (data.disposableShortfall > 0) {
      return `${formatMoney(data.disposableShortfall, data.currency)} über den Einnahmen dieses Monats`;
    }

    if (data.fixedCostCount === 0) {
      return 'Noch keine Fixkosten hinterlegt';
    }

    const fixed = formatMoney(data.fixedCosts, data.currency);
    const open = data.fixedCostOpenCount;

    return open === 0
      ? `nach ${fixed} Fixkosten und den variablen Ausgaben`
      : `nach ${fixed} Fixkosten (davon ${open} offen) und den variablen Ausgaben`;
  });
}
