import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { formatMoney } from '../../utils/money.util';

/** Ein Kreissegment. */
export interface DonutSegment {
  /** Eindeutig innerhalb des Charts — dient als Track-Schlüssel. */
  key: string;
  label: string;
  value: number;
  /** Anteil in Prozent (0–100). Kommt fertig gerechnet herein, damit nichts doppelt gerundet wird. */
  share: number;
  color: string;
  /** Bootstrap-Icon ohne Präfix, optional. */
  icon?: string | null;
}

interface PlottedSegment extends DonutSegment {
  /** `länge lücke` für `stroke-dasharray` bei einem Umfang von exakt 100. */
  dashArray: string;
  dashOffset: number;
}

/** Radius, bei dem der Umfang genau 100 beträgt — dann ist ein Prozent gleich eine Einheit. */
const RADIUS = 15.915494;
const CENTER = 21;

@Component({
  selector: 'app-donut-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (plotted().length === 0) {
      <p class="donut-empty">{{ emptyMessage() }}</p>
    } @else {
      <div class="donut">
        <div class="donut__figure">
          <svg viewBox="0 0 42 42" role="img" [attr.aria-label]="ariaLabel()">
            <circle class="donut__track" [attr.cx]="center" [attr.cy]="center" [attr.r]="radius" />

            @for (segment of plotted(); track segment.key) {
              <circle
                class="donut__segment"
                [class.donut__segment--dimmed]="isDimmed(segment.key)"
                [attr.cx]="center"
                [attr.cy]="center"
                [attr.r]="radius"
                [attr.stroke]="segment.color"
                [attr.stroke-dasharray]="segment.dashArray"
                [attr.stroke-dashoffset]="segment.dashOffset"
              />
            }
          </svg>

          <!-- Die Mitte trägt die Aussage: ohne Auswahl die Summe, mit Auswahl das
               gewählte Segment. So bleibt der Blick beim Antippen an einer Stelle. -->
          <div class="donut__center" aria-hidden="true">
            <span class="donut__center-label">{{ centerLabel() }}</span>
            <span class="donut__center-value">{{ centerValue() }}</span>
            @if (centerShare()) {
              <span class="donut__center-share">{{ centerShare() }}</span>
            }
          </div>
        </div>

        <ul class="donut__legend">
          @for (segment of plotted(); track segment.key) {
            <li>
              <button
                type="button"
                class="donut__entry"
                [class.donut__entry--active]="segment.key === selectedKey()"
                [attr.aria-pressed]="segment.key === selectedKey()"
                (click)="toggle(segment.key)"
              >
                <span
                  class="donut__swatch"
                  [style.background-color]="segment.color"
                  aria-hidden="true"
                >
                  @if (segment.icon) {
                    <i class="bi bi-{{ segment.icon }}"></i>
                  }
                </span>
                <span class="donut__name">{{ segment.label }}</span>
                <span class="donut__share">{{ formatShare(segment.share) }}</span>
                <span class="donut__value">{{ formatValue(segment.value) }}</span>
              </button>
            </li>
          }
        </ul>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }

      .donut-empty {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
      }

      .donut {
        display: grid;
        gap: var(--fin-space-4);
      }

      .donut__figure {
        position: relative;
        justify-self: center;
        width: min(100%, 14rem);
      }
      .donut__figure svg {
        display: block;
        width: 100%;
        height: auto;
      }

      .donut__track {
        fill: none;
        stroke: var(--fin-surface-active);
        stroke-width: 5;
      }
      .donut__segment {
        fill: none;
        stroke-width: 5;
        transition:
          stroke-width var(--fin-duration-fast) var(--fin-ease-out),
          opacity var(--fin-duration-fast) var(--fin-ease-out);
      }
      .donut__segment--dimmed {
        opacity: 0.28;
      }

      .donut__center {
        position: absolute;
        inset: 22%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 0.1rem;
        text-align: center;
      }
      .donut__center-label {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-2xs);
        line-height: var(--fin-leading-snug);
        /* Lange Kategorienamen dürfen den Kreis nicht sprengen. */
        overflow-wrap: anywhere;
      }
      .donut__center-value {
        font-size: var(--fin-text-md);
        font-weight: 680;
        font-variant-numeric: tabular-nums;
        letter-spacing: var(--fin-tracking-tight);
      }
      .donut__center-share {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-2xs);
        font-variant-numeric: tabular-nums;
      }

      .donut__legend {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-1);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .donut__entry {
        display: grid;
        grid-template-columns: auto 1fr auto auto;
        align-items: center;
        gap: var(--fin-space-2);
        width: 100%;
        min-height: var(--fin-touch-min);
        padding: var(--fin-space-2);
        border: 0;
        border-radius: var(--fin-radius-sm);
        background-color: transparent;
        color: inherit;
        text-align: start;
        cursor: pointer;
        transition: background-color var(--fin-duration-fast) var(--fin-ease-out);
      }
      .donut__entry:hover,
      .donut__entry--active {
        background-color: var(--fin-surface-hover);
      }
      .donut__entry:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: 1px;
      }

      .donut__swatch {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: var(--fin-radius-xs);
        color: #fff;
        font-size: var(--fin-text-xs);
      }
      .donut__name {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--fin-text-base);
      }
      .donut__share {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        font-variant-numeric: tabular-nums;
      }
      .donut__value {
        font-size: var(--fin-text-sm);
        font-weight: 650;
        font-variant-numeric: tabular-nums;
      }

      @media (min-width: 48rem) {
        .donut {
          grid-template-columns: minmax(0, 15rem) minmax(0, 1fr);
          align-items: center;
          gap: var(--fin-space-6);
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .donut__segment,
        .donut__entry {
          transition: none;
        }
      }
    `,
  ],
})
export class DonutChartComponent {
  readonly segments = input.required<readonly DonutSegment[]>();
  readonly currency = input.required<string>();
  readonly ariaLabel = input.required<string>();
  /** Beschriftung der Mitte, solange nichts ausgewählt ist. */
  readonly totalLabel = input('Gesamt');
  readonly emptyMessage = input('Für diesen Zeitraum gibt es nichts auszuwerten.');

  protected readonly radius = RADIUS;
  protected readonly center = CENTER;

  private readonly chosenKey = signal<string | null>(null);

  protected readonly plotted = computed<PlottedSegment[]>(() => {
    let consumed = 0;

    return this.segments().map((segment) => {
      const share = Math.max(0, segment.share);
      const plotted: PlottedSegment = {
        ...segment,
        dashArray: `${round(share)} ${round(100 - share)}`,
        // 25 Einheiten Versatz drehen den Startpunkt auf zwölf Uhr.
        dashOffset: round(25 - consumed),
      };

      consumed += share;
      return plotted;
    });
  });

  protected readonly selectedKey = computed(() => {
    const chosen = this.chosenKey();
    return this.plotted().some((segment) => segment.key === chosen) ? chosen : null;
  });

  private readonly selected = computed(() => {
    const key = this.selectedKey();
    return key === null ? null : (this.plotted().find((segment) => segment.key === key) ?? null);
  });

  protected readonly centerLabel = computed(() => this.selected()?.label ?? this.totalLabel());

  protected readonly centerValue = computed(() => {
    const selected = this.selected();
    const total = selected?.value ?? this.plotted().reduce((sum, item) => sum + item.value, 0);
    return formatMoney(total, this.currency());
  });

  protected readonly centerShare = computed(() => {
    const selected = this.selected();
    return selected === null ? '' : this.formatShare(selected.share);
  });

  protected isDimmed(key: string): boolean {
    const selected = this.selectedKey();
    return selected !== null && selected !== key;
  }

  /** Ein zweites Antippen hebt die Auswahl wieder auf — sonst käme man nicht zur Summe zurück. */
  protected toggle(key: string): void {
    this.chosenKey.update((current) => (current === key ? null : key));
  }

  protected formatValue(value: number): string {
    return formatMoney(value, this.currency());
  }

  protected formatShare(share: number): string {
    // Ganze Prozent lesen sich schneller; erst unter einem Prozent wird es feiner,
    // weil „0 %" bei einem echten Betrag falsch wirkt.
    const digits = share > 0 && share < 1 ? 1 : 0;
    return `${share.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;
  }
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
