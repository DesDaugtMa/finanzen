import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CATEGORY_ICON_PRESETS } from '../../utils/category-icons';
import { DEFAULT_ACCENT_COLOR } from '../../utils/color-presets';

/**
 * Auswahl eines Symbols aus einer kuratierten Liste. Jede Schaltfläche trägt ihren
 * Klartext-Namen als Beschriftung für Screenreader, das Symbol selbst ist dekorativ.
 */
@Component({
  selector: 'app-icon-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset>
      <legend class="form-label mb-2">{{ label() }}</legend>
      <div class="icon-grid" role="radiogroup" [attr.aria-label]="label()">
        @for (preset of presets; track preset.value) {
          <button
            type="button"
            class="icon-option"
            role="radio"
            [attr.aria-checked]="preset.value === value()"
            [attr.aria-label]="preset.label"
            [attr.title]="preset.label"
            [class.icon-option--selected]="preset.value === value()"
            [style.color]="preset.value === value() ? accentColor() : null"
            (click)="valueChange.emit(preset.value)"
          >
            <i class="bi bi-{{ preset.value }}" aria-hidden="true"></i>
          </button>
        }
      </div>
    </fieldset>
  `,
  styles: [
    `
      fieldset {
        min-width: 0;
        border: 0;
        padding: 0;
        margin: 0;
      }
      .icon-grid {
        display: grid;
        /* auto-fill mit fester Mindestbreite: das Raster findet seine Spalten
           selbst und braucht keine Breakpoints. */
        grid-template-columns: repeat(auto-fill, minmax(var(--fin-touch-min), 1fr));
        gap: var(--fin-space-2);
      }
      .icon-option {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        aspect-ratio: 1;
        min-height: var(--fin-touch-min);
        border: 1px solid var(--fin-border);
        border-radius: var(--fin-radius-sm);
        background-color: var(--fin-surface);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-md);
        cursor: pointer;
        transition:
          transform var(--fin-duration-fast) var(--fin-ease-out),
          border-color var(--fin-duration-fast) var(--fin-ease-out),
          background-color var(--fin-duration-fast) var(--fin-ease-out);
      }
      @media (hover: hover) {
        .icon-option:hover:not(.icon-option--selected) {
          transform: translateY(-1px);
          border-color: var(--fin-border-strong);
          background-color: var(--fin-surface-hover);
        }
      }
      /* Die Auswahl trägt die Kategoriefarbe (per Style-Bindung) — Rahmen und
         getönte Fläche greifen diese Farbe über currentColor auf. */
      .icon-option--selected {
        border-color: currentcolor;
        background-color: color-mix(in srgb, currentcolor 12%, var(--fin-surface));
      }
      .icon-option:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: 2px;
      }
      legend.form-label {
        float: none;
        width: auto;
        padding: 0;
      }
    `,
  ],
})
export class IconPickerComponent {
  readonly value = input.required<string>();
  readonly label = input('Symbol');
  /** Farbe der aktuellen Auswahl — zeigt Symbol und Farbe gemeinsam in der Vorschau. */
  readonly accentColor = input(DEFAULT_ACCENT_COLOR);

  readonly valueChange = output<string>();

  protected readonly presets = CATEGORY_ICON_PRESETS;
}
