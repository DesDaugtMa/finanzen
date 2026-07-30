import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { ThemePreference, ThemeService } from '../../../core/services/theme.service';

interface ThemeOption {
  value: ThemePreference;
  label: string;
  icon: string;
}

/**
 * Umschalter für das Erscheinungsbild.
 *
 * Umgesetzt als `radiogroup` und nicht als Schalter, weil es drei Zustände gibt:
 * ohne wählbares „System“ käme man nie zur Automatik zurück. Pfeiltasten wandern
 * durch die Optionen — das erwartet das ARIA-Muster für Radiogruppen.
 */
@Component({
  selector: 'app-theme-switch',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fin-theme-switch" role="radiogroup" aria-label="Erscheinungsbild">
      @for (option of options; track option.value) {
        <button
          type="button"
          role="radio"
          class="fin-theme-switch__option"
          [attr.aria-checked]="themeService.preference() === option.value"
          [tabindex]="themeService.preference() === option.value ? 0 : -1"
          [attr.aria-label]="compact() ? option.label : null"
          [title]="option.label"
          (click)="select(option.value)"
          (keydown)="onKeydown($event)"
        >
          <i class="bi bi-{{ option.icon }}" aria-hidden="true"></i>
          @if (!compact()) {
            <span>{{ option.label }}</span>
          }
        </button>
      }
    </div>
  `,
})
export class ThemeSwitchComponent {
  /** Zeigt nur die Symbole — für enge Stellen wie das Kontomenü. */
  readonly compact = input(false);

  protected readonly themeService = inject(ThemeService);

  protected readonly options: readonly ThemeOption[] = [
    { value: 'system', label: 'System', icon: 'circle-half' },
    { value: 'light', label: 'Hell', icon: 'sun' },
    { value: 'dark', label: 'Dunkel', icon: 'moon-stars' },
  ];

  protected select(preference: ThemePreference): void {
    this.themeService.setPreference(preference);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const values = this.options.map((option) => option.value);
    const currentIndex = values.indexOf(this.themeService.preference());

    let nextIndex: number;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = (currentIndex + 1) % values.length;
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = (currentIndex - 1 + values.length) % values.length;
        break;
      default:
        return;
    }

    event.preventDefault();
    this.select(values[nextIndex]);

    // Der Fokus wandert mit der Auswahl — so verlangt es das Radiogruppen-Muster.
    const group = (event.currentTarget as HTMLElement).parentElement;
    (group?.children[nextIndex] as HTMLElement | undefined)?.focus();
  }
}
