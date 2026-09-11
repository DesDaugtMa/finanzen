import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Debt, DebtEntry, DebtTransactionDirection } from '../../../../core/models/debt.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { formatDate } from '../../../../shared/utils/month.util';
import { DebtStatusComponent } from '../debt-status/debt-status.component';

/**
 * Eine Zeile der Positionsliste — vereinheitlicht, damit Buchungen und manuell erfasste
 * Beträge in derselben chronologischen Liste stehen können. Der Nutzer denkt in einem
 * Verlauf („was ist bei diesem Vorgang passiert?“), nicht in Herkunftsarten.
 */
interface DebtPosition {
  /** Eindeutig über beide Herkünfte hinweg — die IDs allein würden kollidieren. */
  key: string;
  /** Buchung oder manueller Betrag. Entscheidet über Kennzeichnung und Aktionen. */
  manual: boolean;
  direction: DebtTransactionDirection;
  title: string;
  amount: number;
  currency: string;
  /** ISO-Datum `yyyy-MM-dd`. */
  date: string;
  /** Herkunft in Worten: der Kontoname, oder „Manuell“. */
  origin: string;
  /** Die ID innerhalb der eigenen Herkunft — für die Aktionen an der Zeile. */
  id: number;
}

/**
 * Ein Schuldeintrag mit seinen Positionen. Der offene Betrag steht groß und allein — er
 * ist die eigentliche Frage des Eintrags; Verliehen und Zurück erklären ihn darunter.
 */
@Component({
  selector: 'app-debt-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent, DebtStatusComponent],
  template: `
    @let item = debt();

    <article class="debt-card">
      <header class="debt-card__head">
        <div class="debt-card__ident">
          <h4 class="debt-card__title fin-truncate">{{ item.title }}</h4>
          <div class="debt-card__meta">
            <app-debt-status [status]="item.status" />
            <span class="debt-card__count">{{ positionsLabel() }}</span>
          </div>
        </div>

        <div class="debt-card__actions">
          <button
            type="button"
            class="btn fin-btn-icon"
            [attr.aria-label]="'Betrag zu ' + item.title + ' erfassen'"
            (click)="addEntry.emit()"
          >
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="btn fin-btn-icon"
            [attr.aria-label]="'Buchung zu ' + item.title + ' zuordnen'"
            (click)="assign.emit()"
          >
            <i class="bi bi-link-45deg" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="btn fin-btn-icon"
            [attr.aria-label]="'Eintrag ' + item.title + ' bearbeiten'"
            (click)="edit.emit()"
          >
            <i class="bi bi-pencil" aria-hidden="true"></i>
          </button>
          <button
            type="button"
            class="btn fin-btn-icon debt-card__remove"
            [attr.aria-label]="'Eintrag ' + item.title + ' löschen'"
            (click)="remove.emit()"
          >
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </header>

      <div class="debt-card__headline">
        <span class="fin-kv__label">{{ outstandingLabel() }}</span>
        <app-money-amount size="lg" [amount]="outstandingAmount()" [currency]="item.currency" />
      </div>

      <dl class="debt-card__figures">
        <div>
          <dt class="fin-kv__label">Verliehen</dt>
          <dd>
            <app-money-amount
              size="sm"
              tone="expense"
              [amount]="item.lentAmount"
              [currency]="item.currency"
            />
          </dd>
        </div>
        <div>
          <dt class="fin-kv__label">Zurück</dt>
          <dd>
            <app-money-amount
              size="sm"
              tone="income"
              [amount]="item.repaidAmount"
              [currency]="item.currency"
            />
          </dd>
        </div>
      </dl>

      @if (item.note) {
        <p class="debt-card__note">{{ item.note }}</p>
      }

      @if (positions().length > 0) {
        <details class="fin-details debt-card__details">
          <summary class="fin-details__summary">{{ positionsLabel() }}</summary>

          <!--
            Buchungen und manuelle Beträge stehen in einer Liste, chronologisch: der
            Nutzer sucht den Verlauf des Vorgangs, nicht die Herkunft der Zahlen. Woher
            eine Zeile stammt, sagt ihre Kennzeichnung.
          -->
          <ul class="fin-details__body debt-card__transactions">
            @for (position of positions(); track position.key) {
              <li class="debt-card__transaction">
                <div class="debt-card__transaction-text">
                  <span class="debt-card__transaction-title fin-truncate">
                    {{ position.title }}
                  </span>
                  <span class="debt-card__transaction-meta">{{ meta(position) }}</span>
                </div>

                <app-money-amount
                  size="sm"
                  [tone]="position.direction === 'Income' ? 'income' : 'expense'"
                  [amount]="position.amount"
                  [currency]="position.currency"
                />

                @if (position.manual) {
                  <button
                    type="button"
                    class="btn fin-btn-icon"
                    [attr.aria-label]="'Betrag ' + position.title + ' bearbeiten'"
                    (click)="editEntry.emit(position.id)"
                  >
                    <i class="bi bi-pencil" aria-hidden="true"></i>
                  </button>
                  <button
                    type="button"
                    class="btn fin-btn-icon debt-card__remove"
                    [attr.aria-label]="'Betrag ' + position.title + ' entfernen'"
                    (click)="removeEntry.emit(position.id)"
                  >
                    <i class="bi bi-trash" aria-hidden="true"></i>
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn fin-btn-icon"
                    [attr.aria-label]="'Zuordnung von ' + position.title + ' lösen'"
                    (click)="unlink.emit(position.id)"
                  >
                    <i class="bi bi-x-lg" aria-hidden="true"></i>
                  </button>
                }
              </li>
            }
          </ul>
        </details>
      } @else {
        <p class="debt-card__hint">
          Noch kein Betrag erfasst. Trage ein, was du geliehen hast — oder verknüpfe die Buchung,
          mit der das Geld geflossen ist.
        </p>
      }
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .debt-card {
        padding: var(--fin-space-4) 0;
        border-top: 1px solid var(--fin-border-subtle);
      }
      /* Die erste Karte schließt direkt an die Kopfzeile der Person an. */
      :host(:first-of-type) .debt-card {
        border-top: none;
        padding-top: var(--fin-space-2);
      }

      .debt-card__head {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: var(--fin-space-2);
        margin-bottom: var(--fin-space-3);
      }
      .debt-card__ident {
        flex: 1 1 auto;
        min-width: 0;
      }
      .debt-card__title {
        margin: 0;
        font-size: var(--fin-text-base);
        font-weight: 650;
      }
      .debt-card__meta {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-2);
        margin-top: var(--fin-space-2);
        min-width: 0;
      }
      .debt-card__count {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .debt-card__actions {
        display: flex;
        flex-shrink: 0;
        // Rutschen die Aktionen bei schmaler Kartenbreite in eine eigene Zeile,
        // bleiben sie dort dennoch rechtsbündig statt am Titel zu kleben.
        margin-inline-start: auto;
        gap: var(--fin-space-1);
      }
      .debt-card__remove:hover {
        background-color: var(--fin-danger-tint);
        color: var(--fin-danger);
      }

      .debt-card__headline {
        margin-bottom: var(--fin-space-3);
      }

      .debt-card__figures {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(7rem, 1fr));
        gap: var(--fin-space-3);
        margin: 0;
      }
      .debt-card__figures dd {
        margin: 0.15rem 0 0;
      }

      .debt-card__note {
        margin: var(--fin-space-3) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }

      .debt-card__details {
        margin-top: var(--fin-space-3);
      }
      .debt-card__transactions {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .debt-card__transaction {
        display: flex;
        align-items: center;
        gap: var(--fin-space-2);
      }
      .debt-card__transaction-text {
        flex: 1 1 auto;
        min-width: 0;
        display: flex;
        flex-direction: column;
      }
      .debt-card__transaction-title {
        font-size: var(--fin-text-sm);
        font-weight: 550;
      }
      .debt-card__transaction-meta {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-xs);
      }

      .debt-card__hint {
        margin: var(--fin-space-3) 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
    `,
  ],
})
export class DebtCardComponent {
  readonly debt = input.required<Debt>();

