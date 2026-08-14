import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { ApiError } from './api.service';
import { ConnectivityService } from './connectivity.service';

/** Ein zwischengespeicherter Datensatz samt dem Zeitpunkt, zu dem er geholt wurde. */
interface CacheEntry<T> {
  savedAt: string;
  payload: T;
}

/** Ein Ergebnis samt seiner Herkunft — frisch vom Server oder aus dem Zwischenspeicher. */
export interface Sourced<T> {
  value: T;
  /** True, wenn der Server nicht erreichbar war und der letzte bekannte Stand gezeigt wird. */
  fromCache: boolean;
  /** Wann die Daten geholt wurden. Nur bei `fromCache` gesetzt. */
  savedAt: Date | null;
}

const PREFIX = 'finanzen.cache.';

/**
 * Der letzte bekannte Stand lesender Abfragen, damit die App ohne Netz nicht
 * leer dasteht.
 *
 * Bewusst im `localStorage` der Anwendung und nicht als Data-Group des Service
 * Workers: der Service Worker legt Antworten allein nach URL ab und kennt den
 * angemeldeten Nutzer nicht — beim Abmelden bliebe der Kontostand des Vorgängers
 * im Gerät liegen. Hier lässt sich der Zwischenspeicher gezielt leeren, und wir
 * bekommen den Zeitstempel, den die Anzeige für „Stand von …“ braucht.
 */
@Injectable({ providedIn: 'root' })
export class OfflineCacheService {
  private readonly connectivity = inject(ConnectivityService);

  /**
   * Legt die Antwort einer lesenden Abfrage ab und greift auf den letzten Stand
   * zurück, wenn der Server nicht erreichbar war.
   *
   * Nur echte Verbindungsfehler lösen den Rückgriff aus. Fachliche Antworten
   * (ungültiger Monat, fehlende Rechte, Serverfehler) werden durchgereicht — sie
   * werden durch alte Daten nicht richtiger, nur unauffälliger.
   */
  withFallback<T>(key: string, request$: Observable<T>): Observable<Sourced<T>> {
    return request$.pipe(
      tap((value) => {
        this.connectivity.markReachable();
        this.write(key, value);
      }),
      map((value): Sourced<T> => ({ value, fromCache: false, savedAt: null })),
      catchError((error: Error) => {
        if (!(error instanceof ApiError) || !error.connectionFailed) return throwError(() => error);

        this.connectivity.markUnreachable();

        const cached = this.read<T>(key);
        if (!cached) return throwError(() => error);

        return of<Sourced<T>>({
          value: cached.payload,
          fromCache: true,
          savedAt: new Date(cached.savedAt),
        });
      }),
    );
  }

  read<T>(key: string): CacheEntry<T> | null {
    const raw = this.storage?.getItem(PREFIX + key);
    if (!raw) return null;

    try {
      const entry = JSON.parse(raw) as CacheEntry<T>;
      return entry?.savedAt ? entry : null;
    } catch {
      // Ein unlesbarer Eintrag ist wertlos und würde bei jedem Aufruf erneut
      // scheitern — er fliegt sofort raus.
      this.remove(key);
      return null;
    }
  }

  write<T>(key: string, payload: T): void {
    const entry: CacheEntry<T> = { savedAt: new Date().toISOString(), payload };

    try {
      this.storage?.setItem(PREFIX + key, JSON.stringify(entry));
    } catch {
      // Voller oder gesperrter Speicher darf niemals eine Anzeige verhindern:
      // ohne Zwischenspeicher funktioniert die App online unverändert weiter.
    }
  }

  remove(key: string): void {
    this.storage?.removeItem(PREFIX + key);
  }

  /** Leert den gesamten Zwischenspeicher — beim Abmelden verlassen die Daten das Gerät. */
  clear(): void {
    const storage = this.storage;
    if (!storage) return;

    const keys = Object.keys(storage).filter((key) => key.startsWith(PREFIX));
    keys.forEach((key) => storage.removeItem(key));
  }

  private get storage(): Storage | null {
    try {
      return localStorage;
    } catch {
      // Privater Modus mancher Browser wirft beim Zugriff.
      return null;
    }
  }
}
