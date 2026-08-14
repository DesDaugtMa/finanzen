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
import { MonthBalance, YearBalance } from '../../../../core/models/balance.model';
import { isValidMonthKey, toMonthKey, yearOf } from '../../../../shared/utils/month.util';
import { BankAccountsSectionComponent } from '../../../bank-accounts/components/bank-accounts-section/bank-accounts-section.component';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';
import { BalanceHeroComponent } from '../../components/balance-hero/balance-hero.component';
import { YearBalancePanelComponent } from '../../components/year-balance-panel/year-balance-panel.component';

/**
 * Die Startseite: die Bilanz des Monats über alle Konten, darunter das Jahr im
 * Verlauf und die Konten nach Kategorie.
 *
 * Der gewählte Monat steht als Query-Parameter `monat` in der URL. Damit
 * überleben Auswahl und Ansicht ein Neuladen, lassen sich teilen, funktionieren
 * mit dem Zurück-Knopf des Browsers — und die Kontodetailseite kann denselben
 * Zeitraum übernehmen, statt beim aktuellen Monat neu anzufangen.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    BankAccountsSectionComponent,
    BalanceHeroComponent,
    YearBalancePanelComponent,
    OfflineNoticeComponent,
  ],
  template: `
    <div class="container">
      @let user = authService.currentUser();

      <header class="fin-page-header home-header">
        <div class="fin-page-header__text">
          <span class="fin-eyebrow">{{ greeting() }}</span>
          <h1 class="fin-page-header__title">Übersicht</h1>
          <p class="fin-page-header__subtitle">
            Was der Monat unter dem Strich bringt — über alle Konten hinweg.
          </p>
        </div>
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

      <app-balance-hero
        class="home-block"
        [month]="month()"
        [balance]="monthBalance()"
        [loading]="monthLoading()"
        [error]="monthError()"
        (monthChange)="selectMonth($event)"
        (retry)="loadMonth()"
      />

      <app-year-balance-panel
        class="home-block"
        [balance]="yearBalance()"
        [year]="year()"
        [selectedMonth]="month()"
        [loading]="yearLoading()"
        [error]="yearError()"
        (yearChange)="selectYear($event)"
        (monthSelect)="selectMonth($event)"
        (retry)="loadYear()"
      />

      <app-bank-accounts-section
        [groups]="groups()"
        [month]="month()"
        [loading]="monthLoading()"
        [error]="monthError()"
        (changed)="reloadAll()"
        (reload)="loadMonth()"
      />
    </div>
  `,
  styles: [
    `
      .home-header {
        margin-bottom: var(--fin-space-6);
      }
      .home-block {
        display: block;
        margin-bottom: var(--fin-space-6);
      }
      .verify-banner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-6);
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

  protected resending = signal(false);

  protected readonly monthBalance = signal<MonthBalance | null>(null);
  protected readonly monthLoading = signal(true);
  protected readonly monthError = signal('');

  protected readonly yearBalance = signal<YearBalance | null>(null);
  protected readonly yearLoading = signal(true);
  protected readonly yearError = signal('');

  /** Wann die gezeigte Monatsbilanz geholt wurde — null, solange sie frisch vom Server kommt. */
  private readonly monthSavedAt = signal<Date | null>(null);

  /** Das Jahr des Verlaufs. Startet beim Jahr des gewählten Monats, ist aber frei blätterbar. */
  private readonly browsedYear = signal<number | null>(null);

  private readonly queryParams = toSignal(this.route.queryParamMap, {
    initialValue: this.route.snapshot.queryParamMap,
  });

  /** Der gewählte Monat. Ungültige oder fehlende Angaben fallen auf den aktuellen Monat zurück. */
  protected readonly month = computed(() => {
    const fromUrl = this.queryParams().get('monat');
    return isValidMonthKey(fromUrl) ? fromUrl : toMonthKey(new Date());
  });

  protected readonly year = computed(() => this.browsedYear() ?? yearOf(this.month()));

  protected readonly groups = computed(() => this.monthBalance()?.groups ?? []);

  /** True, wenn die Bilanz aus dem Zwischenspeicher stammt statt vom Server. */
  protected readonly stale = computed(() => this.monthSavedAt() !== null);
  protected readonly savedAt = computed(() => this.monthSavedAt());

  /**
   * Tageszeitabhängige Anrede. Wird einmal beim Erzeugen der Seite bestimmt —
   * eine über den Tag mitlaufende Begrüßung wäre Aufwand ohne Nutzen.
   */
  protected readonly greeting = signal(buildGreeting(new Date())).asReadonly();

  constructor() {
    // Beide Abfragen hängen an je einer Auswahl und laufen deshalb getrennt:
    // ein Monatswechsel innerhalb desselben Jahres lädt den Verlauf nicht neu.
    effect(() => {
      this.month();
      this.loadMonth();
    });

    effect(() => {
      this.year();
      this.loadYear();
    });
  }

  protected loadMonth(): void {
    const month = this.month();

    this.monthLoading.set(true);
    this.monthError.set('');

    this.balanceApi.getMonth(month).subscribe({
      next: (result) => {
        this.monthBalance.set(result.value);
        this.monthSavedAt.set(result.savedAt);
        this.monthLoading.set(false);
      },
      error: (err: Error) => {
        this.monthError.set(err.message || 'Die Bilanz konnte nicht geladen werden.');
        this.monthLoading.set(false);
      },
    });
  }

  protected loadYear(): void {
    const year = this.year();

    this.yearLoading.set(true);
    this.yearError.set('');

    this.balanceApi.getYear(year).subscribe({
      next: (result) => {
        this.yearBalance.set(result.value);
        this.yearLoading.set(false);
      },
      error: (err: Error) => {
        this.yearError.set(err.message || 'Die Jahresbilanz konnte nicht geladen werden.');
        this.yearLoading.set(false);
      },
    });
  }

  protected reloadAll(): void {
    this.loadMonth();
    this.loadYear();
  }

  /**
   * Der Monat wandert in die URL; das Nachladen übernimmt der Effekt oben.
   * `replaceUrl`, damit das Blättern durch Monate nicht die Browser-Historie füllt
   * und der Zurück-Knopf zuverlässig die vorherige Seite erreicht.
   */
  protected selectMonth(month: string): void {
    if (month === this.month()) return;

    this.browsedYear.set(null);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { monat: month },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected selectYear(year: number): void {
    this.browsedYear.set(year);
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
}

function buildGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return 'Gute Nacht';
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}
