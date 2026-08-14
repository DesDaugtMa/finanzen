import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LinkedTransaction } from '../../../../core/models/transaction.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { formatDate, formatMonthLong } from '../../../../shared/utils/month.util';

/**
 * Zeigt die verknüpfte Buchung des anderen Kontos, ohne dorthin zu wechseln. Bewusst
 * vollständig: Wer hier landet, will nachvollziehen, was auf der Gegenseite steht — eine
 * Kurzfassung würde ihn doch wieder zum Kontowechsel zwingen. Der Sprung bleibt als
 * eigene Aktion daneben stehen, für alles, was das Popup nicht zeigt.
 */
@Component({
  selector: 'app-linked-transaction-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent, MoneyAmountComponent, CategoryBadgeComponent],
  template: `
    <app-modal-dialog title="Verknüpfte Buchung" (closed)="cancelled.emit()">
      @if (loading()) {
        <div class="link-loading" role="status">
          <span class="spinner-border" aria-hidden="true"></span>
          <span class="visually-hidden">Verknüpfte Buchung wird geladen …</span>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger mb-0" role="alert">{{ error() }}</div>
      } @else if (linked(); as item) {
        <div class="link-head">
          <p class="link-head__title">{{ item.title }}</p>
          <app-money-amount
            [amount]="item.amount"
            [currency]="item.currency"
            [tone]="item.type === 'Income' ? 'income' : 'expense'"
          />
        </div>

        <dl class="link-facts">
          <div class="link-fact">
            <dt>Konto</dt>
            <dd>{{ item.accountName }}</dd>
          </div>
          <div class="link-fact">
            <dt>Art</dt>
            <dd>{{ item.type === 'Income' ? 'Einnahme' : 'Ausgabe' }}</dd>
          </div>
          <div class="link-fact">
            <dt>Buchungsdatum</dt>
            <dd>{{ formatDate(item.bookingDate) }}</dd>
          </div>
          @if (item.purchaseDate) {
            <div class="link-fact">
              <dt>Kaufdatum</dt>
              <dd>{{ formatDate(item.purchaseDate) }}</dd>
            </div>
          }
          <div class="link-fact">
            <dt>Abrechnungsmonat</dt>
            <dd>{{ formatMonthLong(item.accountingMonth) }}</dd>
          </div>
          <div class="link-fact">
            <dt>Kategorie</dt>
            <dd>
              @if (item.categoryName) {
                <app-category-badge
                  [name]="item.categoryName"
                  [color]="item.categoryColor"
                  [icon]="item.categoryIcon"
                />
              } @else {
                <span class="text-muted">Ohne Kategorie</span>
              }
            </dd>
          </div>
          @if (item.fixedCostName) {
            <div class="link-fact">
              <dt>Fixkosten</dt>
              <dd>{{ fixedCostLabel() }}</dd>
            </div>
          }
          @if (item.isPending) {
            <div class="link-fact">
              <dt>Status</dt>
              <dd>
                <span class="fin-chip fin-chip--warn">
                  <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                  Noch nicht abgebucht
                </span>
              </dd>
            </div>
          }
        </dl>

        @if (item.note) {
          <p class="link-note">
            <i class="bi bi-chat-left-text" aria-hidden="true"></i>
            <span>{{ item.note }}</span>
          </p>
        }
      }

      <div dialogFooter class="fin-dialog-actions link-actions">
        <button
          type="button"
          class="btn btn-outline-danger link-actions__unlink"
          [disabled]="busy() || !linked()"
          (click)="unlink.emit()"
        >
          <i class="bi bi-link-45deg" aria-hidden="true"></i>
          <span>Verknüpfung lösen</span>
        </button>
        <button type="button" class="btn btn-light" [disabled]="busy()" (click)="cancelled.emit()">
          Schließen
        </button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="busy() || !linked()"
          (click)="jump.emit()"
        >
          <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
          <span>Zu dieser Buchung</span>
        </button>
      </div>
    </app-modal-dialog>
  `,
  styles: [
    `
      .link-loading {
        display: flex;
        justify-content: center;
        padding: var(--fin-space-6) 0;
        color: var(--fin-accent);
      }

      .link-head {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        justify-content: space-between;
        gap: var(--fin-space-2) var(--fin-space-3);
        margin-bottom: var(--fin-space-4);
        padding-bottom: var(--fin-space-3);
        border-bottom: 1px solid var(--fin-border-subtle);
      }
      .link-head__title {
        flex: 1 1 10rem;
        margin: 0;
        color: var(--fin-text-strong);
        font-size: var(--fin-text-md);
        font-weight: 600;
        line-height: var(--fin-leading-snug);
        overflow-wrap: anywhere;
      }

      /*
        Auf schmalen Displays stehen Bezeichnung und Wert untereinander, ab 34rem
        nebeneinander in zwei Spalten. Eine feste Beschriftungsspalte auf dem
        Smartphone würde dem Wert — etwa einem langen Kontonamen — zu wenig Platz
        lassen.
      */
      .link-facts {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-3);
        margin: 0;
      }
      .link-fact {
        display: grid;
        gap: 0.1rem;
      }
      .link-fact dt {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        font-weight: 400;
      }
      .link-fact dd {
        margin: 0;
        color: var(--fin-text-strong);
        overflow-wrap: anywhere;
      }
      @media (min-width: 34rem) {
        .link-fact {
          grid-template-columns: 11rem minmax(0, 1fr);
          align-items: baseline;
          gap: var(--fin-space-3);
        }
      }

      .link-note {
        display: flex;
        align-items: flex-start;
        gap: var(--fin-space-2);
        margin: var(--fin-space-4) 0 0;
        padding: var(--fin-space-3);
        border-radius: var(--fin-radius-sm);
        background-color: var(--fin-surface-sunken);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
        overflow-wrap: anywhere;
      }
      .link-note i {
        flex-shrink: 0;
        margin-top: 0.1rem;
      }

      /*
        „Verknüpfung lösen“ ist die abweichende Aktion und rückt deshalb nach links
        von Schließen und Sprung ab — auf dem Smartphone, wo alle drei untereinander
        stehen, bleibt sie durch die eigene Farbe unterscheidbar.
      */
      @media (min-width: 34rem) {
        .link-actions__unlink {
          margin-inline-end: auto;
        }
      }
    `,
  ],
})
export class LinkedTransactionDialogComponent {
  /** Die verknüpfte Buchung; null, solange geladen wird oder ein Fehler vorliegt. */
  readonly linked = input<LinkedTransaction | null>(null);
  readonly loading = input(false);
  readonly error = input('');
  /** Verhindert weitere Klicks, solange Lösen oder Sprung laufen. */
  readonly busy = input(false);

  readonly jump = output<void>();
  readonly unlink = output<void>();
  readonly cancelled = output<void>();

  protected readonly formatDate = formatDate;
  protected readonly formatMonthLong = formatMonthLong;

  protected readonly fixedCostLabel = computed(() => {
    const item = this.linked();
    if (!item?.fixedCostName) return '';

    return item.fixedCostMonth
      ? `${item.fixedCostName} · ${formatMonthLong(item.fixedCostMonth)}`
      : item.fixedCostName;
  });
}
