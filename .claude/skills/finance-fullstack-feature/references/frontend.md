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

Persönliche Finanzen werden zweigeteilt genutzt: **schnelles Erfassen unterwegs**
(Ausgabe eintippen am Smartphone) und **prüfendes Lesen am Desktop** (Budgets,
Berichte, lange Transaktionslisten). Daraus folgt:

1. Style zuerst das **Mobile-Layout** (eine Spalte, große Touch-Targets,
   Daumen-erreichbare Primäraktionen, z. B. „+ Transaktion").
2. Skaliere mit `min-width`-Media-Queries hoch: mehrspaltige Karten-Layouts,
   echte Tabellen für Transaktionen, breitere Charts. Nie umgekehrt
   (`max-width`-„Reparaturen") arbeiten.
3. Wichtige Kennzahlen (aktueller Saldo, Budget-Rest) müssen ohne Scrollen
   sichtbar sein — „above the fold" auf Mobile.

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

Tokens, die eine Finanz-App typischerweise braucht (anlegen, falls nicht
vorhanden — als CSS Custom Properties, damit Theming/Dark-Mode möglich bleibt):

```scss
:root {
  // Farben — semantisch, nicht "blau"/"grün"
  --color-bg;
  --color-surface;        // Karten/Panels
  --color-text;
  --color-text-muted;
  --color-primary;        // Primäraktion
  --color-income;         // Einnahmen / positiv
  --color-expense;        // Ausgaben / negativ
  --color-warning;        // Budget fast erschöpft
  --color-danger;         // Budget überschritten / Fehler
  --color-border;

  // Spacing-Skala (4er- oder 8er-Raster)
  --space-1 … --space-8;

  // Radius, Schatten, Typo-Skala
  --radius-sm/md/lg;
  --shadow-card;
  --font-size-… ; --font-weight-… ; --line-height-…;
}
```

**Geldfarben sind nie der einzige Bedeutungsträger.** Einnahme/Ausgabe immer
zusätzlich über Vorzeichen, Symbol oder Label kennzeichnen (Kontrast +
Farbenblindheit, WCAG).

## 3. Wiederverwendbare Komponenten

Baue Screens aus kleinen, abstrahierten Komponenten zusammen. Lege geteilte
Komponenten unter einem `shared/`-Ordner ab (an bestehende Struktur anpassen).
Typischer Baukasten für diese App:

| Komponente            | Verantwortung                                              |
|-----------------------|-----------------------------------------------------------|
| `AppButton`           | Primär/Sekundär/Ghost/Danger, Loading-State, Icon-Slot    |
| `AppCard`             | Surface-Container mit konsistentem Padding/Radius/Schatten |
| `AppInput` / `AppSelect` | Form-Control mit Label, Fehlertext, ARIA-Verknüpfung   |
| `MoneyInput`          | Betragseingabe (Dezimal, Währung, Validierung > 0)        |
| `MoneyAmount`         | **Anzeige** eines Betrags (s. u., zentrale Formatierung)  |
| `TransactionRow`      | Eine Transaktion (Kategorie-Icon, Beschreibung, Betrag)   |
| `CategoryBadge`       | Kategorie mit Farbe/Icon                                   |
| `BudgetProgressBar`   | Ausgegeben vs. Budget, mit Warning/Danger-Schwellen       |
| `EmptyState`          | Leerer Zustand mit Call-to-Action                         |
| `ErrorState`          | Einheitliche Fehlermeldung (aus ProblemDetails)           |
| `LoadingSkeleton`     | Skeleton-Platzhalter beim Laden                           |

Eine Komponente einmal bauen, überall wiederverwenden — das erzwingt eine
einheitliche Designsprache.

## 4. Geld korrekt darstellen

- **Eine zentrale Formatierungsstelle** (z. B. `MoneyAmount`-Komponente oder eine
  `formatMoney()`-Util / Pipe), die alle Beträge gleich rendert.
- Locale-/Währungs-korrekt über `Intl.NumberFormat` bzw. Angulars `CurrencyPipe`.
  Default-Locale **de-DE**, Default-Währung **EUR**, sofern nichts anderes
  konfiguriert ist. Locale ggf. via `LOCALE_ID` / `registerLocaleData` setzen.
- Beträge kommen als **String oder Integer-Minor-Units** vom Backend (nicht als
  JS-`number`-Float weiterrechnen). Keine clientseitige Geld-Arithmetik mit
  Floats; wenn gerechnet werden muss, in Cent/Minor-Units rechnen.
- Vorzeichen klar: Ausgaben negativ/rot/„−", Einnahmen positiv/grün/„+",
  zusätzlich mit Label.

```ts
// Beispiel-Util — an Projekt anpassen
export function formatMoney(value: string | number, currency = 'EUR'): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency }).format(amount);
}
```

## 5. Zustände — immer alle vier behandeln

Jede datengetriebene View behandelt **Loading / Empty / Error / Success**. Eine
halbe UX ist nicht fertig.

```ts
@Component({
  selector: 'app-transactions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (transactions.isLoading()) {
      <app-loading-skeleton />
    } @else if (transactions.error()) {
      <app-error-state [error]="transactions.error()" (retry)="transactions.reload()" />
    } @else if (transactions.value()?.length === 0) {
      <app-empty-state message="Noch keine Transaktionen" cta="Erste Transaktion erfassen" />
    } @else {
      @for (t of transactions.value(); track t.id) {
        <app-transaction-row [transaction]="t" />
      }
    }
  `,
})
export class TransactionsComponent {
  private readonly api = inject(TransactionApiService);
  protected readonly transactions = this.api.getTransactionsResource();
}
```

Nutze das State-Muster, das die Codebase bereits verwendet (`resource()`,
`toSignal()`, oder Signal + manuelles Laden). Konsistenz vor Vorliebe.

## 6. Forms (Reactive)

- Reactive Forms, getypt. Validierung deklarativ (Pflichtfeld, Betrag > 0,
  gültige Kategorie/Konto, gültiges Datum).
- Fehlermeldungen sind mit dem Control per `aria-describedby` verknüpft, sichtbar
  und verständlich.
- Submit-Button zeigt Loading-State und ist während des Requests deaktiviert
  (kein Doppel-Buchen).
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
- [ ] Geld über zentrale Formatierung, locale-korrekt, Vorzeichen nicht nur per
      Farbe.
- [ ] Loading / Empty / Error / Success behandelt.
- [ ] AXE/WCAG-AA bestanden; Touch-Targets groß genug.
- [ ] Animationen dezent, `prefers-reduced-motion` respektiert.
