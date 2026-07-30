import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ACCENT_COLOR_PRESETS } from '../../utils/color-presets';

/**
 * Auswahl einer Akzentfarbe aus der festen Palette der App. Als Radiogruppe
 * umgesetzt, damit die Auswahl per Tastatur bedienbar und für Screenreader
 * benannt ist — die Farbe allein trägt keine Bedeutung.
 */
@Component({
  selector: 'app-color-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset>
      <legend class="form-label mb-2">{{ label() }}</legend>
      <div class="d-flex flex-wrap gap-2" role="radiogroup" [attr.aria-label]="label()">
        @for (preset of presets; track preset.value) {
          <button
            type="button"
            class="color-swatch"
            role="radio"
            [style.background-color]="preset.value"
            [attr.aria-checked]="preset.value === value()"
            [attr.aria-label]="preset.label"
            [class.color-swatch--selected]="preset.value === value()"
            (click)="valueChange.emit(preset.value)"
          >
            @if (preset.value === value()) {
              <i class="bi bi-check-lg" aria-hidden="true"></i>
            }
          </button>
        }
      </div>
    </fieldset>
  `,
  styles: [
    `
      .color-swatch {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.75rem;
        border: 2px solid transparent;
        color: #fff;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0;
        transition: transform 0.15s ease;
      }
      .color-swatch:hover {
        transform: scale(1.06);
      }
      .color-swatch--selected {
        border-color: var(--bs-body-color);
        box-shadow: 0 0 0 2px var(--color-surface) inset;
      }
      .color-swatch:focus-visible {
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
export class ColorPickerComponent {
  readonly value = input.required<string>();
  readonly label = input('Farbe');

  readonly valueChange = output<string>();

  protected readonly presets = ACCENT_COLOR_PRESETS;
}
