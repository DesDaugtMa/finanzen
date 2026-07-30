import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DEFAULT_ACCENT_COLOR } from '../../utils/color-presets';
import { DEFAULT_CATEGORY_ICON } from '../../utils/category-icons';

/**
 * Einheitliche Darstellung einer Kategorie: Symbol in der Kategoriefarbe plus Name.
 * Ohne Kategorie wird das ausdrücklich als „Ohne Kategorie“ ausgewiesen, statt die
 * Zeile leer zu lassen.
 */
@Component({
  selector: 'app-category-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="category" [class.category--muted]="!name()">
      <span
        class="category-icon"
        [style.background-color]="tint()"
        [style.color]="accent()"
        aria-hidden="true"
      >
        <i class="bi bi-{{ iconName() }}"></i>
      </span>
      @if (showLabel()) {
        <span class="category-name fin-truncate">{{ name() ?? 'Ohne Kategorie' }}</span>
      }
    </span>
  `,
  styles: [
    `
      .category {
        display: inline-flex;
        align-items: center;
        gap: var(--fin-space-2);
        min-width: 0;
        max-width: 100%;
      }
      .category-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 2rem;
        height: 2rem;
        border-radius: var(--fin-radius-sm);
        font-size: var(--fin-text-base);
      }
      .category-name {
        min-width: 0;
        font-weight: 500;
      }
      /* „Ohne Kategorie“ ist kein Name, sondern eine Aussage über das Fehlen
         eines Namens — kursiv und gedämpft macht diesen Unterschied sichtbar. */
      .category--muted .category-name {
        color: var(--fin-text-muted);
        font-style: italic;
        font-weight: 400;
      }
    `,
  ],
})
export class CategoryBadgeComponent {
  /** `null` steht für Buchungen ohne Kategorie. */
  readonly name = input<string | null>(null);
  readonly color = input<string | null>(null);
  readonly icon = input<string | null>(null);
  readonly showLabel = input(true);

  protected readonly iconName = computed(() => this.icon() ?? DEFAULT_CATEGORY_ICON);
  protected readonly accent = computed(() => this.color() ?? DEFAULT_ACCENT_COLOR);

  /** Sanfter Hintergrund aus derselben Farbe — der Kontrast des Symbols bleibt erhalten. */
  protected readonly tint = computed(() => `color-mix(in srgb, ${this.accent()} 14%, transparent)`);
}
