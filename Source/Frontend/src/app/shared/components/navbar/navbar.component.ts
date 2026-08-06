import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ThemeSwitchComponent } from '../theme-switch/theme-switch.component';

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
}

/**
 * Hauptnavigation der Anwendung in zwei Ausprägungen.
 *
 * - **Mobil** (< 48rem): schlanke Kopfzeile mit Marke und Kontomenü, dazu eine
 *   Tab-Bar am unteren Rand. Der untere Bildschirmrand ist die Daumenzone; eine
 *   Navigation oben ist einhändig auf großen Telefonen kaum erreichbar.
 * - **Ab Tablet** (≥ 48rem): eine waagerechte Leiste oben. Hier gibt es keine
 *   Daumenzone, dafür Breite — und der Inhalt soll die volle Höhe bekommen.
 *
 * Beide Ausprägungen zeigen dieselben Ziele in derselben Reihenfolge, damit das
 * mentale Modell beim Gerätewechsel erhalten bleibt.
 */
@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive, ThemeSwitchComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
  template: `
    <header class="fin-topbar" [class.fin-topbar--scrolled]="scrolled()">
      <div class="container fin-topbar__inner">
        <a class="fin-brand" routerLink="/" aria-label="Finanzen — zur Übersicht">
          <span class="fin-brand__mark" aria-hidden="true"><i class="bi bi-wallet2"></i></span>
          <span>Finanzen</span>
        </a>

        <!-- Ziele ab Tablet. Auf Mobil übernimmt das die untere Tab-Bar. -->
        <ul class="fin-topnav">
          @for (target of visibleTargets(); track target.path) {
            <li>
              <a
                class="fin-topnav__link"
                [routerLink]="target.path"
                routerLinkActive="fin-active"
                [routerLinkActiveOptions]="{ exact: target.exact }"
              >
                <i class="bi bi-{{ target.icon }}" aria-hidden="true"></i>
                <span>{{ target.label }}</span>
              </a>
            </li>
          }
        </ul>

        <div class="position-relative">
          <button
            type="button"
            class="fin-avatar-button"
            [attr.aria-expanded]="menuOpen()"
            aria-haspopup="menu"
            aria-label="Kontomenü"
            (click)="toggleMenu()"
          >
            <span aria-hidden="true">{{ initials() }}</span>
          </button>

          @if (menuOpen()) {
            <div class="fin-menu" role="menu">
              <div class="fin-menu__header">
                <span class="fin-menu__name">Angemeldet</span>
                <span class="fin-menu__mail">{{ authService.currentUser()?.email }}</span>
              </div>

              <a class="fin-menu__item" role="menuitem" routerLink="/konto" (click)="closeMenu()">
                <i class="bi bi-person fin-menu__icon" aria-hidden="true"></i>
                <span>Mein Profil</span>
              </a>

              <a
                class="fin-menu__item"
                role="menuitem"
                routerLink="/konto/sitzungen"
                (click)="closeMenu()"
              >
                <i class="bi bi-shield-check fin-menu__icon" aria-hidden="true"></i>
                <span>Aktive Sitzungen</span>
              </a>

              @if (authService.isAdmin()) {
                <a
                  class="fin-menu__item"
                  role="menuitem"
                  routerLink="/admin/einladungen"
                  (click)="closeMenu()"
                >
                  <i class="bi bi-person-plus fin-menu__icon" aria-hidden="true"></i>
                  <span>Einladungen</span>
                </a>
              }

              <div class="fin-menu__separator" role="none"></div>

              <div class="d-flex align-items-center justify-content-between gap-2 px-3 py-2">
                <span class="fin-menu__name">Ansicht</span>
                <app-theme-switch [compact]="true" />
              </div>

              <div class="fin-menu__separator" role="none"></div>

              <button
                type="button"
                class="fin-menu__item fin-menu__item--danger"
                role="menuitem"
                (click)="logout()"
              >
                <i class="bi bi-box-arrow-right fin-menu__icon" aria-hidden="true"></i>
                <span>Abmelden</span>
              </button>
            </div>
          }
        </div>
      </div>
    </header>

    <!-- Tab-Bar am unteren Rand, nur auf schmalen Displays sichtbar. -->
    <nav class="fin-tabbar" aria-label="Hauptnavigation">
      <ul class="fin-tabbar__list">
        @for (target of visibleTargets(); track target.path) {
          <li class="fin-tabbar__item">
            <a
              class="fin-tabbar__link"
              [routerLink]="target.path"
              routerLinkActive="fin-active"
              [routerLinkActiveOptions]="{ exact: target.exact }"
              #link="routerLinkActive"
              [attr.aria-current]="link.isActive ? 'page' : null"
            >
              <i
                class="bi fin-tabbar__icon"
                [class]="'bi-' + (link.isActive ? target.iconActive : target.icon)"
                aria-hidden="true"
              ></i>
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

  private readonly document = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly menuOpen = signal(false);

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
    },
    // „Sitzungen“ steht bewusst nicht hier: es ist eine Sicherheitseinstellung,
    // kein täglich genutztes Ziel, und würde in der schmalen Tab-Bar Platz
    // beanspruchen, der den Kernaufgaben gehört. Erreichbar bleibt es über das
    // Kontomenü und die Profilseite.
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

  protected readonly visibleTargets = computed(() =>
    this.targets.filter((target) => !target.adminOnly || this.authService.isAdmin()),
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

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected logout(): void {
    this.closeMenu();
    this.authService.logout();
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) return;
    if (this.host.nativeElement.contains(event.target as Node)) return;

    this.closeMenu();
  }
}
