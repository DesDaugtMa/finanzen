import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { AccountBalance, AccountGroupBalance } from '../../../../core/models/balance.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { SettledBalanceComponent } from '../../../../shared/components/settled-balance/settled-balance.component';
import { accountTypeIcon, accountTypeLabel } from '../../../../shared/utils/account-type';
import { Period, detailMonthOf, formatPeriodShort } from '../../../../shared/utils/period.util';
import { BankAccountCardComponent } from '../../../bank-accounts/components/bank-account-card/bank-account-card.component';

/**
 * Ein Kontobereich der Übersicht: alle Konten einer Kategorie mit den Zahlen
 * dieser Kategorie darüber.
 *
 * Jede Kategorie führt ihre eigenen Kennzahlen, weil die Frage „woher kommt der
 * Monat?“ sonst nur durch Zusammenzählen der Karten zu beantworten wäre. Die
 * Kennzahlen stehen dauerhaft sichtbar und nicht hinter einem Klick — beim
 * Überblick will man sie sofort, nicht auf Anfrage.
 */
@Component({
  selector: 'app-account-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BankAccountCardComponent, MoneyAmountComponent, SettledBalanceComponent],
  template: `
    @let data = group();

    <section class="group" [attr.aria-label]="label()">
      <header class="group__head">
        <span class="fin-emblem fin-emblem--sm fin-emblem--muted" aria-hidden="true">
          <i class="bi" [class]="'bi-' + icon()"></i>
        </span>
        <h3 class="group__title">{{ label() }}</h3>
        <span class="group__count">{{ countLabel() }}</span>
        <!-- Die Linie führt den Titel bis an den rechten Rand und trennt den
             Bereich vom vorhergehenden, ohne eine weitere Fläche einzuführen. -->
        <span class="group__rule" aria-hidden="true"></span>
      </header>

      <dl class="fin-panel fin-panel--sunken group__figures">
        <div class="group__figure">
          <dt class="group__label">Bilanz {{ periodLabel() }}</dt>
          <dd class="group__value">
            <app-money-amount size="sm" [amount]="data.net" [currency]="data.currency" />
          </dd>
        </div>
        <div class="group__figure">
          <dt class="group__label">Einnahmen</dt>
          <dd class="group__value">
            <app-money-amount
              size="sm"
              tone="income"
              [amount]="data.income"
              [currency]="data.currency"
            />
          </dd>
        </div>
        <div class="group__figure">
          <dt class="group__label">Ausgaben</dt>
          <dd class="group__value">
            <app-money-amount
              size="sm"
              tone="expense"
              [amount]="data.expenses"
              [currency]="data.currency"
            />
          </dd>
        </div>
        <div class="group__figure">
          <dt class="group__label">Vermögen</dt>
          <dd class="group__value">
            <app-money-amount size="sm" [amount]="data.balance" [currency]="data.currency" />
            <!-- Nur Girokonten kennen den Zustand „erfasst, aber noch nicht
                 abgebucht“ — bei Depot oder Wallet wäre die Zeile eine Wiederholung. -->
            @if (data.type === 'CheckingAccount') {
              <app-settled-balance
                [amount]="data.settledBalance"
                [currency]="data.currency"
                [pendingCount]="data.pendingCount"
                [pendingTotal]="data.pendingTotal"
              />
            }
          </dd>
        </div>
      </dl>

      <ul class="group__grid fin-stagger">
        @for (account of data.accounts; track account.accountId) {
          <li>
            <app-bank-account-card
              [account]="account"
              [periodLabel]="periodLabel()"
              [detailMonth]="detailMonth()"
              (edit)="edit.emit($event)"
              (remove)="remove.emit($event)"
            />
          </li>
        }
      </ul>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .group__head {
        display: flex;
        align-items: center;
        gap: var(--fin-space-3);
      }
      .group__title {
        margin: 0;
        font-size: var(--fin-text-lg);
        letter-spacing: var(--fin-tracking-tight);
        white-space: nowrap;
      }
      .group__count {
        flex-shrink: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        white-space: nowrap;
      }
      .group__rule {
        flex: 1 1 auto;
        height: 1px;
        min-width: var(--fin-space-4);
        background-color: var(--fin-border);
      }
      /* Auf Mobil über die volle Breite, ab Tablet rechtsbündig unter der Linie —
         so wie im Entwurf. Die Fläche ist eingesenkt und nicht erhöht: erhöht
         wären die Karten darunter, und zwei Ebenen nebeneinander würden sich
         gegenseitig die Bedeutung nehmen. */
      .group__figures {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: var(--fin-space-3) var(--fin-space-5);
        margin: var(--fin-space-4) 0 0;
        padding: var(--fin-space-4);
      }
      @media (min-width: 48rem) {
        .group__figures {
          grid-template-columns: repeat(4, auto);
          justify-content: end;
          margin-inline-start: auto;
          width: fit-content;
          gap: var(--fin-space-6);
          padding: var(--fin-space-4) var(--fin-space-5);
        }
      }
      .group__figure {
        min-width: 0;
      }
      @media (min-width: 48rem) {
        .group__figure {
          text-align: end;
        }
      }
      .group__label {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-2xs);
        font-weight: 650;
        letter-spacing: var(--fin-tracking-wide);
        text-transform: uppercase;
      }
      .group__value {
        margin: var(--fin-space-1) 0 0;
      }
      @media (min-width: 48rem) {
        /* Die Zweitzeile des Vermögens richtet sich mit aus, statt als einzige
           Zeile linksbündig stehen zu bleiben. */
        .group__value app-settled-balance {
          display: flex;
          justify-content: flex-end;
        }
      }
      /* Feste Spaltenzahl statt auto-fit: der Entwurf sieht drei Karten je Reihe
         vor, und nur eine gesetzte Zahl hält das über alle Breiten ein. Vier
         Spalten erst auf sehr breiten Schirmen, wo die Seite ohnehin aufgeht. */
      .group__grid {
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        gap: var(--fin-space-4);
        margin: var(--fin-space-4) 0 0;
        padding: 0;
        list-style: none;
      }
      @media (min-width: 48rem) {
        .group__grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }
      }
      @media (min-width: 64rem) {
        .group__grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }
      @media (min-width: 100rem) {
        .group__grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
    `,
  ],
})
export class AccountGroupComponent {
  readonly group = input.required<AccountGroupBalance>();
  /** Der Zeitraum, auf den sich alle Flusszahlen dieser Gruppe beziehen. */
  readonly period = input.required<Period>();

  readonly edit = output<AccountBalance>();
  readonly remove = output<AccountBalance>();

  protected readonly label = computed(() => accountTypeLabel(this.group().type));
  protected readonly icon = computed(() => accountTypeIcon(this.group().type));
  protected readonly periodLabel = computed(() => formatPeriodShort(this.period()));
  protected readonly detailMonth = computed(() => detailMonthOf(this.period()));

  protected readonly countLabel = computed(() => {
    const count = this.group().accounts.length;
    return count === 1 ? '1 Konto' : `${count} Konten`;
  });
}
