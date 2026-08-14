import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountBalance } from '../../../../core/models/balance.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { SettledBalanceComponent } from '../../../../shared/components/settled-balance/settled-balance.component';
import { maskIban } from '../../../../shared/utils/iban.util';
import { DEFAULT_ACCENT_COLOR } from '../../../../shared/utils/color-presets';
import { accountTypeIcon, accountTypeSingular } from '../../../../shared/utils/account-type';
import { formatMonthShort } from '../../../../shared/utils/month.util';

/**
 * Übersichtskarte eines Kontos. Die gesamte Karte führt zur Detailseite und
 * nimmt den gewählten Monat als Query-Parameter mit, damit man dort denselben
 * Zeitraum vorfindet wie auf der Übersicht.
 *
 * Das Aktionsmenü ist bewusst selbst gebaut und signalgesteuert — wie das
 * Kontomenü in der Navigation. Damit braucht die App kein Bootstrap-JavaScript,
 * und Öffnen, Schließen und Fokus liegen vollständig in unserer Hand.
 */
@Component({
  selector: 'app-bank-account-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MoneyAmountComponent, SettledBalanceComponent],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
  template: `
    @let item = account();

    <article class="account-card fin-panel fin-panel--interactive">
      <!-- Farbstreifen oben: ordnet die Karte ihrem Konto zu, ohne die ganze
           Fläche einzufärben. Die Farbe kommt aus den Kontodaten. -->
      <span
        class="account-card__stripe"
        [style.background-color]="accentColor()"
        aria-hidden="true"
      ></span>

      <div class="account-card__head">
        <span
          class="account-card__avatar"
          [style.background-color]="accentColor()"
          aria-hidden="true"
        >
          <i class="bi" [class]="'bi-' + icon()"></i>
        </span>

        <div class="account-card__ident">
          <h3 class="account-card__name">
            <!--
              stretched-link macht die gesamte Karte klickbar, ohne verschachtelte
              interaktive Elemente zu erzeugen (das wäre nicht barrierefrei).
            -->
            <a
              class="stretched-link account-card__link"
              [routerLink]="['/girokonten', item.accountId]"
              [queryParams]="{ monat: month() }"
            >
              {{ item.name }}
            </a>
          </h3>
          <p class="account-card__meta">{{ subtitle() }}</p>
        </div>

        <div class="account-card__actions">
          <button
            type="button"
            class="btn fin-btn-icon"
            [attr.aria-expanded]="menuOpen()"
            aria-haspopup="menu"
            [attr.aria-label]="'Aktionen für ' + item.name"
            (click)="toggleMenu()"
          >
            <i class="bi bi-three-dots-vertical" aria-hidden="true"></i>
          </button>

          @if (menuOpen()) {
            <div class="fin-menu account-card__menu" role="menu">
              <button type="button" class="fin-menu__item" role="menuitem" (click)="emitEdit(item)">
                <i class="bi bi-pencil fin-menu__icon" aria-hidden="true"></i>
                <span>Bearbeiten</span>
              </button>
              <div class="fin-menu__separator" role="none"></div>
              <button
                type="button"
                class="fin-menu__item fin-menu__item--danger"
                role="menuitem"
                (click)="emitRemove(item)"
              >
                <i class="bi bi-trash fin-menu__icon" aria-hidden="true"></i>
                <span>Löschen</span>
              </button>
            </div>
          }
        </div>
      </div>

      <!-- Bilanz und Kontostand gleichrangig nebeneinander: die eine Zahl sagt,
           wie der Monat läuft, die andere, was tatsächlich da ist. Beide Fragen
           stellt man sich beim Blick auf ein Konto gleichzeitig. -->
      <dl class="account-card__figures">
        <div class="account-card__figure">
          <dt class="fin-eyebrow">Bilanz {{ monthLabel() }}</dt>
          <dd class="account-card__value">
            <app-money-amount [amount]="net()" [currency]="item.currency" size="lg" />
          </dd>
        </div>
        <div class="account-card__figure">
          <dt class="fin-eyebrow">Kontostand</dt>
          <dd class="account-card__value">
            <app-money-amount [amount]="item.currentBalance" [currency]="item.currency" size="lg" />
            <!-- Nur Girokonten kennen den Zustand „erfasst, aber noch nicht abgebucht".
                 Bei Depot oder Wallet wäre die Zeile eine reine Wiederholung. -->
            @if (item.type === 'CheckingAccount') {
              <app-settled-balance
                [amount]="item.settledBalance"
                [currency]="item.currency"
                [pendingCount]="item.pendingCount"
                [pendingTotal]="item.pendingTotal"
              />
            }
          </dd>
        </div>
      </dl>

      <p class="account-card__flow">
        <span class="account-card__flow-item">
          <i class="bi bi-arrow-down-left" aria-hidden="true"></i>
          <app-money-amount
            size="sm"
            tone="income"
            [amount]="item.income"
            [currency]="item.currency"
          />
        </span>
        <span class="account-card__flow-item">
          <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
          <app-money-amount
            size="sm"
            tone="expense"
            [amount]="item.expenses"
            [currency]="item.currency"
          />
        </span>
      </p>
    </article>
  `,
  styles: [
    `
      /* Ohne Höhe am Host greift die Kartenhöhe im Raster nicht — die Karten
         wären dann ungleich hoch. */
      :host {
        display: block;
        height: 100%;
      }
      .account-card {
        position: relative;
        display: flex;
        flex-direction: column;
        height: 100%;
        padding: var(--fin-space-4);
        overflow: hidden;
      }
      @media (min-width: 34rem) {
        .account-card {
          padding: var(--fin-space-5);
        }
      }
      .account-card__stripe {
        position: absolute;
        top: 0;
        right: 0;
        left: 0;
        height: 3px;
      }
      .account-card__head {
        display: flex;
        align-items: flex-start;
        gap: var(--fin-space-3);
      }
      .account-card__avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: var(--fin-radius-md);
        color: #fff;
        font-size: var(--fin-text-md);
      }
      /* min-width: 0 ist Voraussetzung dafür, dass die Kürzung im Flex-Kind greift. */
      .account-card__ident {
        flex: 1 1 auto;
        min-width: 0;
      }
      .account-card__name {
        margin: 0;
        font-size: var(--fin-text-md);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .account-card__link {
        color: inherit;
        text-decoration: none;
      }
      .account-card__link:hover {
        color: var(--fin-accent);
      }
      .account-card__link:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: 3px;
        border-radius: var(--fin-radius-xs);
      }
      .account-card__meta {
        margin: 0.1rem 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      /* Über der stretched-link-Fläche, damit das Menü nicht zur Detailseite navigiert. */
      .account-card__actions {
        position: relative;
        z-index: 2;
        flex-shrink: 0;
        margin: calc(-1 * var(--fin-space-1)) calc(-1 * var(--fin-space-2)) 0 0;
      }
      .account-card__menu {
        min-width: 11rem;
      }
      .account-card__figures {
        /* Schiebt den Zahlenblock ans untere Ende, damit die Karten im Raster
           auf einer Linie abschließen, auch wenn Kontonamen unterschiedlich hoch
           umbrechen. */
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--fin-space-3);
        margin: auto 0 0;
        padding-top: var(--fin-space-5);
      }
      .account-card__figure {
        min-width: 0;
      }
      .account-card__value {
        margin: var(--fin-space-1) 0 0;
      }
      .account-card__flow {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fin-space-2) var(--fin-space-4);
        margin: var(--fin-space-3) 0 0;
        padding-top: var(--fin-space-3);
        border-top: 1px solid var(--fin-border-subtle);
      }
      .account-card__flow-item {
        display: inline-flex;
        align-items: center;
        gap: var(--fin-space-1);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
    `,
  ],
})
export class BankAccountCardComponent {
  readonly account = input.required<AccountBalance>();
  /** Der Monat, auf den sich die Bilanz der Karte bezieht, als `yyyy-MM`. */
  readonly month = input.required<string>();

  readonly edit = output<AccountBalance>();
  readonly remove = output<AccountBalance>();

  protected readonly menuOpen = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly accentColor = computed(() => this.account().color ?? DEFAULT_ACCENT_COLOR);

  protected readonly icon = computed(() => accountTypeIcon(this.account().type));

  protected readonly net = computed(() => this.account().net);

  protected readonly monthLabel = computed(() => formatMonthShort(this.month()));

  protected readonly subtitle = computed(() => {
    const { bankName, iban, type } = this.account();
    const parts = [bankName, iban ? maskIban(iban) : null].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : accountTypeSingular(type);
  });

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected emitEdit(account: AccountBalance): void {
    this.closeMenu();
    this.edit.emit(account);
  }

  protected emitRemove(account: AccountBalance): void {
    this.closeMenu();
    this.remove.emit(account);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) return;
    if (this.host.nativeElement.contains(event.target as Node)) return;

    this.closeMenu();
  }
}
