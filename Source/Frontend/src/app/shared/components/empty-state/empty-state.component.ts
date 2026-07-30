import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Einheitlicher Leerzustand: Symbol, Überschrift, erklärender Text und optional eine
 * Handlung. Über `<ng-content>` lassen sich beliebige Schaltflächen einsetzen.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card border-0 empty-state">
      <div class="card-body text-center p-4 p-sm-5">
        <span class="empty-icon mx-auto mb-3" aria-hidden="true"
          ><i class="bi bi-{{ icon() }}"></i
        ></span>
        <h3 class="h6 fw-bold mb-1">{{ title() }}</h3>
        @if (message()) {
          <p class="text-muted mb-4">{{ message() }}</p>
        }
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .empty-state {
        border-radius: 1rem;
        border: 1px dashed var(--bs-border-color) !important;
        background-color: var(--color-surface);
      }
      .empty-icon {
        width: 3.25rem;
        height: 3.25rem;
        border-radius: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: var(--bs-primary-bg-subtle);
        color: var(--bs-primary);
        font-size: 1.5rem;
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly message = input('');
}
