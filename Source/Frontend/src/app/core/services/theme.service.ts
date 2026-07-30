import { DOCUMENT, Injectable, computed, effect, inject, signal } from '@angular/core';

/** Vom Nutzer gewählte Einstellung — `system` folgt der Einstellung des Geräts. */
export type ThemePreference = 'system' | 'light' | 'dark';

/** Tatsächlich angewendetes Theme, nachdem `system` aufgelöst wurde. */
export type ResolvedTheme = 'light' | 'dark';

/**
 * Muss mit dem Schlüssel im Inline-Skript in `index.html` übereinstimmen. Dieses
 * Skript setzt das Theme bereits vor dem ersten Zeichnen, damit bei dunklem
 * Theme keine helle Fläche aufblitzt, bevor Angular gebootet hat.
 */
const STORAGE_KEY = 'fin-theme';

/** Entspricht `--fin-bg` je Theme aus `_tokens.scss`. */
const THEME_BACKGROUNDS: Record<ResolvedTheme, string> = {
  light: '#f7f5f2',
  dark: '#0b1220',
};

/**
 * Verwaltet das Erscheinungsbild der Anwendung.
 *
 * Das aufgelöste Theme landet als `data-bs-theme` am `<html>`-Element. Dieses
 * Attribut steuert sowohl die eigenen `--fin-*`-Tokens als auch die
 * Laufzeit-Variablen von Bootstrap — ein Umschalten genügt also für die
 * gesamte Oberfläche.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);

  private readonly preferenceSignal = signal<ThemePreference>(this.readStoredPreference());

  /** Vom Gerät gemeldete Vorliebe; reagiert auf Änderungen der Systemeinstellung. */
  private readonly systemPrefersDark = signal(false);

  readonly preference = this.preferenceSignal.asReadonly();

  readonly resolved = computed<ResolvedTheme>(() => {
    const preference = this.preferenceSignal();
    if (preference !== 'system') return preference;

    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  readonly isDark = computed(() => this.resolved() === 'dark');

  constructor() {
    this.watchSystemPreference();

    // Hält DOM-Attribut, Adressleisten-Farbe und Speicher am Signal-Zustand.
    effect(() => {
      const resolved = this.resolved();
      this.document.documentElement.setAttribute('data-bs-theme', resolved);
      this.document.documentElement.style.backgroundColor = THEME_BACKGROUNDS[resolved];
      this.syncBrowserThemeColor(resolved);
    });
  }

  setPreference(preference: ThemePreference): void {
    this.preferenceSignal.set(preference);
    this.storePreference(preference);
  }

  private watchSystemPreference(): void {
    const query = this.document.defaultView?.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;

    this.systemPrefersDark.set(query.matches);
    // Kein `removeEventListener` nötig: der Service lebt so lange wie die App.
    query.addEventListener('change', (event) => this.systemPrefersDark.set(event.matches));
  }

  /**
   * Setzt die Farbe der Browser- bzw. System-Leiste auf das gewählte Theme.
   *
   * Die beiden `theme-color`-Angaben in `index.html` sind an
   * `prefers-color-scheme` gekoppelt. Wählt der Nutzer manuell abweichend von
   * seinem System, müssen sie überschrieben werden — sonst zeigt die Leiste eine
   * andere Farbe als die Seite.
   */
  private syncBrowserThemeColor(resolved: ResolvedTheme): void {
    const head = this.document.head;
    if (!head) return;

    head.querySelectorAll('meta[name="theme-color"][media]').forEach((element) => element.remove());

    let meta = head.querySelector<HTMLMetaElement>('meta[name="theme-color"]:not([media])');
    if (!meta) {
      meta = this.document.createElement('meta');
      meta.name = 'theme-color';
      head.appendChild(meta);
    }

    meta.content = THEME_BACKGROUNDS[resolved];
  }

  private readStoredPreference(): ThemePreference {
    try {
      const stored = this.document.defaultView?.localStorage.getItem(STORAGE_KEY);
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch {
      // Im privaten Modus kann der Zugriff auf localStorage werfen.
      return 'system';
    }
  }

  private storePreference(preference: ThemePreference): void {
    try {
      this.document.defaultView?.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Ohne Speicher gilt die Wahl nur für die laufende Sitzung — kein Fehlerfall.
    }
  }
}
