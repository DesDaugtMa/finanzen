import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  Signal,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ChangelogApiService } from '../../../core/services/changelog-api.service';
import { DebtStateService } from '../../../core/services/debt-state.service';
import { LogoutButtonComponent } from '../logout-button/logout-button.component';

interface NavTarget {
  path: string;
  label: string;
  /** Kurzform für die schmale Tab-Bar, wo waagerecht kaum Platz ist. */
  shortLabel: string;
  icon: string;
  /** Gefüllte Variante des Symbols für den aktiven Zustand. */
  iconActive: string;
  exact: boolean;
  adminOnly?: boolean;
  /**
   * Zahl am Ziel, sobald sie größer als 0 ist — heute ausschließlich die offenen
   * Forderungen. Sie ist bewusst Teil der Zieldefinition, damit beide Ausprägungen der
   * Navigation dieselbe Zahl aus derselben Quelle zeigen.
   */
  badge?: Signal<number>;
  /** Was die Zahl bedeutet — nur für Hilfstechnik, das Auge liest sie aus dem Zusammenhang. */
  badgeLabel?: (count: number) => string;
}

/**
 * Hauptnavigation der Anwendung in zwei Ausprägungen.
 *
 * - **Mobil** (< 62rem): schlanke Kopfzeile, die nur die Marke trägt, dazu eine
 *   Tab-Bar am unteren Rand. Der untere Bildschirmrand ist die Daumenzone; eine
 *   Navigation oben ist einhändig auf großen Telefonen kaum erreichbar.
 * - **Ab Desktop** (≥ 62rem): eine stehende Seitenleiste links. Bildschirme sind
 *   breiter als hoch — senkrecht ist Platz für beliebig viele Ziele mit
 *   ausgeschriebener Beschriftung, und der Inhalt bekommt die volle Höhe.
 *
 * Beide Ausprägungen zeigen dieselben Ziele in derselben Reihenfolge, damit das
 * mentale Modell beim Gerätewechsel erhalten bleibt. Ein Kontomenü gibt es nicht
 * mehr: Erscheinungsbild, Sitzungen, Abmelden und die Version leben auf der
 * Profilseite — auf schmalen Displays der einzige, auf breiten der zweite Weg
 * neben der Seitenleiste.
 */