  readonly edit = output<void>();
  readonly remove = output<void>();
  readonly assign = output<void>();
  /** Die ID der Buchung, deren Zuordnung gelöst werden soll. */
  readonly unlink = output<number>();

  /** Ein neuer manueller Betrag soll erfasst werden. */
  readonly addEntry = output<void>();
  /** Die ID des manuellen Betrags, der bearbeitet werden soll. */
  readonly editEntry = output<number>();
  /** Die ID des manuellen Betrags, der entfernt werden soll. */
  readonly removeEntry = output<number>();

  /**
   * Ein zu viel zurückgezahlter Eintrag würde als negative Zahl unnötig verwirren.
   * Angezeigt wird deshalb der Betrag ohne Vorzeichen, die Bedeutung trägt die
   * Beschriftung darüber.
   */
  protected readonly outstandingAmount = computed(() => Math.abs(this.debt().outstandingAmount));

  protected readonly outstandingLabel = computed(() =>
    this.debt().outstandingAmount < 0 ? 'Zu viel zurückbekommen' : 'Offen',
  );

  protected readonly positionsLabel = computed(() => {
    const count = this.positions().length;
    if (count === 0) return 'Kein Betrag';
    return count === 1 ? '1 Position' : `${count} Positionen`;
  });

  /**
   * Buchungen und manuelle Beträge in einer Liste, absteigend nach Datum. Beide Quellen
   * kommen bereits sortiert vom Server; zusammengeführt muss aber neu sortiert werden.
   * Bei gleichem Datum steht die manuelle Position hinten — sie hat kein Konto, an dem
   * sich eine feinere Reihenfolge festmachen ließe.
   */
  protected readonly positions = computed<DebtPosition[]>(() => {
    const item = this.debt();

    const booked: DebtPosition[] = item.transactions.map((transaction) => ({
      key: `t-${transaction.id}`,
      manual: false,
      direction: transaction.direction,
      title: transaction.title,
      amount: transaction.amount,
      currency: transaction.currency,
      date: transaction.bookingDate,
      origin: transaction.accountName,
      id: transaction.id,
    }));

    const manual: DebtPosition[] = item.entries.map((entry) => ({
      key: `e-${entry.id}`,
      manual: true,
      direction: entry.direction,
      title: this.entryTitle(entry),
      amount: entry.amount,
      currency: entry.currency,
      date: entry.entryDate,
      origin: 'Manuell',
      id: entry.id,
    }));

    return [...booked, ...manual].sort((left, right) => {
      if (left.date !== right.date) return right.date.localeCompare(left.date);
      return Number(left.manual) - Number(right.manual);
    });
  });

  protected meta(position: DebtPosition): string {
    const direction = position.direction === 'Income' ? 'Zurück' : 'Verliehen';
    return `${direction} · ${formatDate(position.date)} · ${position.origin}`;
  }

  /**
   * Eine manuelle Position trägt keinen Pflicht-Titel. Steht eine Notiz da, ist sie die
   * beste Bezeichnung; sonst benennt die Richtung die Zeile, damit sie nicht namenlos ist.
   */
  private entryTitle(entry: DebtEntry): string {
    if (entry.note) return entry.note;
    return entry.direction === 'Income' ? 'Rückzahlung' : 'Verliehen';
  }
}
