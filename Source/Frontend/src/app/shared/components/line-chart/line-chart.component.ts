import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { formatMoney } from '../../utils/money.util';

/** Ein Punkt im Verlauf. */
export interface LinePoint {
  /** Beschriftung über dem Chart, sobald der Punkt gewählt ist — ruhig ausführlich. */
  label: string;
  /** Kurzform für die Achse, z. B. der Tag `12`. Ohne Angabe steht dort `label`. */
  axis?: string;
  value: number;
  /** Vollständige, vorgelesene Beschreibung — sie trägt die Aussage für Screenreader. */
  description: string;
  /** Hebt den Punkt dauerhaft hervor, z. B. den heutigen Tag. */
  marked?: boolean;
}

/** Innerer Zustand eines Punktes, einmal berechnet statt im Template. */
interface PlottedPoint extends LinePoint {
  index: number;
  x: number;
  y: number;
  /** Nur beschriftete Punkte bekommen einen Achsentext, sonst wird die Achse unlesbar. */
  axisLabel: string;
}

/** Zeichenfläche in SVG-Einheiten. Bewusst fix — die Fläche skaliert proportional mit. */
const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 200;

/** Luft über und unter der Kurve, damit Spitzen nicht am Rand kleben. */
const PADDING_Y = 14;

/**
 * Linienchart für einen Verlauf über die Zeit.
 *
 * Die Fläche unter der Kurve ist zweifarbig: über der Nulllinie in der Farbe der
 * Einnahmen, darunter in der der Ausgaben. Damit ist auf einen Blick erkennbar, ab
 * wann ein Verlauf ins Minus kippt — die Kurve allein müsste man dafür an der Achse
 * ablesen.
 *
 * Bedienung: ein Tippen oder die Pfeiltasten wählen einen Punkt; die vollständige
 * Beschreibung erscheint über dem Chart. Zusätzlich stehen alle Werte als versteckte
 * Liste in der Vorlesereihenfolge, damit das Chart nicht nur ein Bild ist.
 */
