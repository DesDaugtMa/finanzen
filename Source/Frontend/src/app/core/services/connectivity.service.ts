import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';

/**
 * Ob das Gerät gerade eine Netzwerkverbindung hat.
 *
 * `navigator.onLine` ist bewusst nur der Auslöser, nicht die Wahrheit: der Wert
 * meldet lediglich, ob überhaupt ein Netz anliegt — nicht, ob unser Server
 * antwortet. Ein fehlgeschlagener Aufruf zählt deshalb genauso, und ein
 * geglückter Aufruf setzt den Zustand sofort wieder auf „verbunden“.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly document = inject(DOCUMENT);

  private readonly browserOnline = signal(this.readNavigatorState());
  private readonly requestFailed = signal(false);

  readonly online = computed(() => this.browserOnline() && !this.requestFailed());
  readonly offline = computed(() => !this.online());

  constructor() {
    const window = this.document.defaultView;
    if (!window) return;

    window.addEventListener('online', () => {
      this.browserOnline.set(true);
      this.requestFailed.set(false);
    });

    window.addEventListener('offline', () => this.browserOnline.set(false));
  }

  /** Ein Aufruf hat den Server nicht erreicht. */
  markUnreachable(): void {
    this.requestFailed.set(true);
  }

  /** Ein Aufruf ist durchgekommen — damit gilt die Verbindung wieder als bestehend. */
  markReachable(): void {
    this.requestFailed.set(false);
    this.browserOnline.set(true);
  }

  private readNavigatorState(): boolean {
    const navigator = this.document.defaultView?.navigator;
    // Ohne Browser-Umgebung (Tests, SSR) gilt „verbunden“ — sonst würde die App
    // dort dauerhaft einen Offline-Hinweis zeigen, den niemand wegbekommt.
    return navigator?.onLine ?? true;
  }
}
