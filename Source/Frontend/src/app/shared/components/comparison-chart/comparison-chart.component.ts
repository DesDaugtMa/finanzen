import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatMoney } from '../../utils/money.util';

/** Ein Säulenpaar: was geplant war und was daraus wurde. */
export interface ComparisonGroup {
  /** Eindeutig innerhalb des Charts — dient als Track-Schlüssel. */
  key: string;
  label: string;
  planned: number;
  actual: number;
  /** Farbe der Ist-Säule. Ohne Angabe die Akzentfarbe. */
  color?: string | null;
}

interface PlottedGroup extends ComparisonGroup {
  plannedPercent: number;
  actualPercent: number;
  /** Ist über Plan — die Säule wechselt dann in die Ausgabenfarbe. */
  exceeded: boolean;
  plannedText: string;
  actualText: string;
  description: string;
}

/**
 * Gegenüberstellung von Plan und Ist als Säulenpaare.
 *
 * Bewusst je Kategorie ein Paar statt einer einzigen Gesamtsäule: die Summe kann
 * aufgehen, während einzelne Kategorien weit auseinanderlaufen — genau das soll der
 * Vergleich zeigen. Beide Zahlen stehen zusätzlich als Text unter dem Paar, damit das
 * Diagramm nichts trägt, was nicht auch lesbar ist.
 */