@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, LogoutButtonComponent],
  template: `
    <!-- Kopfzeile, nur auf schmalen Displays sichtbar. -->
    <header class="fin-topbar" [class.fin-topbar--scrolled]="scrolled()">
      <div class="container fin-topbar__inner">
        <a class="fin-brand" routerLink="/" aria-label="Finanzen — zur Übersicht">
          <span class="fin-brand__mark" aria-hidden="true"><i class="bi bi-wallet2"></i></span>
          <span>Finanzen</span>
        </a>
      </div>
    </header>

    <!-- Seitenleiste, erst ab Desktop sichtbar. -->
    <nav class="fin-sidebar" aria-label="Hauptnavigation">
      <a class="fin-brand fin-sidebar__brand" routerLink="/" aria-label="Finanzen — zur Übersicht">
        <span class="fin-brand__mark" aria-hidden="true"><i class="bi bi-wallet2"></i></span>
        <span>Finanzen</span>
      </a>

      <ul class="fin-sidebar__list">
        @for (target of mainTargets(); track target.path) {
          <li>
            <a
              class="fin-sidebar__link"
              [routerLink]="target.path"
              routerLinkActive="fin-active"
              [routerLinkActiveOptions]="{ exact: target.exact }"
              #link="routerLinkActive"
              [attr.aria-current]="link.isActive ? 'page' : null"
            >
              <i
                class="bi fin-sidebar__icon"
                [class]="'bi-' + (link.isActive ? target.iconActive : target.icon)"
                aria-hidden="true"
              ></i>
              <span class="fin-sidebar__label">{{ target.label }}</span>

              @if (target.badge; as badge) {
                @if (badge() > 0) {
                  <span class="fin-nav-badge">
                    <span aria-hidden="true">{{ badge() }}</span>
                    <span class="visually-hidden">{{ badgeLabel(target, badge()) }}</span>
                  </span>
                }
              }
            </a>
          </li>
        }
      </ul>

      <div class="fin-sidebar__footer">
        <a
          class="fin-sidebar__link fin-sidebar__profile"
          routerLink="/konto"
          routerLinkActive="fin-active"
          [routerLinkActiveOptions]="{ exact: true }"
          #profileLink="routerLinkActive"
          [attr.aria-current]="profileLink.isActive ? 'page' : null"
        >
          <span class="fin-sidebar__avatar" aria-hidden="true">{{ initials() }}</span>
          <span class="fin-sidebar__profile-text">
            <span class="fin-sidebar__label">Profil</span>
            <span class="fin-sidebar__profile-mail">{{ authService.currentUser()?.email }}</span>
          </span>
        </a>

        <app-logout-button variant="nav" />

        <!--
          Der Changelog ist kein tägliches Ziel und gehört deshalb nicht zwischen
          die Hauptziele. Als kleine Zeile ganz unten ist er dennoch von jeder
          Seite aus erreichbar — und trägt die Version gleich mit.
        -->
        <a class="fin-sidebar__link fin-sidebar__meta" routerLink="/changelog">
          {{ changelogLabel() }}
        </a>
      </div>
    </nav>

    <!-- Tab-Bar am unteren Rand, nur auf schmalen Displays sichtbar. -->
    <nav class="fin-tabbar" aria-label="Hauptnavigation">
      <ul class="fin-tabbar__list">
        @for (target of tabTargets(); track target.path) {
          <li class="fin-tabbar__item">
            <a
              class="fin-tabbar__link"
              [routerLink]="target.path"
              routerLinkActive="fin-active"
              [routerLinkActiveOptions]="{ exact: target.exact }"
              #link="routerLinkActive"
              [attr.aria-current]="link.isActive ? 'page' : null"
            >
              <!--
                In der Tab-Bar hat die Beschriftung kaum Platz; die Zahl sitzt deshalb am
                Symbol statt daneben — dort, wo sie aus Apps gewohnt ist.
              -->
              <span class="fin-tabbar__icon-wrap">
                <i
                  class="bi fin-tabbar__icon"
                  [class]="'bi-' + (link.isActive ? target.iconActive : target.icon)"
                  aria-hidden="true"
                ></i>

                @if (target.badge; as badge) {
                  @if (badge() > 0) {
                    <span class="fin-nav-badge fin-nav-badge--float">
                      <span aria-hidden="true">{{ badge() }}</span>
                      <span class="visually-hidden">{{ badgeLabel(target, badge()) }}</span>
                    </span>
                  }
                }
              </span>
              <span class="fin-tabbar__label">{{ target.shortLabel }}</span>
            </a>
          </li>
        }
      </ul>
    </nav>
  `,
})
export class NavbarComponent {
  protected readonly authService = inject(AuthService);

  private readonly changelogApi = inject(ChangelogApiService);

  private readonly debtState = inject(DebtStateService);

  private readonly document = inject(DOCUMENT);

  /** Trennlinie der Kopfzeile erscheint erst, wenn tatsächlich gescrollt wurde. */
  protected readonly scrolled = signal(false);

  private readonly targets: readonly NavTarget[] = [
    {
      path: '/',
      label: 'Übersicht',
      shortLabel: 'Übersicht',
      icon: 'house',
      iconActive: 'house-fill',
      exact: true,
    },
    {
      path: '/schuldner',
      label: 'Schuldner',
      shortLabel: 'Schuldner',
      icon: 'people',
      iconActive: 'people-fill',
      exact: false,
      // Die Zahl kommt aus dem gemeinsamen Stand der Schuldnerliste. Jede Änderung dort
      // schreibt ihn neu, deshalb steht sie ohne eigenes Nachladen sofort richtig.
      badge: this.debtState.openCount,
      badgeLabel: (count) => (count === 1 ? '1 offene Forderung' : `${count} offene Forderungen`),
    },
    // „Sitzungen“ steht bewusst nicht hier: es ist eine Sicherheitseinstellung,
    // kein täglich genutztes Ziel. Erreichbar bleibt es über die Profilseite.
    {
      path: '/admin/einladungen',
      label: 'Einladungen',
      shortLabel: 'Einladung',
      icon: 'person-plus',
      iconActive: 'person-plus-fill',
      exact: false,
      adminOnly: true,
    },
    {
      path: '/konto',
      label: 'Profil',
      shortLabel: 'Profil',
      icon: 'person',
      iconActive: 'person-fill',
      exact: true,
    },
  ];

