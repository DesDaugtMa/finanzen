import { ChangeDetectionStrategy, Component } from '@angular/core';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/**
 * Der Reiter „Statistiken“ — noch ohne Inhalt.
 *
 * Bewusst ein sichtbarer, erklärter Leerzustand statt eines abgeschalteten
 * Reiters: ein toter Reiter liest sich wie ein Fehler, ein erklärter Platzhalter
 * sagt, dass hier etwas entsteht. Der gewählte Zeitraum gilt hier später
 * unverändert weiter, deshalb steht die Auswahl schon jetzt über den Reitern.
 */
@Component({
  selector: 'app-statistics-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <app-empty-state
      icon="bar-chart-line"
      title="Statistiken sind in Arbeit"
      message="Auswertungen zum gewählten Zeitraum folgen in einer der nächsten Versionen."
    />
  `,
})
export class StatisticsTabComponent {}