@Component({
  selector: 'app-line-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (plotted().length === 0) {
      <p class="chart-empty">{{ emptyMessage() }}</p>
    } @else {
      <p class="chart-readout" aria-live="polite">
        <span class="chart-readout__label">{{ selectedPoint().label }}</span>
        <span class="chart-readout__value">{{ formatValue(selectedPoint().value) }}</span>
      </p>

      <div class="chart-frame">
        <svg
          class="chart-svg"
          [attr.viewBox]="'0 0 ' + viewWidth + ' ' + viewHeight"
          preserveAspectRatio="xMidYMid meet"
          role="img"
          [attr.aria-label]="ariaLabel()"
        >
          <defs>
            <clipPath [attr.id]="clipAboveId">
              <rect x="0" y="0" [attr.width]="viewWidth" [attr.height]="zeroY()" />
            </clipPath>
            <clipPath [attr.id]="clipBelowId">
              <rect
                x="0"
                [attr.y]="zeroY()"
                [attr.width]="viewWidth"
                [attr.height]="viewHeight - zeroY()"
              />
            </clipPath>
          </defs>

          <path
            class="chart-area chart-area--up"
            [attr.d]="areaPath()"
            [attr.clip-path]="clipAbove"
          />
          <path
            class="chart-area chart-area--down"
            [attr.d]="areaPath()"
            [attr.clip-path]="clipBelow"
          />

          <line
            class="chart-zero"
            x1="0"
            [attr.y1]="zeroY()"
            [attr.x2]="viewWidth"
            [attr.y2]="zeroY()"
          />

          <path class="chart-line" [attr.d]="linePath()" />

          <line
            class="chart-guide"
            [attr.x1]="selectedPoint().x"
            y1="0"
            [attr.x2]="selectedPoint().x"
            [attr.y2]="viewHeight"
          />
          <circle
            class="chart-dot"
            [attr.cx]="selectedPoint().x"
            [attr.cy]="selectedPoint().y"
            r="6"
          />
        </svg>

        <!-- Eine Trefferfläche je Punkt, gleichmäßig über das Chart verteilt. Sie
             liegt über dem Bild, weil ein SVG-Pfad kein angenehmes Tippziel ist. -->
        <div
          class="chart-hits"
          role="group"
          [attr.aria-label]="ariaLabel()"
          (keydown)="onKeydown($event)"
        >
          @for (point of plotted(); track point.index) {
            <button
              type="button"
              class="chart-hit"
              [class.chart-hit--active]="point.index === selectedIndex()"
              [attr.tabindex]="point.index === selectedIndex() ? 0 : -1"
              [attr.aria-pressed]="point.index === selectedIndex()"
              [attr.aria-label]="point.description"
              [attr.data-index]="point.index"
              (click)="select(point.index)"
              (focus)="select(point.index)"
            >
              <span class="visually-hidden">{{ point.description }}</span>
            </button>
          }
        </div>
      </div>

      <ul class="chart-axis" aria-hidden="true">
        @for (point of plotted(); track point.index) {
          <li class="chart-axis__tick">{{ point.axisLabel }}</li>
        }
      </ul>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .chart-empty {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
      }

      .chart-readout {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--fin-space-2);
        margin: 0 0 var(--fin-space-2);
        min-height: 1.75rem;
      }
      .chart-readout__label {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .chart-readout__value {
        font-size: var(--fin-text-lg);
        font-weight: 650;
        font-variant-numeric: tabular-nums;
        letter-spacing: var(--fin-tracking-tight);
      }

      .chart-frame {
        position: relative;
      }
      .chart-svg {
        display: block;
        width: 100%;
        height: auto;
        overflow: visible;
      }

      .chart-area {
        stroke: none;
      }
      .chart-area--up {
        fill: var(--fin-income-tint);
      }
      .chart-area--down {
        fill: var(--fin-expense-tint);
      }

      .chart-zero {
        stroke: var(--fin-border-strong);
        stroke-width: 1;
        stroke-dasharray: 4 4;
      }

      .chart-line {
        fill: none;
        stroke: var(--fin-accent);
        stroke-width: 2.5;
        stroke-linecap: round;
        stroke-linejoin: round;
      }

      .chart-guide {
        stroke: var(--fin-accent);
        stroke-width: 1;
        opacity: 0.35;
      }
      .chart-dot {
        fill: var(--fin-surface);
        stroke: var(--fin-accent);
        stroke-width: 2.5;
        transition:
          cx var(--fin-duration-fast) var(--fin-ease-out),
          cy var(--fin-duration-fast) var(--fin-ease-out);
      }

      .chart-hits {
        position: absolute;
        inset: 0;
        display: flex;
      }
      .chart-hit {
        flex: 1 1 0;
        min-width: 0;
        padding: 0;
        border: 0;
        background-color: transparent;
        cursor: pointer;
        border-radius: var(--fin-radius-xs);
      }
      .chart-hit:hover,
      .chart-hit--active {
        background-color: var(--fin-surface-hover);
        /* Nur ein zarter Schimmer — die Fläche darf die Kurve nicht überdecken. */
        opacity: 0.28;
      }
      .chart-hit:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: -2px;
      }

      .chart-axis {
        display: flex;
        gap: 0;
        margin: var(--fin-space-2) 0 0;
        padding: 0;
        list-style: none;
      }
      .chart-axis__tick {
        flex: 1 1 0;
        min-width: 0;
        color: var(--fin-text-subtle);
        font-size: var(--fin-text-2xs);
        font-variant-numeric: tabular-nums;
        text-align: center;
        white-space: nowrap;
      }

      @media (prefers-reduced-motion: reduce) {
        .chart-dot {
          transition: none;
        }
      }
    `,
  ],
})
export class LineChartComponent {
  readonly points = input.required<readonly LinePoint[]>();
  readonly currency = input.required<string>();
  readonly ariaLabel = input.required<string>();
  readonly emptyMessage = input('Für diesen Zeitraum gibt es noch keinen Verlauf.');

  /**
   * Jeder wievielte Punkt eine Achsenbeschriftung bekommt. Bei 31 Tagen stünden
   * sonst 31 Zahlen nebeneinander, von denen keine mehr lesbar wäre.
   */
  readonly labelEvery = input(7);

  protected readonly viewWidth = VIEW_WIDTH;
  protected readonly viewHeight = VIEW_HEIGHT;

  /** Eigene Ids, damit mehrere Charts auf einer Seite sich nicht die Clip-Pfade wegnehmen. */
  private static instances = 0;
  private readonly instanceId = `line-chart-${++LineChartComponent.instances}`;
  protected readonly clipAboveId = `${this.instanceId}-above`;
  protected readonly clipBelowId = `${this.instanceId}-below`;
  protected readonly clipAbove = `url(#${this.clipAboveId})`;
  protected readonly clipBelow = `url(#${this.clipBelowId})`;

  /** `null` heißt: noch nichts gewählt — dann führt der hervorgehobene oder letzte Punkt. */
  private readonly chosenIndex = signal<number | null>(null);

  private readonly scale = computed(() => {
    const values = this.points().map((point) => point.value);
    // Die Null gehört immer dazu: ohne sie läge die Nulllinie außerhalb der Fläche
    // und ein durchgehend positiver Verlauf sähe aus, als schwankte er um null.
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values);
    const span = max - min;

    return { min, max, span: span === 0 ? 1 : span };
  });

  protected readonly plotted = computed<PlottedPoint[]>(() => {
    const points = this.points();
    const count = points.length;
    if (count === 0) return [];

    const every = Math.max(1, this.labelEvery());
    const { max, span } = this.scale();
    const usableHeight = VIEW_HEIGHT - PADDING_Y * 2;

    return points.map((point, index) => ({
      ...point,
      index,
      // Mitte der eigenen Spalte statt Rand-an-Rand: nur so sitzen Punkt, Trefferfläche
      // und Achsenbeschriftung exakt übereinander — sie teilen sich dasselbe Raster.
      x: ((index + 0.5) / count) * VIEW_WIDTH,
      y: PADDING_Y + ((max - point.value) / span) * usableHeight,
      // Erster und letzter Punkt sind immer beschriftet: sie spannen den Zeitraum auf.
      axisLabel:
        index === 0 || index === count - 1 || index % every === 0
          ? (point.axis ?? point.label)
          : ' ',
    }));
  });

  protected readonly zeroY = computed(() => {
    const { max, span } = this.scale();
    return PADDING_Y + (max / span) * (VIEW_HEIGHT - PADDING_Y * 2);
  });

  protected readonly selectedIndex = computed(() => {
    const chosen = this.chosenIndex();
    const points = this.plotted();
    if (chosen !== null && chosen >= 0 && chosen < points.length) return chosen;

    // Ohne eigene Wahl führt der markierte Punkt — sonst der letzte, weil er den
    // aktuellen Stand trägt.
    const marked = points.findIndex((point) => point.marked);
    return marked >= 0 ? marked : points.length - 1;
  });

  protected readonly selectedPoint = computed(() => this.plotted()[this.selectedIndex()]);

  protected select(index: number): void {
    this.chosenIndex.set(index);
  }

  protected formatValue(value: number): string {
    return formatMoney(value, this.currency());
  }

  /**
   * Pfeiltasten wandern durch die Punkte, statt jeden einzeln antabben zu müssen —
   * bei 31 Tagen wären das sonst 31 Stationen im Tabfluss.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const last = this.plotted().length - 1;
    const current = this.selectedIndex();

    const target = ((): number | null => {
      switch (event.key) {
        case 'ArrowLeft':
          return Math.max(0, current - 1);
        case 'ArrowRight':
          return Math.min(last, current + 1);
        case 'Home':
          return 0;
        case 'End':
          return last;
        default:
          return null;
      }
    })();

    if (target === null) return;

    event.preventDefault();
    this.select(target);
    this.focusHit(event.currentTarget as HTMLElement, target);
  }

  private focusHit(container: HTMLElement, index: number): void {
    const button = container.querySelector<HTMLElement>(`[data-index="${index}"]`);
    button?.focus();
  }

  protected readonly linePath = computed(() =>
    this.plotted()
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${round(point.x)} ${round(point.y)}`)
      .join(' '),
  );

  protected readonly areaPath = computed(() => {
    const points = this.plotted();
    if (points.length === 0) return '';

    const zero = round(this.zeroY());
    const first = points[0];
    const last = points[points.length - 1];

    return [
      `M${round(first.x)} ${zero}`,
      ...points.map((point) => `L${round(point.x)} ${round(point.y)}`),
      `L${round(last.x)} ${zero}`,
      'Z',
    ].join(' ');
  });
}

/** Kürzt die Koordinaten — drei Nachkommastellen sind für 640 Einheiten Breite mehr als genug. */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
