import { ChangeDetectionStrategy, Component, DOCUMENT, inject, input, output } from '@angular/core';

export interface TabItem {
  /** Stabiler Schlüssel, der auch in der URL steht. */
  id: string;
  label: string;
  /** Bootstrap-Icon-Name ohne Präfix. */
  icon: string;
  /** Optionale Zahl rechts neben dem Label, z. B. die Anzahl der Buchungen. */
  badge?: number | null;
}

/**
 * Tab-Leiste nach dem ARIA-Muster „Tabs mit manueller Aktivierung“: Pfeiltasten
 * wandern durch die Reiter, Enter/Leertaste wählt aus. Auf schmalen Displays
 * scrollt die Leiste horizontal, statt umzubrechen.
 */
@Component({
  selector: 'app-tab-nav',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="tab-scroll">
      <div class="tab-list" role="tablist" [attr.aria-label]="label()">
        @for (tab of tabs(); track tab.id) {
          <button
            type="button"
            role="tab"
            class="tab-button"
            [class.active]="tab.id === active()"
            [id]="'tab-' + tab.id"
            [attr.aria-selected]="tab.id === active()"
            [attr.aria-controls]="'panel-' + tab.id"
            [tabindex]="tab.id === active() ? 0 : -1"
            (click)="select(tab.id)"
            (keydown)="onKeydown($event)"
          >
            <i class="bi bi-{{ tab.icon }}" aria-hidden="true"></i>
            <span>{{ tab.label }}</span>
            @if (tab.badge !== null && tab.badge !== undefined) {
              <span class="tab-badge">{{ tab.badge }}</span>
            }
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      /* Horizontal scrollen statt umbrechen — auf dem Smartphone bleiben alle
         Reiter erreichbar, ohne dass die Leiste mehrzeilig wird. */
      .tab-scroll {
        overflow-x: auto;
        scrollbar-width: none;
        /* Einrastend scrollen: der angetippte Reiter bleibt nicht halb am Rand. */
        scroll-snap-type: x proximity;
        margin-inline: calc(-1 * var(--fin-space-1));
        padding: var(--fin-space-1);
      }
      .tab-scroll::-webkit-scrollbar {
        display: none;
      }
      /* Die Leiste liegt in einer eingesenkten Spur; der aktive Reiter hebt sich
         daraus als helle Fläche heraus. Ruhiger als gefärbte Pillen und
         funktioniert in hell wie dunkel gleich gut. */
      .tab-list {
        display: inline-flex;
        gap: 0.125rem;
        padding: 0.25rem;
        background-color: var(--fin-surface-sunken);
        border-radius: var(--fin-radius-md);
      }
      .tab-button {
        display: inline-flex;
        align-items: center;
        gap: var(--fin-space-2);
        min-height: var(--fin-touch-min);
        padding: 0 var(--fin-space-4);
        border: 0;
        border-radius: var(--fin-radius-sm);
        background-color: transparent;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
        font-weight: 600;
        white-space: nowrap;
        scroll-snap-align: start;
        cursor: pointer;
        transition:
          background-color var(--fin-duration-fast) var(--fin-ease-out),
          color var(--fin-duration-fast) var(--fin-ease-out),
          box-shadow var(--fin-duration-fast) var(--fin-ease-out);
      }
      .tab-button:hover:not(.active) {
        color: var(--fin-text-strong);
      }
      .tab-button.active {
        background-color: var(--fin-surface);
        color: var(--fin-text-strong);
        box-shadow: var(--fin-shadow-xs);
      }
      .tab-button:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: -2px;
      }
      .tab-badge {
        padding: 0.05rem 0.4rem;
        border-radius: var(--fin-radius-xs);
        background-color: var(--fin-surface-active);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-xs);
        font-variant-numeric: tabular-nums;
        line-height: 1.5;
      }
      .tab-button.active .tab-badge {
        background-color: var(--fin-accent-tint);
        color: var(--fin-accent-on-tint);
      }
    `,
  ],
})
export class TabNavComponent {
  readonly tabs = input.required<readonly TabItem[]>();
  readonly active = input.required<string>();
  readonly label = input('Bereiche');

  readonly activeChange = output<string>();

  private readonly document = inject(DOCUMENT);

  protected select(id: string): void {
    if (id !== this.active()) {
      this.activeChange.emit(id);
    }
  }

  /** Pfeiltasten sowie Pos1/Ende bewegen den Fokus zwischen den Reitern. */
  protected onKeydown(event: KeyboardEvent): void {
    const ids = this.tabs().map((tab) => tab.id);
    const currentIndex = ids.indexOf(this.active());
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;

    switch (event.key) {
      case 'ArrowRight':
        nextIndex = (currentIndex + 1) % ids.length;
        break;
      case 'ArrowLeft':
        nextIndex = (currentIndex - 1 + ids.length) % ids.length;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = ids.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const nextId = ids[nextIndex];
    this.activeChange.emit(nextId);

    // Der neue Reiter ist erst nach dem Rendern fokussierbar.
    queueMicrotask(() => this.document.getElementById(`tab-${nextId}`)?.focus());
  }
}
