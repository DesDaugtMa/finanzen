import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountApiService } from '../../../../core/services/account-api.service';
import { BalanceApiService } from '../../../../core/services/balance-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { PeriodBalance } from '../../../../core/models/balance.model';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';
import { PeriodPickerComponent } from '../../../../shared/components/period-picker/period-picker.component';
import { TabItem, TabNavComponent } from '../../../../shared/components/tab-nav/tab-nav.component';
import {
  Period,
  currentMonthPeriod,
  formatPeriodLong,
  parsePeriod,
  yearPeriod,
} from '../../../../shared/utils/period.util';
import { AccountsTabComponent } from '../../components/accounts-tab/accounts-tab.component';
import { StatisticsTabComponent } from '../../components/statistics-tab/statistics-tab.component';

/** Die Reiter der Startseite. Die Kennung steht so auch in der URL. */
type TabId = 'konten' | 'statistiken';

const TABS: readonly TabItem[] = [
  { id: 'konten', label: 'Konten', icon: 'wallet2' },
  { id: 'statistiken', label: 'Statistiken', icon: 'bar-chart-line' },
];

/**
 * Die Startseite: die Konten des gewählten Zeitraums, nach Kontoart gegliedert.
 *
 * Zeitraum und Reiter stehen als Query-Parameter in der URL (`modus`, `monat`,
 * `jahr`, `tab`). Damit überleben Auswahl und Ansicht ein Neuladen, lassen sich
 * teilen, funktionieren mit dem Zurück-Knopf des Browsers — und die
 * Kontodetailseite kann denselben Zeitraum übernehmen, statt beim aktuellen
 * Monat neu anzufangen.
 *
 * Die Zeitraum-Auswahl sitzt bewusst über den Reitern: sie gilt für alle Reiter
 * und darf deshalb nicht so aussehen, als gehöre sie zu einem davon.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AccountsTabComponent,
    StatisticsTabComponent,
    OfflineNoticeComponent,
    PeriodPickerComponent,
    TabNavComponent,
  ],
  template: `
    <div class="container fin-container--wide">
      @let user = authService.currentUser();

      <header class="fin-page-header home-header">
        <div class="fin-page-header__text">
          <h1 class="fin-page-header__title home-title">Übersicht</h1>
        </div>

        <app-period-picker
          class="home-period"
          [period]="period()"
          [disabled]="loading()"
          (periodChange)="selectPeriod($event)"
        />
      </header>

      @if (user && !user.emailVerified) {
        <div class="alert alert-warning verify-banner" role="alert">
          <i class="bi bi-envelope-exclamation verify-banner__icon" aria-hidden="true"></i>
          <div class="verify-banner__text">
            <strong>E-Mail-Adresse noch nicht bestätigt</strong>
            <span class="fin-break-all"
              >Wir haben eine Bestätigung an {{ user.email }} gesendet.</span
            >
          </div>
          <button
            type="button"
            class="btn btn-sm btn-warning"
            [disabled]="resending()"
            (click)="resend()"
          >
            @if (resending()) {
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
            }
            Erneut senden
          </button>
        </div>
      }

      <app-offline-notice class="home-block" [stale]="stale()" [savedAt]="savedAt()" />

      <!-- Der Zeitraum steht nur einmal sichtbar in der Auswahl oben. Diese Zeile
           spricht ihn für Screenreader aus, damit nach einem Wechsel klar ist,
           worauf sich die folgenden Zahlen beziehen. -->
      <p class="visually-hidden" aria-live="polite">Zeitraum: {{ periodLabel() }}</p>

      <app-tab-nav
        class="home-tabs"
        label="Bereiche der Übersicht"
        [tabs]="tabs"
        [active]="tab()"
        (activeChange)="selectTab($event)"
      />

      <div
        role="tabpanel"
        [id]="'panel-' + tab()"
        [attr.aria-labelledby]="'tab-' + tab()"
        tabindex="-1"
      >
        @switch (tab()) {
          @case ('statistiken') {
            <app-statistics-tab />
          }
          @default {
            <app-accounts-tab
              [groups]="groups()"
              [period]="period()"
              [loading]="loading()"
              [error]="error()"
              (changed)="load()"
              (reload)="load()"
            />
          }
        }
      </div>
    </div>
  `,
  styles: [
    `
      .home-header {
        /* Der Kopf trägt nur noch Titel und Zeitraum — die Seite soll mit ihrem
           Inhalt beginnen und nicht mit einer Ansprache. */
        align-items: center;
        margin-bottom: var(--fin-space-5);
      }
      .home-title {
        margin-bottom: 0;
      }
      .home-period {
        flex: 1 1 auto;
      }
      @media (min-width: 48rem) {
        .home-period {
          flex: 0 0 auto;
        }
      }
      .home-block {
        display: block;
        margin-bottom: var(--fin-space-5);
      }
      .home-tabs {
        display: block;
        margin-bottom: var(--fin-space-6);
      }
      [role='tabpanel']:focus {
        outline: none;
      }
      .verify-banner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-5);
      }
      .verify-banner__icon {
        flex-shrink: 0;
        font-size: var(--fin-text-lg);
      }
      .verify-banner__text {
        /* Nimmt den verfügbaren Platz, damit die Schaltfläche rechts außen sitzt
           und auf schmalen Displays in die nächste Zeile rutscht. */
        flex: 1 1 14rem;
        display: flex;
        flex-direction: column;
        min-width: 0;
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
    `,
  ],
})
export class HomeComponent {
  protected authService = inject(AuthService);

  private readonly accountApi = inject(AccountApiService);
  private readonly balanceApi = inject(BalanceApiService);
  private readonly toastService = inject(ToastService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly tabs = TABS;

  protected resending = signal(false);

  protected readonly balance = signal<PeriodBalance | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  /** Wann die gezeigte Bilanz geholt wurde — null, solange sie frisch vom Server kommt. */
  private readonly savedAtSignal = signal<Date | null>(null);

  /** Der Zeitraum, der ohne Angabe in der URL gilt. Einmal bestimmt, damit er stabil bleibt. */
  private readonly fallbackPeriod = currentMonthPeriod(new Date());

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /**
   * Der gewählte Zeitraum. `modus` entscheidet, welcher der beiden Werte gilt —
   * beide bleiben in der URL stehen, damit ein Hin- und Herschalten den zuletzt
   * gewählten Monat beziehungsweise das Jahr wiederfindet.
   */
  protected readonly period = computed<Period>(() => {
    const params = this.queryParams();

    if (params.get('modus') === 'jahr') {
      return parsePeriod(params.get('jahr')) ?? yearPeriod(this.fallbackPeriod.year);
    }

    const month = parsePeriod(params.get('monat'));
    return month?.kind === 'Month' ? month : this.fallbackPeriod;
  });

  protected readonly periodLabel = computed(() => formatPeriodLong(this.period()));

  protected readonly tab = computed<TabId>(() =>
    this.queryParams().get('tab') === 'statistiken' ? 'statistiken' : 'konten',
  );

  protected readonly groups = computed(() => this.balance()?.groups ?? []);

  /** True, wenn die Bilanz aus dem Zwischenspeicher stammt statt vom Server. */
  protected readonly stale = computed(() => this.savedAtSignal() !== null);
  protected readonly savedAt = computed(() => this.savedAtSignal());

  constructor() {
    effect(() => {
      this.period();
      this.load();
    });
  }

  protected load(): void {
    const period = this.period();

    this.loading.set(true);
    this.error.set('');

    this.balanceApi.getPeriod(period.key).subscribe({
      next: (result) => {
        // Eine spät eintreffende Antwort zu einem inzwischen verlassenen Zeitraum
        // darf die aktuelle Anzeige nicht überschreiben.
        if (this.period().key !== period.key) return;

        this.balance.set(result.value);
        this.savedAtSignal.set(result.savedAt);
        this.loading.set(false);
      },
      error: (err: Error) => {
        if (this.period().key !== period.key) return;

        this.error.set(err.message || 'Die Bilanz konnte nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  /**
   * Der Zeitraum wandert in die URL; das Nachladen übernimmt der Effekt oben.
   * `replaceUrl`, damit das Blättern durch Zeiträume nicht die Browser-Historie
   * füllt und der Zurück-Knopf zuverlässig die vorherige Seite erreicht.
   */
  protected selectPeriod(period: Period): void {
    if (period.key === this.period().key) return;

    this.updateQueryParams(
      period.kind === 'Year'
        ? { modus: 'jahr', jahr: period.key }
        : { modus: 'monat', monat: period.key },
    );
  }

  protected selectTab(tab: string): void {
    if (tab === this.tab()) return;

    this.updateQueryParams({ tab });
  }

  protected resend(): void {
    const email = this.authService.currentUser()?.email;
    if (!email) return;

    this.resending.set(true);
    this.accountApi.resendVerification(email).subscribe({
      next: () => {
        this.resending.set(false);
        this.toastService.success('Bestätigungs-E-Mail wurde versendet.');
      },
      error: () => {
        this.resending.set(false);
        this.toastService.success('Bestätigungs-E-Mail wurde versendet.');
      },
    });
  }

  private updateQueryParams(params: Record<string, string>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
      replaceUrl: true,
      // Tab- und Zeitraumwechsel bleiben auf derselben Seite — der Sprung nach oben
      // würde die gewählte Stelle verlieren.
      scroll: 'manual',
    });
  }
}
