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
import { BankAccount } from '../../../../core/models/bank-account.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { maskIban } from '../../../../shared/utils/iban.util';
import { DEFAULT_ACCENT_COLOR } from '../../../../shared/utils/color-presets';

/**
 * Übersichtskarte eines Girokontos. Die gesamte Karte führt zur Detailseite.
 *
 * Das Aktionsmenü ist bewusst selbst gebaut und signalgesteuert — wie das
 * Kontomenü in der Navigation. Damit braucht die App kein Bootstrap-JavaScript,
 * und Öffnen, Schließen und Fokus liegen vollständig in unserer Hand.
 */
@Component({
  selector: 'app-bank-account-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MoneyAmountComponent],
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
          <i class="bi bi-bank2"></i>
        </span>

        <div class="account-card__ident">
          <h3 class="account-card__name">
            <!--
              stretched-link macht die gesamte Karte klickbar, ohne verschachtelte
              interaktive Elemente zu erzeugen (das wäre nicht barrierefrei).
            -->
            <a class="stretched-link account-card__link" [routerLink]="['/girokonten', item.id]">
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

      <div class="account-card__balance">
        <span class="fin-eyebrow">Kontostand</span>
        <app-money-amount [amount]="item.currentBalance" [currency]="item.currency" size="lg" />
      </div>
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
      .account-card__balance {
        margin-top: auto;
        padding-top: var(--fin-space-5);
      }
      .account-card__balance .fin-eyebrow {
        margin-bottom: var(--fin-space-1);
      }
    `,
  ],
})
export class BankAccountCardComponent {
  readonly account = input.required<BankAccount>();

  readonly edit = output<BankAccount>();
  readonly remove = output<BankAccount>();

  protected readonly menuOpen = signal(false);

  private readonly host = inject(ElementRef<HTMLElement>);

  protected readonly accentColor = computed(() => this.account().color ?? DEFAULT_ACCENT_COLOR);

  protected readonly subtitle = computed(() => {
    const { bankName, iban } = this.account();
    const parts = [bankName, iban ? maskIban(iban) : null].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Girokonto';
  });

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  protected emitEdit(account: BankAccount): void {
    this.closeMenu();
    this.edit.emit(account);
  }

  protected emitRemove(account: BankAccount): void {
    this.closeMenu();
    this.remove.emit(account);
  }

  protected onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) return;
    if (this.host.nativeElement.contains(event.target as Node)) return;

    this.closeMenu();
  }
}
