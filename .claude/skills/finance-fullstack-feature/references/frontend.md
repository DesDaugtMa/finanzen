# Frontend-Referenz — Angular 21 Design & Implementierung

Diese Referenz gilt für `./Source/Frontend/` (Angular 21, standalone, Signals,
eigenes SCSS-Design-System). Sie ergänzt — und überschreibt nie — die
verbindlichen Regeln in `./Source/Frontend/.claude/CLAUDE.md`. Bei Konflikten
gewinnt die `CLAUDE.md`. Lies sie zuerst.

## 0. Verbindliche Angular-/TypeScript-Regeln (aus CLAUDE.md, nicht verhandelbar)

- **Strict Typing.** Kein `any`; nutze `unknown` bei Unsicherheit. Bevorzuge
  Typinferenz, wenn der Typ offensichtlich ist.
- **Standalone Components.** Keine NgModules. Setze **nicht** `standalone: true`
  (ist Default ab v20+).
- **Signals für State.** `signal()` für lokalen State, `computed()` für
  abgeleiteten State. Niemals `mutate`, nur `set`/`update`.
- **`input()` / `output()`-Funktionen** statt Decorators.
- **`ChangeDetectionStrategy.OnPush`** in jeder Komponente.
- **`inject()`** statt Constructor-Injection.
- **Native Control Flow** (`@if`, `@for`, `@switch`) statt `*ngIf`/`*ngFor`.
- **Reactive Forms** statt Template-driven Forms.
- **`class`-/`style`-Bindings** statt `ngClass`/`ngStyle`.
- **Host-Bindings** in das `host`-Objekt des `@Component`-Decorators, nicht
  `@HostBinding`/`@HostListener`.
- **`NgOptimizedImage`** für statische Bilder (nicht für inline-base64).
- **Barrierefreiheit:** MUSS alle AXE-Checks bestehen und WCAG-AA-Minima
  einhalten (Fokus-Management, Kontrast, ARIA).
- Inline-Templates für kleine Komponenten bevorzugen; bei externen Templates/Styles
  Pfade relativ zur Komponenten-TS-Datei.
- Services: eine Verantwortung, `providedIn: 'root'` für Singletons.
- Lazy Loading für Feature-Routes.

## 1. Mobile-first, dashboard-tauglich

Die App wird zweigeteilt genutzt: **schnelles Erfassen unterwegs** (am
Smartphone) und **prüfendes Lesen am Desktop** (Auswertungen, lange Listen).
Daraus folgt:

