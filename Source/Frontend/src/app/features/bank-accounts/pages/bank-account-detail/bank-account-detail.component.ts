import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BankAccountApiService } from '../../../../core/services/bank-account-api.service';
import { CategoryApiService } from '../../../../core/services/category-api.service';
import { BankAccount } from '../../../../core/models/bank-account.model';
import { Category } from '../../../../core/models/category.model';
import { MonthSummary } from '../../../../core/models/month-summary.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { MonthPickerComponent } from '../../../../shared/components/month-picker/month-picker.component';
import { SettledBalanceComponent } from '../../../../shared/components/settled-balance/settled-balance.component';
import { TabItem, TabNavComponent } from '../../../../shared/components/tab-nav/tab-nav.component';
import { DEFAULT_ACCENT_COLOR } from '../../../../shared/utils/color-presets';
import { accountTypeIcon, accountTypeSingular } from '../../../../shared/utils/account-type';
import { formatIban } from '../../../../shared/utils/iban.util';
import { formatMonthLong, isValidMonthKey, toMonthKey } from '../../../../shared/utils/month.util';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';
import { AccountOverviewTabComponent } from '../../components/overview-tab/overview-tab.component';
import { TransactionsTabComponent } from '../../components/transactions-tab/transactions-tab.component';
import { FixedCostsTabComponent } from '../../components/fixed-costs-tab/fixed-costs-tab.component';
import { BudgetsTabComponent } from '../../components/budgets-tab/budgets-tab.component';
import { CategoriesTabComponent } from '../../components/categories-tab/categories-tab.component';

/** Die Bereiche der Detailseite. Der Schlüssel steht so auch in der URL. */
const TAB_IDS = ['uebersicht', 'transaktionen', 'fixkosten', 'budgets', 'kategorien'] as const;
type TabId = (typeof TAB_IDS)[number];

/**
 * Detailseite eines Girokontos. Alles auf dieser Seite bezieht sich auf genau einen
 * Abrechnungsmonat, der oben gewählt wird; Monat und Bereich stehen in der URL,
 * damit Neuladen, Teilen und der Zurück-Knopf des Browsers funktionieren.
 */
