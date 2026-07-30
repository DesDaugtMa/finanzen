import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * Einheitlicher Leerzustand: Symbol, Überschrift, erklärender Text und optional eine
 * Handlung. Über `<ng-content>` lassen sich beliebige Schaltflächen einsetzen.
 */
@Component({
  selector: 'app-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fin-panel fin-panel--dashed empty-state">
      <span class="fin-emblem fin-emblem--lg" aria-hidden="true">
        <i class="bi bi-{{ icon() }}"></i>
      </span>
      <h3 class="empty-title">{{ title() }}</h3>
      @if (message()) {
        <p class="empty-message">{{ message() }}</p>
      }
      <!--
        Eigener Wrapper, weil dieses Stylesheet projizierte Knoten nicht direkt
        treffen kann. Das :not(:empty) sorgt dafür, dass ohne projizierte Handlung
        auch kein Leerraum entsteht — Angular entfernt Whitespace-Knoten, das
        Kriterium greift also zuverlässig.
      -->
      <div class="empty-action"><ng-content /></div>
    </div>
  `,
  styles: [
    `
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        /* gap statt Rand-Abstände: greift auch für die projizierte Handlung,
           die dieses Stylesheet nicht selbst treffen kann — und erzeugt keinen
           Leerraum, wenn kein Inhalt projiziert wurde. */
        gap: var(--fin-space-2);
        /* Gestrichelte Kante statt gefüllter Karte: signalisiert eine Fläche,
           die noch befüllt werden will, und nicht einen fertigen Inhalt. */
        padding: var(--fin-space-8) var(--fin-space-5);
        text-align: center;
      }
      @media (min-width: 34rem) {
        .empty-state {
          padding: var(--fin-space-12) var(--fin-space-8);
        }
      }
      .fin-emblem {
        margin-bottom: var(--fin-space-2);
      }
      .empty-title {
        margin: 0;
        font-size: var(--fin-text-md);
      }
      .empty-message {
        margin: 0;
        max-width: 34ch;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
      }
      .empty-action:not(:empty) {
        margin-top: var(--fin-space-4);
      }
    `,
  ],
})
export class EmptyStateComponent {
  readonly icon = input.required<string>();
  readonly title = input.required<string>();
  readonly message = input('');
}