1. Style zuerst das **Mobile-Layout** (eine Spalte, große Touch-Targets,
   Daumen-erreichbare Primäraktionen, z. B. „+ Neu").
2. Skaliere mit `min-width`-Media-Queries hoch: mehrspaltige Karten-Layouts,
   echte Tabellen für lange Listen, breitere Charts. Nie umgekehrt
   (`max-width`-„Reparaturen") arbeiten.
3. Wichtige Kennzahlen müssen ohne Scrollen sichtbar sein — „above the fold"
   auf Mobile.

Empfohlene Breakpoints als SCSS-Variablen/-Tokens (an Vorhandenes anpassen):

```scss
// nur Beispielwerte — bestehende Tokens in src/styles.scss bevorzugen
$bp-tablet: 600px;
$bp-desktop: 960px;
$bp-wide: 1280px;
```

## 2. Design-System & SCSS-Tokens

Das globale SCSS liegt in `src/styles.scss`. **Erst dort nach existierenden
Tokens suchen**, dann verwenden. Keine Einmal-Werte (hardcodierte Hex-Farben,
px-Abstände, Font-Größen) in Komponenten.

Typische Tokens (anlegen, falls nicht vorhanden — als CSS Custom Properties,
damit Theming/Dark-Mode möglich bleibt):

```scss
:root {
  // Farben — semantisch, nicht "blau"/"grün"
  --color-bg;
  --color-surface;        // Karten/Panels
  --color-text;
  --color-text-muted;
  --color-primary;        // Primäraktion
  --color-success;        // positiv / erfolgreich
  --color-warning;        // Achtung / Grenze fast erreicht
  --color-danger;         // Fehler / Grenze überschritten
  --color-border;

  // Spacing-Skala (4er- oder 8er-Raster)
  --space-1 … --space-8;

  // Radius, Schatten, Typo-Skala
  --radius-sm/md/lg;
  --shadow-card;
  --font-size-… ; --font-weight-… ; --line-height-…;
}
```

**Farbe ist nie der einzige Bedeutungsträger.** Zustände immer zusätzlich über
Vorzeichen, Symbol oder Label kennzeichnen (Kontrast + Farbenblindheit, WCAG).

## 3. Wiederverwendbare Komponenten

Baue Screens aus kleinen, abstrahierten Komponenten zusammen. Lege geteilte
Komponenten unter einem `shared/`-Ordner ab (an bestehende Struktur anpassen).
Typischer Baukasten für diese App:

| Komponente            | Verantwortung                                              |
|-----------------------|-----------------------------------------------------------|
| `AppButton`           | Primär/Sekundär/Ghost/Danger, Loading-State, Icon-Slot    |
| `AppCard`             | Surface-Container mit konsistentem Padding/Radius/Schatten |
| `AppInput` / `AppSelect` | Form-Control mit Label, Fehlertext, ARIA-Verknüpfung   |
| `ListRow`             | Eine Zeile einer Liste (Icon, Titel, Meta, Aktion)        |
| `Badge`               | Kurzes Label mit Farbe/Icon                                |
| `EmptyState`          | Leerer Zustand mit Call-to-Action                         |
| `ErrorState`          | Einheitliche Fehlermeldung (aus ProblemDetails)           |
| `LoadingSkeleton`     | Skeleton-Platzhalter beim Laden                           |

Eine Komponente einmal bauen, überall wiederverwenden — das erzwingt eine
einheitliche Designsprache.

## 4. Werte korrekt darstellen

- **Eine zentrale Formatierungsstelle** je Werteart (Zahl, Datum, …) als
  Komponente, Util oder Pipe, damit alle Stellen gleich rendern.
- Locale-korrekt über `Intl.NumberFormat` / `Intl.DateTimeFormat` bzw. Angular-Pipes.
  Default-Locale **de-DE**, sofern nichts anderes konfiguriert ist.
- Keine clientseitige Arithmetik mit Floats, wo exakte Werte gefragt sind —
  rechnen gehört ins Backend.

## 5. Zustände — immer alle vier behandeln

Jede datengetriebene View behandelt **Loading / Empty / Error / Success**. Eine
halbe UX ist nicht fertig.

```ts
@Component({
  selector: 'app-items',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (items.isLoading()) {
      <app-loading-skeleton />
    } @else if (items.error()) {
      <app-error-state [error]="items.error()" (retry)="items.reload()" />
    } @else if (items.value()?.length === 0) {
      <app-empty-state message="Noch keine Einträge" cta="Ersten Eintrag erfassen" />
    } @else {
      @for (item of items.value(); track item.id) {
        <app-list-row [item]="item" />
      }
    }
  `,
})
export class ItemsComponent {
  private readonly api = inject(ItemApiService);
  protected readonly items = this.api.getItemsResource();
}
```

Nutze das State-Muster, das die Codebase bereits verwendet (`resource()`,
`toSignal()`, oder Signal + manuelles Laden). Konsistenz vor Vorliebe.

## 6. Forms (Reactive)

- Reactive Forms, getypt. Validierung deklarativ (Pflichtfeld, Wertebereich,
  gültige Auswahl, gültiges Datum).
- Fehlermeldungen sind mit dem Control per `aria-describedby` verknüpft, sichtbar
  und verständlich.
- Submit-Button zeigt Loading-State und ist während des Requests deaktiviert
  (kein doppeltes Absenden).
- Serverseitige Validierung (ProblemDetails) ist die Wahrheit; Client-Validierung
  ist nur UX-Komfort. Mappe Server-Validierungsfehler zurück auf die Felder.

## 7. Animationen — dezent

- Nur `transform`/`opacity` animieren (GPU-freundlich), kurze Dauer (~150–250 ms),
  weiche Easing.
- Nie blockierend, nie endlos loopend, nie Interaktion verzögernd.
- **`prefers-reduced-motion` respektieren:**

```scss
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## 8. Integration zum Backend (Verweis)

Der Service-Layer (typisierte Services, `environment`-Base-URL,
DTO-Spiegelung, ProblemDetails → UI-Error-State) ist in der SKILL.md „Phase 3"
und in `backend.md` beschrieben. Halte Request-/Response-Interfaces synchron mit
den Backend-DTOs.

## Frontend-Checkliste

- [ ] Folgt allen CLAUDE.md-Regeln (Signals, OnPush, `inject()`, native Control
      Flow, Reactive Forms, kein `any`).
- [ ] Mobile-first gestylt, sauber zu Desktop hochskaliert.
- [ ] Nur Design-Tokens, keine Einmal-Werte.
- [ ] Werte über zentrale Formatierung, locale-korrekt, Bedeutung nicht nur per
      Farbe.
- [ ] Loading / Empty / Error / Success behandelt.
- [ ] AXE/WCAG-AA bestanden; Touch-Targets groß genug.
- [ ] Animationen dezent, `prefers-reduced-motion` respektiert.
