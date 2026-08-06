import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Debt, Debtor } from '../../../../core/models/debt.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { DebtCardComponent } from '../debt-card/debt-card.component';

/** Was der Zuordnungs-Dialog braucht: welcher Eintrag welche Buchung bekommen soll. */
export interface DebtTransactionEvent {
  debt: Debt;
  transactionId: number;
}

/**
 * Alle Einträge einer Person. Die Person ist die Einheit, in der die Frage gestellt wird
 * („Wer schuldet mir wie viel?“) — deshalb steht ihr Gesamtbetrag oben und die einzelnen
 * Vorgänge darunter.
 */
@Component({
  selector: 'app-debtor-group',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent, DebtCardComponent],
  template: `
    @let person = debtor();

    <section class="fin-panel debtor" [attr.aria-labelledby]="headingId()">
      <header class="debtor__header">
        <span class="fin-emblem fin-emblem--brand debtor__avatar" aria-hidden="true">
          {{ initials() }}
        </span>

        <div class="debtor__ident">
          <h3 class="debtor__name fin-truncate" [id]="headingId()">{{ person.personName }}</h3>
          <p class="debtor__meta">{{ metaLabel() }}</p>
        </div>

        <div class="debtor__total">
          <span class="fin-kv__label">{{ totalLabel() }}</span>
          <app-money-amount [amount]="totalAmount()" [currency]="person.currency" />
        </div>
      </header>

      <div class="debtor__body">
        @for (debt of person.debts; track debt.id) {
          <app-debt-card
            [debt]="debt"
            (edit)="edit.emit(debt)"
            (remove)="remove.emit(debt)"
            (assign)="assign.emit(debt)"
            (unlink)="unlink.emit({ debt, transactionId: $event })"
          />
        }
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .debtor__header {
        display: flex;
        align-items: center;
        gap: var(--fin-space-3);
        padding: var(--fin-space-4) var(--fin-space-5);
        border-bottom: 1px solid var(--fin-border-subtle);
      }
      .debtor__avatar {
        font-size: var(--fin-text-base);
        font-weight: 650;
      }
      .debtor__ident {
        flex: 1 1 auto;
        min-width: 0;
      }
      .debtor__name {
        margin: 0;
        font-size: var(--fin-text-md);
      }
      .debtor__meta {
        margin: 0.15rem 0 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .debtor__total {
        flex: 0 0 auto;
        text-align: right;
      }
      .debtor__body {
        padding: var(--fin-space-2) var(--fin-space-5) var(--fin-space-4);
      }
    `,
  ],
})
export class DebtorGroupComponent {
  readonly debtor = input.required<Debtor>();

  readonly edit = output<Debt>();
  readonly remove = output<Debt>();
  readonly assign = output<Debt>();
  readonly unlink = output<DebtTransactionEvent>();

  /** Eindeutig je Person, damit mehrere Gruppen gleichzeitig korrekt beschriftet sind. */
  protected readonly headingId = computed(
    () => `debtor-${this.debtor().personName.replace(/\s+/g, '-').toLowerCase()}`,
  );

  protected readonly initials = computed(() => {
    const segments = this.debtor()
      .personName.split(/\s+/)
      .filter(Boolean);

    if (segments.length >= 2) {
      return (segments[0][0] + segments[1][0]).toUpperCase();
    }

    return (segments[0]?.slice(0, 2) || '?').toUpperCase();
  });

  protected readonly totalAmount = computed(() => Math.abs(this.debtor().outstandingAmount));

  protected readonly totalLabel = computed(() =>
    this.debtor().outstandingAmount < 0 ? 'Zu viel zurück' : 'Schuldet dir',
  );

  protected readonly metaLabel = computed(() => {
    const person = this.debtor();
    const entries = person.debtCount === 1 ? '1 Eintrag' : `${person.debtCount} Einträge`;

    if (person.openCount === 0) {
      return `${entries} · alles beglichen`;
    }

    return `${entries} · ${person.openCount} offen`;
  });
}