@Component({
  selector: 'app-bank-account-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MoneyAmountComponent,
    MonthPickerComponent,
    SettledBalanceComponent,
    OfflineNoticeComponent,
    TabNavComponent,
    AccountOverviewTabComponent,
    TransactionsTabComponent,
    FixedCostsTabComponent,
    BudgetsTabComponent,
    CategoriesTabComponent,
  ],
  template: `
    <div class="container detail-page">
      <!-- Der Monat reist mit zurück: wer aus Mai kommt, will nicht im aktuellen Monat landen. -->
      <a routerLink="/" [queryParams]="{ monat: month() }" class="detail-back">
        <i class="bi bi-arrow-left" aria-hidden="true"></i>
        <span>Übersicht</span>
      </a>

      @if (loading()) {
        <div class="fin-panel detail-skeleton" role="status" aria-label="Konto wird geladen">
          <div class="detail-skeleton__head">
            <div class="fin-skeleton fin-skeleton--circle"></div>
            <div class="detail-skeleton__lines">
              <div class="fin-skeleton fin-skeleton--title"></div>
              <div class="fin-skeleton fin-skeleton--line-short"></div>
            </div>
          </div>
          <div class="fin-skeleton fin-skeleton--amount"></div>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger detail-error" role="alert">
          <span>{{ error() }}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="reload()">
            Erneut versuchen
          </button>
        </div>
      } @else if (account(); as item) {
        <app-offline-notice
          class="detail-offline"
          [stale]="summaryStale()"
          [savedAt]="summarySavedAt()"
        />

        <!-- Kopfbereich als Markenfläche: die Bilanz des Monats ist die Leitzahl
             der Seite und bekommt deshalb den stärksten Auftritt. -->
        <header class="fin-brand-surface detail-hero">
          <div class="detail-hero__top">
            <span
              class="detail-hero__avatar"
              [style.background-color]="accentColor()"
              aria-hidden="true"
            >
              <i class="bi" [class]="'bi-' + icon()"></i>
            </span>

            <div class="detail-hero__ident">
              <h1 class="detail-hero__name fin-break-all">{{ item.name }}</h1>
              <p class="detail-hero__meta fin-break-all">{{ subtitle() }}</p>
            </div>
          </div>

          <!-- Die Bilanz des gewählten Monats führt: sie beantwortet, wie das Konto
               gerade läuft. Der Kontostand steht als zweite Zahl daneben — er sagt,
               was da ist, aber nicht, wohin es sich bewegt. -->
          <div class="detail-hero__figures">
            <div class="detail-hero__figure">
              <span class="detail-hero__label">Bilanz {{ monthLabel() }}</span>
              <app-money-amount
                class="detail-hero__amount"
                [amount]="net()"
                [currency]="item.currency"
                size="lg"
              />
            </div>

            <div class="detail-hero__figure detail-hero__figure--secondary">
              <span class="detail-hero__label">Kontostand</span>
              <app-money-amount
                class="detail-hero__balance"
                [amount]="balance()"
                [currency]="item.currency"
              />
              @if (item.type === 'CheckingAccount') {
                <app-settled-balance
                  variant="on-brand"
                  [amount]="settledBalance()"
                  [currency]="item.currency"
                  [pendingCount]="summary()?.pendingCount ?? 0"
                  [pendingTotal]="summary()?.pendingTotal ?? 0"
                />
              }
            </div>
          </div>

          @if (summary(); as data) {
            <p class="detail-hero__flow">
              <span class="detail-hero__flow-item">
                <span class="detail-hero__flow-label">Einnahmen</span>
                <app-money-amount
                  size="sm"
                  tone="income"
                  [amount]="data.income"
                  [currency]="item.currency"
                />
              </span>
              <span class="detail-hero__flow-item">
                <span class="detail-hero__flow-label">Ausgaben</span>
                <app-money-amount
                  size="sm"
                  tone="expense"
                  [amount]="data.expenses"
                  [currency]="item.currency"
                />
              </span>
            </p>
          }

          <div class="detail-hero__period">
            <span class="detail-hero__period-label">
              Zeitraum <strong>{{ monthLabel() }}</strong>
            </span>
            <app-month-picker
              tone="on-brand"
              [month]="month()"
              (monthChange)="selectMonth($event)"
            />
          </div>
        </header>

        <app-tab-nav
          class="detail-tabs"
          label="Bereiche des Kontos"
          [tabs]="tabs()"
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
            @case ('uebersicht') {
              <app-account-overview-tab
                [summary]="summary()"
                [loading]="summaryLoading()"
                [error]="summaryError()"
                [month]="month()"
                [accountType]="item.type"
                (retry)="loadSummary()"
                (showTransactions)="selectTab('transaktionen')"
              />
            }
            @case ('transaktionen') {
              <app-transactions-tab
                [accountId]="item.id"
                [month]="month()"
                [currency]="item.currency"
                [categories]="categories()"
                [accountType]="item.type"
                [pendingCount]="summary()?.pendingMonthCount ?? 0"
                [pendingTotal]="summary()?.pendingMonthTotal ?? 0"
                (changed)="onDataChanged()"
              />
            }
            @case ('fixkosten') {
              <app-fixed-costs-tab
                [accountId]="item.id"
                [month]="month()"
                [categories]="categories()"
                (changed)="onDataChanged()"
              />
            }
            @case ('budgets') {
              <app-budgets-tab
                [accountId]="item.id"
                [month]="month()"
                [currency]="item.currency"
                (changed)="onDataChanged()"
              />
            }
            @case ('kategorien') {
              <app-categories-tab
                [accountId]="item.id"
                [categories]="categories()"
                [loading]="categoriesLoading()"
                [error]="categoriesError()"
                (changed)="onCategoriesChanged()"
              />
            }
          }
        </div>
      }
    </div>
  `,
  styles: [
    `
      .detail-page {
        max-width: 64rem;
      }
      .detail-back {
        display: inline-flex;
        align-items: center;
        gap: var(--fin-space-2);
        min-height: var(--fin-touch-min);
        margin-bottom: var(--fin-space-3);
        margin-left: calc(-1 * var(--fin-space-2));
        padding-inline: var(--fin-space-2);
        border-radius: var(--fin-radius-sm);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
        font-weight: 600;
        text-decoration: none;
        transition:
          color var(--fin-duration-fast) var(--fin-ease-out),
          background-color var(--fin-duration-fast) var(--fin-ease-out);
      }
      .detail-back:hover {
        background-color: var(--fin-surface-hover);
        color: var(--fin-text-strong);
      }
      .detail-back i {
        transition: transform var(--fin-duration-base) var(--fin-ease-out);
      }
      /* Der Pfeil rückt beim Überfahren minimal in seine Richtung — winziger
         Hinweis darauf, wohin der Link führt. */
      .detail-back:hover i {
        transform: translateX(-2px);
      }
      .detail-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }

      .detail-hero {
        padding: var(--fin-space-5);
        margin-bottom: var(--fin-space-5);
      }
      @media (min-width: 34rem) {
        .detail-hero {
          padding: var(--fin-space-6);
        }
      }
      .detail-hero__top {
        display: flex;
        align-items: center;
        gap: var(--fin-space-3);
      }
      .detail-hero__avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 2.75rem;
        height: 2.75rem;
        border-radius: var(--fin-radius-md);
        color: #fff;
        font-size: var(--fin-text-lg);
        /* Feine Kante, damit die Kontofarbe nicht mit der Fläche verschwimmt. */
        box-shadow: inset 0 0 0 1px var(--fin-on-brand-ring);
      }
      .detail-hero__ident {
        min-width: 0;
      }
      .detail-hero__name {
        margin: 0;
        color: var(--fin-on-brand-text);
        font-size: var(--fin-text-lg);
      }
      .detail-hero__meta {
        margin: var(--fin-space-1) 0 0;
        color: var(--fin-on-brand-text-muted);
        font-size: var(--fin-text-sm);
      }
      .detail-offline {
        display: block;
        margin-bottom: var(--fin-space-4);
      }
      .detail-hero__figures {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: var(--fin-space-3) var(--fin-space-8);
        margin-top: var(--fin-space-5);
      }
      .detail-hero__figure {
        min-width: 0;
      }
      /* Der Kontostand steht auf Mobil in einer eigenen Zeile unter der Bilanz —
         zwei große Zahlen nebeneinander konkurrieren auf schmalen Displays. */
      .detail-hero__figure--secondary {
        flex: 1 1 100%;
      }
      @media (min-width: 34rem) {
        .detail-hero__figure--secondary {
          flex: 0 0 auto;
        }
      }
      .detail-hero__balance {
        color: var(--fin-on-brand-text);
        font-size: var(--fin-text-xl);
      }
      .detail-hero__flow {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fin-space-2) var(--fin-space-6);
        margin: var(--fin-space-4) 0 0;
      }
      .detail-hero__flow-item {
        display: inline-flex;
        align-items: baseline;
        gap: var(--fin-space-2);
      }
      .detail-hero__flow-label {
        color: var(--fin-on-brand-text-muted);
        font-size: var(--fin-text-sm);
      }
      .detail-hero__label {
        display: block;
        margin-bottom: var(--fin-space-1);
        color: var(--fin-on-brand-text-muted);
        font-size: var(--fin-text-2xs);
        font-weight: 650;
        letter-spacing: var(--fin-tracking-wider);
        text-transform: uppercase;
      }
      .detail-hero__amount {
        /* Der Kontostand trägt die Vorderfarbe der Fläche statt der
           Vorzeichenfarbe — als Leitzahl der Seite soll er ruhig stehen. */
        color: var(--fin-on-brand-text);
        font-size: var(--fin-text-3xl);
      }
      .detail-hero__period {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
        margin-top: var(--fin-space-5);
        padding-top: var(--fin-space-4);
        border-top: 1px solid var(--fin-on-brand-line);
      }
      .detail-hero__period-label {
        color: var(--fin-on-brand-text-muted);
        font-size: var(--fin-text-sm);
      }
      /* Auf Mobil bekommt die Monatsauswahl eine eigene, volle Zeile unter der
         Beschriftung. Nebeneinander bliebe für die drei Schaltflächen auf einem
         320px-Display kein ausreichender Platz. */
      .detail-hero__period app-month-picker {
        flex: 1 1 100%;
      }
      @media (min-width: 34rem) {
        .detail-hero__period app-month-picker {
          flex: 0 0 auto;
        }
      }
      .detail-hero__period-label strong {
        color: var(--fin-on-brand-text);
      }

      .detail-tabs {
        display: block;
        margin-bottom: var(--fin-space-5);
      }

      /* Der Panel-Container ist per Tastatur anspringbar, soll aber keinen Fokusrahmen zeigen. */
      [role='tabpanel']:focus {
        outline: none;
      }

      .detail-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-5);
        padding: var(--fin-space-5);
      }
      .detail-skeleton__head {
        display: flex;
        align-items: center;
        gap: var(--fin-space-3);
      }
      .detail-skeleton__lines {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
      }
    `,
  ],
})
export class BankAccountDetailComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bankAccountApi = inject(BankAccountApiService);
  private readonly categoryApi = inject(CategoryApiService);

  /** Der Monat, der ohne Angabe in der URL gilt. Einmal berechnet, damit er stabil bleibt. */
  private readonly currentMonth = toMonthKey(new Date());

  private readonly params = toSignal(this.route.paramMap, { requireSync: true });
  private readonly queryParams = toSignal(this.route.queryParamMap, { requireSync: true });

  protected readonly account = signal<BankAccount | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly summary = signal<MonthSummary | null>(null);
  protected readonly summaryLoading = signal(true);
  protected readonly summaryError = signal('');

  /** Wann die gezeigten Kennzahlen geholt wurden — null, solange sie frisch vom Server kommen. */
  protected readonly summarySavedAt = signal<Date | null>(null);

  /** True, wenn die Kennzahlen aus dem Zwischenspeicher stammen statt vom Server. */
  protected readonly summaryStale = computed(() => this.summarySavedAt() !== null);

  protected readonly categories = signal<Category[]>([]);
  protected readonly categoriesLoading = signal(true);
  protected readonly categoriesError = signal('');

  protected readonly accountId = computed(() => Number(this.params().get('id')));

  /** Ungültige oder fehlende Angaben fallen auf sinnvolle Standards zurück, statt zu scheitern. */
  protected readonly month = computed(() => {
    const value = this.queryParams().get('monat');
    return isValidMonthKey(value) ? value : this.currentMonth;
  });

  protected readonly tab = computed<TabId>(() => {
    const value = this.queryParams().get('tab');
    return TAB_IDS.includes(value as TabId) ? (value as TabId) : 'uebersicht';
  });

  protected readonly monthLabel = computed(() => formatMonthLong(this.month()));
  protected readonly accentColor = computed(() => this.account()?.color ?? DEFAULT_ACCENT_COLOR);

  /** Symbol der Kontokategorie — dieselbe Zuordnung wie auf den Karten der Übersicht. */
  protected readonly icon = computed(() => {
    const item = this.account();
    return item ? accountTypeIcon(item.type) : 'bank2';
  });

  /** Der Kontostand kommt aus der Monatsabfrage, solange sie geladen ist — sonst aus dem Konto. */
  protected readonly balance = computed(
    () => this.summary()?.currentBalance ?? this.account()?.currentBalance ?? 0,
  );

  /**
   * Der Stand „laut Bank". Ohne geladene Kennzahlen ist unbekannt, was noch offen ist —
   * dann zeigt die Zeile denselben Wert wie der Kontostand, statt eine erfundene
   * Differenz zu behaupten.
   */
  protected readonly settledBalance = computed(
    () => this.summary()?.settledBalance ?? this.account()?.currentBalance ?? 0,
  );

  /**
   * Die Bilanz des gewählten Monats. Solange die Kennzahlen noch laden, steht hier
   * 0 statt einer alten Zahl aus dem Vormonat — eine falsche Bilanz ist schlimmer
   * als eine kurz noch leere.
   */
  protected readonly net = computed(() => this.summary()?.net ?? 0);

  protected readonly subtitle = computed(() => {
    const item = this.account();
    if (!item) return '';

    const parts = [item.bankName, item.iban ? formatIban(item.iban) : null].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : accountTypeSingular(item.type);
  });

  protected readonly tabs = computed<TabItem[]>(() => [
    { id: 'uebersicht', label: 'Übersicht', icon: 'pie-chart' },
    {
      id: 'transaktionen',
      label: 'Transaktionen',
      icon: 'list-ul',
      badge: this.summary()?.transactionCount ?? null,
    },
    {
      id: 'fixkosten',
      label: 'Fixkosten',
      icon: 'pin-angle',
      badge: this.summary()?.fixedCostCount ?? null,
    },
    { id: 'budgets', label: 'Budgets', icon: 'sliders' },
    { id: 'kategorien', label: 'Kategorien', icon: 'tags', badge: this.categories().length },
  ]);

  constructor() {
    // Stammdaten und Kategorien hängen nur am Konto …
    effect(() => {
      const accountId = this.accountId();
      untracked(() => {
        this.loadAccount(accountId);
        this.loadCategories(accountId);
      });
    });

    // … die Kennzahlen zusätzlich am gewählten Monat.
    effect(() => {
      const accountId = this.accountId();
      const month = this.month();
      untracked(() => this.loadSummary(accountId, month));
    });
  }

  protected selectMonth(month: string): void {
    this.updateQueryParams({ monat: month });
  }

  protected selectTab(tab: string): void {
    this.updateQueryParams({ tab });
  }

  protected reload(): void {
    this.loadAccount(this.accountId());
    this.loadCategories(this.accountId());
    this.loadSummary();
  }

  /** Nach Buchungs- oder Budgetänderungen stimmen die Kennzahlen im Kopf nicht mehr. */
  protected onDataChanged(): void {
    this.loadSummary();
  }

  protected onCategoriesChanged(): void {
    this.loadCategories(this.accountId());
    this.loadSummary();
  }

  protected loadSummary(accountId = this.accountId(), month = this.month()): void {
    if (!this.isValidAccountId(accountId)) return;

    this.summaryLoading.set(true);
    this.summaryError.set('');

    this.bankAccountApi.getSummary(accountId, month).subscribe({
      next: (result) => {
        this.summary.set(result.value);
        this.summarySavedAt.set(result.savedAt);
        this.summaryLoading.set(false);
      },
      error: (err: Error) => {
        this.summaryError.set(err.message || 'Die Kennzahlen konnten nicht geladen werden.');
        this.summaryLoading.set(false);
      },
    });
  }

  private loadAccount(accountId: number): void {
    if (!this.isValidAccountId(accountId)) {
      this.error.set('Dieses Konto existiert nicht.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.bankAccountApi.getById(accountId).subscribe({
      next: (result) => {
        this.account.set(result.value);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Das Konto konnte nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  private loadCategories(accountId: number): void {
    if (!this.isValidAccountId(accountId)) return;

    this.categoriesLoading.set(true);
    this.categoriesError.set('');

    this.categoryApi.list(accountId).subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.categoriesLoading.set(false);
      },
      error: (err: Error) => {
        this.categoriesError.set(err.message || 'Die Kategorien konnten nicht geladen werden.');
        this.categoriesLoading.set(false);
      },
    });
  }

  private updateQueryParams(params: Record<string, string>): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  private isValidAccountId(accountId: number): boolean {
    return Number.isInteger(accountId) && accountId > 0;
  }
}
