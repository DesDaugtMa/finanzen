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
      fieldset {
        min-width: 0;
        border: 0;
        padding: 0;
        margin: 0;
      }
      .color-swatch {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--fin-touch-min);
        height: var(--fin-touch-min);
        padding: 0;
        border: 0;
        border-radius: var(--fin-radius-md);
        color: #fff;
        cursor: pointer;
        transition:
          transform var(--fin-duration-fast) var(--fin-ease-spring),
          box-shadow var(--fin-duration-fast) var(--fin-ease-out);
      }
      @media (hover: hover) {
        .color-swatch:hover {
          transform: scale(1.08);
        }
      }
      /* Auswahl als abgesetzter Ring in Flächenfarbe plus Häkchen: der Ring
         funktioniert auf jeder Farbe, das Häkchen macht die Auswahl auch ohne
         Farbwahrnehmung eindeutig. */
      .color-swatch--selected {
        box-shadow:
          0 0 0 2px var(--fin-surface),
          0 0 0 4px var(--fin-text-strong);
      }
      .color-swatch:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: 3px;
      }
      legend.form-label {
        float: none;
        width: auto;
        padding: 0;
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