@Component({
  selector: 'app-comparison-chart',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (plotted().length === 0) {
      <p class="comparison-empty">{{ emptyMessage() }}</p>
    } @else {
      <p class="comparison-legend">
        <span class="comparison-legend__item">
          <span class="comparison-legend__swatch comparison-legend__swatch--planned"></span>
          {{ plannedLabel() }}
        </span>
        <span class="comparison-legend__item">
          <span class="comparison-legend__swatch comparison-legend__swatch--actual"></span>
          {{ actualLabel() }}
        </span>
      </p>

      <!-- Auf schmalen Displays wird gescrollt statt gequetscht: lieber wenige
           lesbare Paare im Blick als alle unlesbar nebeneinander. -->
      <div class="comparison-scroll" tabindex="0" role="group" [attr.aria-label]="ariaLabel()">
        <ul class="comparison-groups">
          @for (group of plotted(); track group.key) {
            <li class="comparison-group">
              <span class="visually-hidden">{{ group.description }}</span>

              <div class="comparison-track" aria-hidden="true">
                <span class="comparison-bar comparison-bar--planned">
                  <span class="comparison-fill" [style.height.%]="group.plannedPercent"></span>
                </span>
                <span class="comparison-bar comparison-bar--actual">
                  <span
                    class="comparison-fill"
                    [class.comparison-fill--exceeded]="group.exceeded"
                    [style.height.%]="group.actualPercent"
                    [style.background-color]="group.exceeded ? null : (group.color ?? null)"
                  ></span>
                </span>
              </div>

              <p class="comparison-label" aria-hidden="true">{{ group.label }}</p>
              <p class="comparison-values" aria-hidden="true">
                <span class="comparison-values__planned">{{ group.plannedText }}</span>
                <span
                  class="comparison-values__actual"
                  [class.comparison-values__actual--exceeded]="group.exceeded"
                >
                  @if (group.exceeded) {
                    <i class="bi bi-exclamation-triangle-fill"></i>
                  }
                  {{ group.actualText }}
                </span>
              </p>
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

      .comparison-empty {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
      }

      .comparison-legend {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fin-space-4);
        margin: 0 0 var(--fin-space-3);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .comparison-legend__item {
        display: inline-flex;
        align-items: center;
        gap: var(--fin-space-2);
      }
      .comparison-legend__swatch {
        width: 0.75rem;
        height: 0.75rem;
        border-radius: var(--fin-radius-xs);
      }
      .comparison-legend__swatch--planned {
        background-color: var(--fin-surface-active);
        border: 1px solid var(--fin-border-strong);
      }
      .comparison-legend__swatch--actual {
        background-color: var(--fin-accent);
      }

      .comparison-scroll {
        overflow-x: auto;
        overscroll-behavior-x: contain;
        padding-bottom: var(--fin-space-1);
      }
      .comparison-scroll:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: 2px;
        border-radius: var(--fin-radius-sm);
      }

      .comparison-groups {
        display: flex;
        align-items: flex-end;
        gap: var(--fin-space-3);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .comparison-group {
        flex: 0 0 auto;
        width: 5.25rem;
      }

      .comparison-track {
        display: flex;
        align-items: flex-end;
        justify-content: center;
        gap: var(--fin-space-1);
        height: 8.5rem;
        padding: 0 var(--fin-space-1);
        border-bottom: 1px solid var(--fin-border);
      }
      .comparison-bar {
        display: flex;
        align-items: flex-end;
        width: 1.25rem;
        height: 100%;
      }
      .comparison-fill {
        width: 100%;
        /* Eine Mindesthöhe hält auch winzige Beträge sichtbar — eine Säule der Höhe
           null ließe sich nicht von „gar kein Wert" unterscheiden. */
        min-height: 2px;
        border-radius: var(--fin-radius-xs) var(--fin-radius-xs) 0 0;
        background-color: var(--fin-accent);
        transition: height var(--fin-duration-slow) var(--fin-ease-out);
      }
      .comparison-bar--planned .comparison-fill {
        background-color: var(--fin-surface-active);
        border: 1px solid var(--fin-border-strong);
        border-bottom: 0;
      }
      .comparison-fill--exceeded {
        background-color: var(--fin-expense);
      }

      .comparison-label {
        margin: var(--fin-space-2) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-2xs);
        line-height: var(--fin-leading-snug);
        text-align: center;
        overflow-wrap: anywhere;
      }
      .comparison-values {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.05rem;
        margin: var(--fin-space-1) 0 0;
        font-size: var(--fin-text-2xs);
        font-variant-numeric: tabular-nums;
        text-align: center;
      }
      .comparison-values__planned {
        color: var(--fin-text-subtle);
      }
      .comparison-values__actual {
        display: inline-flex;
        align-items: center;
        gap: 0.15rem;
        font-weight: 650;
      }
      .comparison-values__actual--exceeded {
        color: var(--fin-expense);
      }

      @media (prefers-reduced-motion: reduce) {
        .comparison-fill {
          transition: none;
        }
      }
    `,
  ],
})
export class ComparisonChartComponent {
  readonly groups = input.required<readonly ComparisonGroup[]>();
  readonly currency = input.required<string>();
  readonly ariaLabel = input.required<string>();
  readonly plannedLabel = input('Geplant');
  readonly actualLabel = input('Ausgaben');
  readonly emptyMessage = input('Für diesen Zeitraum gibt es nichts zu vergleichen.');

  protected readonly plotted = computed<PlottedGroup[]>(() => {
    const groups = this.groups();
    const currency = this.currency();

    // Beide Reihen teilen sich eine Skala — nur dann sind Plan und Ist überhaupt
    // vergleichbar, und auch die Kategorien untereinander.
    const max = Math.max(0, ...groups.flatMap((group) => [group.planned, group.actual]));

    return groups.map((group) => {
      const plannedText = formatMoney(group.planned, currency);
      const actualText = formatMoney(group.actual, currency);
      const exceeded = group.planned > 0 && group.actual > group.planned;

      return {
        ...group,
        plannedPercent: max === 0 ? 0 : (group.planned / max) * 100,
        actualPercent: max === 0 ? 0 : (group.actual / max) * 100,
        exceeded,
        plannedText,
        actualText,
        description: exceeded
          ? `${group.label}: geplant ${plannedText}, ausgegeben ${actualText} — überschritten`
          : `${group.label}: geplant ${plannedText}, ausgegeben ${actualText}`,
      };
    });
  });
}
