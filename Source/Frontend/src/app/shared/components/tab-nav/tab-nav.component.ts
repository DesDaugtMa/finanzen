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
      <div class="nav nav-pills flex-nowrap gap-1" role="tablist" [attr.aria-label]="label()">
        @for (tab of tabs(); track tab.id) {
          <button
            type="button"
            role="tab"
            class="nav-link tab-button d-inline-flex align-items-center gap-2"
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
              <span class="badge tab-badge">{{ tab.badge }}</span>
            }
          </button>
        }
      </div>
    </div>
  `,
  styles: [
    `
      /* Horizontal scrollen statt umbrechen — auf dem Smartphone bleiben alle Reiter erreichbar. */
      .tab-scroll {
        overflow-x: auto;
        scrollbar-width: none;
        margin-inline: -0.25rem;
        padding: 0.25rem;
      }
      .tab-scroll::-webkit-scrollbar {
        display: none;
      }
      .tab-button {
        white-space: nowrap;
        min-height: 2.75rem;
        color: var(--bs-body-color);
        background-color: var(--color-surface);
        border: 1px solid var(--bs-border-color-translucent);
      }
      .tab-button:hover:not(.active) {
        background-color: var(--bs-tertiary-bg);
      }
      .tab-button.active {
        border-color: transparent;
      }
      .tab-button:focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: 2px;
      }
      .tab-badge {
        background-color: var(--bs-secondary-bg);
        color: var(--bs-secondary-color);
        font-variant-numeric: tabular-nums;
      }
      .tab-button.active .tab-badge {
        background-color: rgba(255, 255, 255, 0.25);
        color: #fff;
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
