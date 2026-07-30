import { ChangeDetectionStrategy, Component, DOCUMENT, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Hinweis auf eine neue Version der installierten App.
 *
 * Bewusst eine Leiste am unteren Rand und kein Dialog: eine neue Version ist
 * kein Fehler und darf die laufende Arbeit nicht unterbrechen. Neu geladen wird
 * nur auf ausdrückliche Bestätigung — ein automatischer Reload würde ein
 * halb ausgefülltes Buchungsformular verwerfen.
 */
@Component({
  selector: 'app-update-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (updateAvailable()) {
      <div class="fin-update-bar" role="status">
        <i class="bi bi-arrow-repeat" aria-hidden="true"></i>
        <p class="fin-update-bar__text">Eine neue Version von Finanzen ist verfügbar.</p>
        <button type="button" class="btn btn-sm" (click)="activate()">Neu laden</button>
        <button
          type="button"
          class="btn-close btn-close-white"
          aria-label="Hinweis ausblenden"
          (click)="dismiss()"
        ></button>
      </div>
    }
  `,
})
export class UpdateNoticeComponent {
  private readonly swUpdate = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);

  protected readonly updateAvailable = signal(false);

  constructor() {
    // Im Entwicklungsmodus und in Browsern ohne Service-Worker-Unterstützung ist
    // `isEnabled` false; dann gibt es nichts zu beobachten.
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => this.updateAvailable.set(true));
  }

  protected activate(): void {
    // Erst die neue Version aktivieren, dann neu laden — sonst lädt der Browser
    // erneut die alte Fassung aus dem Cache.
    this.swUpdate
      .activateUpdate()
      .then(() => this.document.defaultView?.location.reload())
      .catch(() => this.document.defaultView?.location.reload());
  }

  protected dismiss(): void {
    this.updateAvailable.set(false);
  }
}