  private readonly visibleTargets = computed(() =>
    this.targets.filter((target) => !target.adminOnly || this.authService.isAdmin()),
  );

  /** Die Tab-Bar zeigt alle Ziele nebeneinander, Profil eingeschlossen. */
  protected readonly tabTargets = this.visibleTargets;

  /**
   * In der Seitenleiste steht das Profil nicht bei den täglichen Zielen, sondern
   * unten im Fußbereich — mit Initialen und E-Mail statt bloßem Symbol.
   */
  protected readonly mainTargets = computed(() =>
    this.visibleTargets().filter((target) => target.path !== '/konto'),
  );

  /**
   * Scroll-Beobachtung für die Trennlinie der Kopfzeile.
   *
   * Bewusst nicht als Host-Listener (`(window:scroll)`): der wäre nicht passiv
   * und würde bei jedem einzelnen Scroll-Ereignis einen Change-Detection-Lauf
   * auslösen — auf dem Smartphone die klassische Ursache für ruckelndes
   * Scrollen. Hier wird stattdessen passiv gelauscht und über
   * `requestAnimationFrame` auf höchstens einen Signal-Schreibvorgang pro Bild
   * gedrosselt; unveränderte Werte schreibt das Signal ohnehin nicht durch.
   */
  constructor() {
    // Die Version steht dauerhaft in der Seitenleiste und wird deshalb einmal
    // beim Aufbau geholt. Der Dienst liest offline aus dem Zwischenspeicher und
    // lässt den Link im Fehlerfall schlicht ohne Version stehen.
    this.changelogApi.ensureVersionLoaded();

    // Der Zähler soll auf jeder Seite stimmen, nicht erst nach einem Besuch der
    // Schuldnerliste. Danach hält ihn jede Änderung von selbst aktuell.
    this.debtState.ensureLoaded();

    const view = this.document.defaultView;
    if (!view) return;

    let pending = false;

    const onScroll = (): void => {
      if (pending) return;
      pending = true;

      view.requestAnimationFrame(() => {
        pending = false;
        // Kleine Schwelle, damit die Linie bei minimalem Überscrollen nicht flackert.
        this.scrolled.set(view.scrollY > 4);
      });
    };

    view.addEventListener('scroll', onScroll, { passive: true });
    inject(DestroyRef).onDestroy(() => view.removeEventListener('scroll', onScroll));
  }

  /**
   * Beschriftung der Zahl für Hilfstechnik. Ohne sie läse ein Screenreader nur „3“
   * hinter dem Zielnamen, ohne zu sagen, wovon.
   */
  protected badgeLabel(target: NavTarget, count: number): string {
    return target.badgeLabel?.(count) ?? `${count}`;
  }

  /** Initialen aus der E-Mail-Adresse — es gibt (noch) keinen Anzeigenamen. */
  protected readonly initials = computed(() => {
    const email = this.authService.currentUser()?.email ?? '';
    const localPart = email.split('@')[0] ?? '';
    const segments = localPart.split(/[._-]+/).filter(Boolean);

    if (segments.length >= 2) {
      return (segments[0][0] + segments[1][0]).toUpperCase();
    }

    return (localPart.slice(0, 2) || '??').toUpperCase();
  });

  /**
   * Beschriftung des Changelog-Links. Die Version steht davor, weil sie die eigentliche
   * Auskunft ist („welchen Stand habe ich?“); ist sie noch nicht bekannt, bleibt der Link
   * ohne sie bestehen, statt eine Ladeanzeige in der Navigation zu zeigen.
   */
  protected readonly changelogLabel = computed(() => {
    const version = this.changelogApi.currentVersion();
    return version ? `v${version} — Changelog` : 'Changelog';
  });
}
