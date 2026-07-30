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
      .icon-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(2.75rem, 1fr));
        gap: 0.35rem;
      }
      .icon-option {
        aspect-ratio: 1;
        min-height: 2.75rem;
        border-radius: 0.7rem;
        border: 1px solid var(--bs-border-color-translucent);
        background-color: var(--color-surface);
        color: var(--bs-secondary-color);
        font-size: 1.1rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition:
          transform 0.15s ease,
          border-color 0.15s ease;
      }
      .icon-option:hover {
        transform: translateY(-1px);
        border-color: var(--bs-border-color);
      }
      .icon-option--selected {
        border-width: 2px;
        border-color: currentColor;
      }
      .icon-option:focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: 2px;
      }
      legend.form-label {
        float: none;
        width: auto;
        font-size: 1rem;
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
