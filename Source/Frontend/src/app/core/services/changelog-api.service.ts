import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { OfflineCacheService, Sourced } from './offline-cache.service';
import { Changelog } from '../models/changelog.model';

/** Schlüssel des Zwischenspeichers — der Changelog ist für alle Nutzer derselbe. */
const CACHE_KEY = 'changelog';

/**
 * Der Changelog der Anwendung.
 *
 * Der Dienst merkt sich zusätzlich die aktuelle Versionsnummer, weil die Navigation sie
 * an ihrem Link zeigt. Sie wird höchstens einmal je Sitzung geholt und offline aus dem
 * Zwischenspeicher gelesen — der Link soll niemals auf eine Antwort des Servers warten.
 */
@Injectable({ providedIn: 'root' })
export class ChangelogApiService {
  private readonly api = inject(ApiService);
  private readonly offlineCache = inject(OfflineCacheService);

  private readonly resource = 'changelog';

  private readonly currentVersionState = signal<string | null>(null);

  /** Jüngste veröffentlichte Version, sobald sie bekannt ist. */
  readonly currentVersion = this.currentVersionState.asReadonly();

  /** Verhindert, dass jedes Öffnen des Kontomenüs eine neue Anfrage auslöst. */
  private versionRequested = false;

  /** Alle Versionen — offline der zuletzt geladene Stand samt Zeitpunkt. */
  get(): Observable<Sourced<Changelog>> {
    return this.offlineCache
      .withFallback<Changelog>(CACHE_KEY, this.api.get<Changelog>(this.resource))
      .pipe(tap((result) => this.currentVersionState.set(result.value.currentVersion)));
  }

  /**
   * Holt die Versionsnummer für die Navigation, falls sie noch fehlt. Schlägt der Aufruf
   * fehl, bleibt es beim Link ohne Version — ein nicht erreichbarer Changelog darf im
   * Kontomenü keine Fehlermeldung erzeugen.
   */
  ensureVersionLoaded(): void {
    if (this.versionRequested || this.currentVersionState() !== null) return;
    this.versionRequested = true;

    const cached = this.offlineCache.read<Changelog>(CACHE_KEY);
    if (cached) this.currentVersionState.set(cached.payload.currentVersion);

    this.get().subscribe({
      error: () => {
        // Erneut versuchen, sobald das Menü das nächste Mal geöffnet wird.
        this.versionRequested = false;
      },
    });
  }
}
