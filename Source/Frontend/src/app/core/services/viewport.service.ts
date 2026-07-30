import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';

/**
 * Breite, ab der die Oberfläche von Mobil- auf Tablet-/Desktop-Layout umschaltet.
 * Muss mit dem Umschaltpunkt der SCSS-Schichten übereinstimmen (48rem) — sonst
 * driften CSS-Layout und die hier gesteuerten Templates auseinander.
 */
const WIDE_QUERY = '(min-width: 48rem)';

/**
 * Stellt den aktuellen Breakpoint als Signal bereit.
 *
 * Gedacht für die Fälle, in denen es *nicht* genügt, eine Variante per CSS
 * auszublenden: eine Tabelle mit Dutzenden Zeilen bleibt trotz `display: none`
 * im DOM und kostet auf dem Smartphone Speicher und Layout-Zeit. Für rein
 * gestalterische Unterschiede bleiben Media Queries das richtige Mittel — diese
 * Klasse ist nur für den Wechsel *ganzer Darstellungsformen* da.
 */
@Injectable({ providedIn: 'root' })
export class ViewportService {
  private readonly document = inject(DOCUMENT);

  private readonly wide = signal(false);

  /** `true` ab Tablet-Breite. */
  readonly isWide = this.wide.asReadonly();

  /** `true` auf schmalen Displays (Smartphone). */
  readonly isCompact = computed(() => !this.wide());

  constructor() {
    const view = this.document.defaultView;
    if (!view?.matchMedia) return;

    const query = view.matchMedia(WIDE_QUERY);
    this.wide.set(query.matches);

    // Der Service lebt so lange wie die Anwendung; ein Abmelden erübrigt sich.
    query.addEventListener('change', (event) => this.wide.set(event.matches));
  }
}
