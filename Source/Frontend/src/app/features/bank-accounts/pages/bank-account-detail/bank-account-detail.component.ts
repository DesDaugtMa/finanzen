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
import { TabItem, TabNavComponent } from '../../../../shared/components/tab-nav/tab-nav.component';
import { DEFAULT_ACCENT_COLOR } from '../../../../shared/utils/color-presets';
import { formatIban } from '../../../../shared/utils/iban.util';
import { formatMonthLong, isValidMonthKey, toMonthKey } from '../../../../shared/utils/month.util';
import { AccountOverviewTabComponent } from '../../components/overview-tab/overview-tab.component';
import { TransactionsTabComponent } from '../../components/transactions-tab/transactions-tab.component';
import { BudgetsTabComponent } from '../../components/budgets-tab/budgets-tab.component';
import { CategoriesTabComponent } from '../../components/categories-tab/categories-tab.component';

/** Die Bereiche der Detailseite. Der Schlüssel steht so auch in der URL. */
const TAB_IDS = ['uebersicht', 'transaktionen', 'budgets', 'kategorien'] as const;
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
    TabNavComponent,
    AccountOverviewTabComponent,
    TransactionsTabComponent,
    BudgetsTabComponent,
    CategoriesTabComponent,
  ],
  template: `
    <div class="container py-4 detail-page">
      <a routerLink="/" class="btn btn-link px-0 mb-2 text-decoration-none">
        <i class="bi bi-arrow-left me-1" aria-hidden="true"></i> Zurück zur Übersicht
      </a>

      @if (loading()) {
        <div class="text-center py-5">
          <span class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Konto wird geladen …</span>
          </span>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
          <span class="me-auto">{{ error() }}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="reload()">
            Erneut versuchen
          </button>
        </div>
      } @else if (account(); as item) {
        <header class="card shadow-sm detail-card mb-3" [style.border-top-color]="accentColor()">
          <div class="card-body p-3 p-sm-4">
            <div class="d-flex flex-wrap align-items-start gap-3">
              <span
                class="account-avatar flex-shrink-0"
                [style.background-color]="accentColor()"
                aria-hidden="true"
              >
                <i class="bi bi-bank2"></i>
              </span>

              <div class="flex-grow-1 min-width-0">
                <h1 class="h4 fw-bold mb-1 text-break">{{ item.name }}</h1>
                <p class="text-muted small mb-0">{{ subtitle() }}</p>
              </div>

              <div class="text-sm-end">
                <p class="text-muted text-uppercase detail-label mb-1">Kontostand</p>
                <app-money-amount [amount]="balance()" [currency]="item.currency" size="lg" />
              </div>
            </div>

            <div class="d-flex flex-wrap align-items-center gap-2 mt-3 pt-3 border-top">
              <span class="text-muted small me-auto">
                Angezeigter Zeitraum: <strong class="text-body">{{ monthLabel() }}</strong>
              </span>
              <app-month-picker [month]="month()" (monthChange)="selectMonth($event)" />
            </div>
          </div>
        </header>

        <app-tab-nav
          class="d-block mb-3"
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
      .detail-card {
        border-radius: 1rem;
        /* Die Akzentfarbe des Kontos sitzt als Inline-Style auf border-top-color. */
        border: 1px solid var(--bs-border-color-translucent);
        border-top-width: 3px;
        background-color: var(--color-surface);
      }
      .account-avatar {
        width: 3rem;
        height: 3rem;
        border-radius: 0.9rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 1.4rem;
      }
      .min-width-0 {
        min-width: 0;
      }
      .detail-label {
        font-size: 0.7rem;
        letter-spacing: 0.06em;
      }
      /* Der Panel-Container ist per Tastatur anspringbar, soll aber keinen Fokusrahmen zeigen. */
      [role='tabpanel']:focus {
        outline: none;
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

  /** Der Kontostand kommt aus der Monatsabfrage, solange sie geladen ist — sonst aus dem Konto. */
  protected readonly balance = computed(
    () => this.summary()?.currentBalance ?? this.account()?.currentBalance ?? 0,
  );

  protected readonly subtitle = computed(() => {
    const item = this.account();
    if (!item) return '';

    const parts = [item.bankName, item.iban ? formatIban(item.iban) : null].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Girokonto';
  });

  protected readonly tabs = computed<TabItem[]>(() => [
    { id: 'uebersicht', label: 'Übersicht', icon: 'pie-chart' },
    {
      id: 'transaktionen',
      label: 'Transaktionen',
      icon: 'list-ul',
      badge: this.summary()?.transactionCount ?? null,
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
      next: (summary) => {
        this.summary.set(summary);
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
      this.error.set('Dieses Girokonto existiert nicht.');
      this.loading.set(false);
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.bankAccountApi.getById(accountId).subscribe({
      next: (account) => {
        this.account.set(account);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Das Girokonto konnte nicht geladen werden.');
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
