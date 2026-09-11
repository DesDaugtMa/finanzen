import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import {
  SortDirection,
  Transaction,
  TransactionSort,
} from '../../../../core/models/transaction.model';
import { ViewportService } from '../../../../core/services/viewport.service';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { formatDate } from '../../../../shared/utils/month.util';

interface SortableColumn {
  key: TransactionSort;
  label: string;
}

/**
 * Liste der Buchungen eines Monats. Ab Tablet als Tabelle mit sortierbaren Spalten,
 * darunter als Zeilenkarten — dieselben Daten, jeweils in der Form, die auf dem
 * Gerät gut lesbar ist.
 *
 * Es wird immer nur *eine* der beiden Formen gerendert. Beide gleichzeitig im DOM
 * zu halten und die unpassende per CSS auszublenden hiesse, auf dem Smartphone
 * eine vollständige Tabelle mit bis zu 25 Zeilen mitzuschleppen, die niemand
 * sieht — doppelte Knotenzahl und doppelte Layout-Arbeit auf dem schwächeren
 * Gerät.
 */
@Component({
  selector: 'app-transaction-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MoneyAmountComponent, CategoryBadgeComponent],
  template: `
    @if (viewport.isWide()) {
      <!-- Tabelle ab Tablet -->
      <div class="transaction-table-wrap">
        <table class="table align-middle transaction-table">
          <caption class="visually-hidden">
            Buchungen des gewählten Monats
          </caption>
          <thead>
            <tr>
              @for (column of columns; track column.key) {
                <th
                  scope="col"
                  [class.text-end]="column.key === 'Amount'"
                  [attr.aria-sort]="ariaSort(column.key)"
                >
                  <button type="button" class="sort-button" (click)="sortChange.emit(column.key)">
                    {{ column.label }}
                    <i class="bi" [class]="sortIcon(column.key)" aria-hidden="true"></i>
                  </button>
                </th>
              }
              <th scope="col"><span class="visually-hidden">Aktionen</span></th>
            </tr>
          </thead>
          <tbody>
            @for (item of transactions(); track item.id) {
              <tr [attr.id]="rowId(item)" [class.tx-highlight]="highlighted() === item.id">
                <td class="text-nowrap">{{ formatDate(item.bookingDate) }}</td>
                <td>
                  <span class="transaction-title">
                    <span class="fin-break-all">{{ item.title }}</span>
                    @if (item.isLinked) {
                      <button
                        type="button"
                        class="fin-chip link-chip"
                        [attr.aria-label]="linkLabel(item)"
                        (click)="openLink.emit(item)"
                      >
                        <i class="bi bi-link-45deg" aria-hidden="true"></i>
                        {{ item.linkedAccountName }}
                      </button>
                    }
                    @if (item.isPending) {
                      <span class="fin-chip fin-chip--warn">
                        <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                        Noch nicht abgebucht
                      </span>
                    }
                    @if (item.note) {
                      <i
                        class="bi bi-chat-left-text text-muted"
                        [attr.title]="item.note"
                        aria-hidden="true"
                      ></i>
                    }
                  </span>
                </td>
                <td>
                  <app-category-badge
                    [name]="item.categoryName"
                    [color]="item.categoryColor"
                    [icon]="item.categoryIcon"
                  />
                </td>
                <td class="text-end">
                  <app-money-amount
                    class="tx-amount"
                    [class.tx-amount--pending]="item.isPending"
                    [amount]="item.amount"
                    [currency]="item.currency"
                    [tone]="item.type === 'Income' ? 'income' : 'expense'"
                  />
                </td>
                <td>
                  <div class="transaction-actions">
                    @if (item.isPending) {
                      <button
                        type="button"
                        class="btn fin-btn-icon row-settle"
                        [attr.aria-label]="'Buchung ' + item.title + ' als abgebucht markieren'"
                        [attr.title]="'Als abgebucht markieren'"
                        [disabled]="settling() === item.id"
                        (click)="settle.emit(item)"
                      >
                        <i class="bi bi-check2-circle" aria-hidden="true"></i>
                      </button>
                    }
                    <button
                      type="button"
                      class="btn fin-btn-icon"
                      [attr.aria-label]="'Buchung ' + item.title + ' bearbeiten'"
                      (click)="edit.emit(item)"
                    >
                      <i class="bi bi-pencil" aria-hidden="true"></i>
                    </button>
                    <button
                      type="button"
                      class="btn fin-btn-icon row-remove"
                      [attr.aria-label]="'Buchung ' + item.title + ' löschen'"
                      (click)="remove.emit(item)"
                    >
                      <i class="bi bi-trash" aria-hidden="true"></i>
                    </button>
                  </div>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    } @else {
      <!--
        Zeilenkarten auf schmalen Displays. Bezeichnung und Betrag stehen in der
        oberen Zeile, Metadaten und Aktionen in der unteren: nebeneinander in
        einer einzigen Zeile blieben der Bezeichnung neben Betrag und zwei
        Schaltflächen auf einem 320px-Display nur wenige Pixel.
      -->
      <ul class="tx-list">
        @for (item of transactions(); track item.id) {
          <li
            class="tx-row"
            [attr.id]="rowId(item)"
            [class.tx-highlight]="highlighted() === item.id"
          >
            <span class="tx-row__lead" aria-hidden="true">
              <app-category-badge
                [showLabel]="false"
                [name]="item.categoryName"
                [color]="item.categoryColor"
                [icon]="item.categoryIcon"
              />
            </span>

            <p class="tx-row__title">{{ item.title }}</p>

            <app-money-amount
              class="tx-row__amount tx-amount"
              [class.tx-amount--pending]="item.isPending"
              [amount]="item.amount"
              [currency]="item.currency"
              [tone]="item.type === 'Income' ? 'income' : 'expense'"
            />

            <p class="tx-row__meta">
              <span>{{ formatDate(item.bookingDate) }}</span>
              <span class="fin-dot"></span>
              <span>{{ item.categoryName ?? 'Ohne Kategorie' }}</span>
              @if (item.isLinked) {
                <button
                  type="button"
                  class="fin-chip link-chip"
                  [attr.aria-label]="linkLabel(item)"
                  (click)="openLink.emit(item)"
                >
                  <i class="bi bi-link-45deg" aria-hidden="true"></i>
                  {{ item.linkedAccountName }}
                </button>
              }
              @if (item.isPending) {
                <span class="fin-chip fin-chip--warn">
                  <i class="bi bi-hourglass-split" aria-hidden="true"></i>
                  Noch nicht abgebucht
                </span>
              }
            </p>

            <div class="tx-row__actions">
              @if (item.isPending) {
                <button
                  type="button"
                  class="btn fin-btn-icon row-settle"
                  [attr.aria-label]="'Buchung ' + item.title + ' als abgebucht markieren'"
                  [disabled]="settling() === item.id"
                  (click)="settle.emit(item)"
                >
                  <i class="bi bi-check2-circle" aria-hidden="true"></i>
                </button>
              }
              <button
                type="button"
                class="btn fin-btn-icon"
                [attr.aria-label]="'Buchung ' + item.title + ' bearbeiten'"
                (click)="edit.emit(item)"
              >
                <i class="bi bi-pencil" aria-hidden="true"></i>
              </button>
              <button
                type="button"
                class="btn fin-btn-icon row-remove"
                [attr.aria-label]="'Buchung ' + item.title + ' löschen'"
                (click)="remove.emit(item)"
              >
                <i class="bi bi-trash" aria-hidden="true"></i>
              </button>
            </div>

            <!--
              Die Notiz steht als Text in der Zeile und nicht nur als
              title-Attribut an einem Symbol: auf dem Touchscreen gibt es kein
              Hover, ein Tooltip wäre dort also unerreichbar und die Notiz für
              Mobilnutzer unsichtbar.
            -->
            @if (item.note) {
              <p class="tx-row__note">
                <i class="bi bi-chat-left-text" aria-hidden="true"></i>
                <span>{{ item.note }}</span>
              </p>
            }
          </li>
        }
      </ul>
    }
  `,
  styles: [
    `
      /* Der Umschaltpunkt zwischen Tabelle und Zeilenkarten liegt bei 48rem —
         der Breite, ab der vier Spalten plus Aktionen ohne Quetschen passen.
         Welche Form gerendert wird, entscheidet der ViewportService; hier steht
         nur noch die Gestaltung. */
      .transaction-table-wrap {
        // overflow-y explizit auf hidden statt dem Default visible: sonst
        // berechnet der Browser ihn automatisch als auto (CSS-Spec-Regel, wenn
        // nur eine Achse gesetzt ist) — schon 1px Rundungs-Überlauf der Tabelle
        // erzeugt dann einen eigenen, an die Tabelle geklebten Scrollbalken.
        // Nur horizontales Scrollen ist hier beabsichtigt (schmale Viewports).
        overflow-x: auto;
        overflow-y: hidden;
      }

      .sort-button {
        display: inline-flex;
        align-items: center;
        gap: var(--fin-space-1);
        /* Volle Zellhöhe als Klickfläche, damit die Sortierung auch mit dem
           Finger gut zu treffen ist. */
        min-height: var(--fin-touch-min);
        padding: 0;
        border: none;
        background: none;
        color: inherit;
        font: inherit;
        letter-spacing: inherit;
        text-transform: inherit;
        cursor: pointer;
        transition: color var(--fin-duration-fast) var(--fin-ease-out);
      }
      .sort-button:hover {
        color: var(--fin-text-strong);
      }
      .sort-button:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: 2px;
      }
      /* Das inaktive Sortiersymbol bleibt sichtbar, aber zurückgenommen — es
         zeigt, dass die Spalte sortierbar ist, ohne die Kopfzeile zu füllen. */
      .sort-button .bi-arrow-down-up {
        opacity: 0.35;
      }

      .transaction-table td {
        border-color: var(--fin-border-subtle);
      }
      .transaction-title {
        display: inline-flex;
        align-items: center;
        gap: var(--fin-space-2);
        flex-wrap: wrap;
      }
      .transaction-actions {
        display: flex;
        justify-content: flex-end;
        gap: var(--fin-space-1);
      }
      .row-remove:hover {
        background-color: var(--fin-danger-tint);
        color: var(--fin-danger);
      }
      .row-settle:hover:not(:disabled) {
        background-color: var(--fin-success-tint);
        color: var(--fin-success);
      }

      /* -------------------------------------------------------------------
         Verknüpfung
         ------------------------------------------------------------------- */

      /*
        Das Kennzeichen der Verknüpfung ist zugleich der Weg zur Gegenbuchung. Es
        bleibt optisch ein Chip, wird aber als echte Schaltfläche ausgezeichnet —
        anders wäre es mit der Tastatur nicht erreichbar und für Screenreader kein
        Bedienelement.
      */
      /* Nur die Schriftfamilie wird geerbt — Größe und Stärke kommen aus .fin-chip
         und würden von einem pauschalen "font: inherit" überschrieben. */
      .link-chip {
        font-family: inherit;
        cursor: pointer;
        transition:
          border-color var(--fin-duration-fast) var(--fin-ease-out),
          color var(--fin-duration-fast) var(--fin-ease-out);
      }
      .link-chip:hover {
        border-color: var(--fin-accent);
        color: var(--fin-accent);
      }
      .link-chip:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: 2px;
      }

      /*
        Die angesprungene Zeile wird kurz hervorgehoben. Der Streifen links steht neben
        der Hinterlegung, damit die Zeile auch dann auffindbar bleibt, wenn Farben
        schwach oder gar nicht unterschieden werden.

        In der Tabelle trägt die Hinterlegung die Zelle, nicht die Zeile: Bootstrap
        setzt die Hintergrundfarbe auf den Zellen, ein Hintergrund an der Zeile
        bliebe davon verdeckt.
      */
      .tx-highlight td,
      li.tx-highlight {
        animation: tx-highlight-fade 2.4s var(--fin-ease-out) forwards;
      }
      .tx-highlight td:first-child,
      li.tx-highlight {
        box-shadow: inset 3px 0 0 0 var(--fin-accent);
      }
      @keyframes tx-highlight-fade {
        0%,
        60% {
          background-color: var(--fin-accent-tint);
        }
        100% {
          background-color: transparent;
        }
      }
      @media (prefers-reduced-motion: reduce) {
        .tx-highlight td,
        li.tx-highlight {
          animation: none;
          background-color: var(--fin-accent-tint);
        }
      }

      /* -------------------------------------------------------------------
         Noch nicht abgebucht
         ------------------------------------------------------------------- */

      /*
        Der Betrag steht zurückgenommen und gestrichelt unterstrichen: er zählt
        bereits voll im Kontostand mit, ist aber noch nicht vollzogen. Die
        Deckkraft allein wäre zu wenig — sie ist keine verlässliche Information
        und fällt bei hohem Kontrastbedarf weg. Die eindeutige Aussage trägt
        deshalb das Kennzeichen mit Text daneben, nicht diese Gestaltung.
      */
      .tx-amount--pending {
        opacity: 0.72;
        text-decoration: underline dashed currentColor;
        text-underline-offset: 0.3em;
      }

      /* -------------------------------------------------------------------
         Zeilenkarte (Mobil)
         ------------------------------------------------------------------- */

      .tx-list {
        display: flex;
        flex-direction: column;
        margin: 0;
        padding: 0;
        list-style: none;
      }

      /*
        Zwei Zeilen, drei Spalten. Das Kategoriesymbol steht links über beide
        Zeilen, rechts liegen Betrag und Aktionen übereinander. Die mittlere
        Spalte nimmt den Rest — minmax(0, 1fr) ist nötig, damit sie unter ihre
        Inhaltsbreite schrumpfen darf und die Kürzung greift.
      */
      .tx-row {
        display: grid;
        grid-template-columns: auto minmax(0, 1fr) auto;
        grid-template-areas:
          'lead title  amount'
          'lead meta   actions'
          'note note   note';
        align-items: center;
        gap: var(--fin-space-1) var(--fin-space-3);
        padding: var(--fin-space-3) var(--fin-space-4);
        border-top: 1px solid var(--fin-border-subtle);
      }
      .tx-row:first-child {
        border-top: 0;
      }

      .tx-row__lead {
        grid-area: lead;
        align-self: start;
        /* Auf Höhe der ersten Textzeile, nicht auf Höhe der ganzen Karte. */
        margin-top: 0.1rem;
      }

      .tx-row__title {
        grid-area: title;
        margin: 0;
        color: var(--fin-text-strong);
        font-size: var(--fin-text-base);
        font-weight: 600;
        line-height: var(--fin-leading-snug);
        /* Bis zu zwei Zeilen statt harter Kürzung: die Bezeichnung ist das
           Merkmal, an dem eine Buchung wiedererkannt wird. */
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        overflow-wrap: anywhere;
      }

      .tx-row__amount {
        grid-area: amount;
        justify-self: end;
        align-self: start;
      }

      .tx-row__meta {
        grid-area: meta;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-1) var(--fin-space-2);
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }

      .tx-row__actions {
        grid-area: actions;
        display: flex;
        justify-self: end;
        gap: var(--fin-space-1);
      }

      .tx-row__note {
        grid-area: note;
        display: flex;
        align-items: flex-start;
        gap: var(--fin-space-2);
        margin: var(--fin-space-1) 0 0;
        padding: var(--fin-space-2) var(--fin-space-3);
        border-radius: var(--fin-radius-sm);
        background-color: var(--fin-surface-sunken);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
        overflow-wrap: anywhere;
      }
      .tx-row__note i {
        flex-shrink: 0;
        margin-top: 0.1rem;
      }
    `,
  ],
})
export class TransactionListComponent {
  protected readonly viewport = inject(ViewportService);

  readonly transactions = input.required<Transaction[]>();
  readonly sort = input.required<TransactionSort>();
  readonly direction = input.required<SortDirection>();

  /** Die Buchung, deren Abhaken gerade läuft — verhindert einen zweiten Klick. */
  readonly settling = input<number | null>(null);

  /** Die angesprungene Buchung — sie wird kurz hervorgehoben. */
  readonly highlighted = input<number | null>(null);

  readonly sortChange = output<TransactionSort>();
  readonly edit = output<Transaction>();
  readonly remove = output<Transaction>();
  /** Diese Buchung soll als abgebucht markiert werden. */
  readonly settle = output<Transaction>();
  /** Die verknüpfte Gegenbuchung dieser Buchung soll gezeigt werden. */
  readonly openLink = output<Transaction>();

  protected readonly columns: readonly SortableColumn[] = [
    { key: 'BookingDate', label: 'Datum' },
    { key: 'Title', label: 'Bezeichnung' },
    { key: 'Category', label: 'Kategorie' },
    { key: 'Amount', label: 'Betrag' },
  ];

  protected readonly formatDate = formatDate;

  /**
   * Anker für den Sprung von der Gegenbuchung hierher. Die ID trägt bewusst die
   * Buchungsnummer, damit der Aufrufer die Zeile ohne Umweg über die Liste findet.
   */
  protected rowId(item: Transaction): string {
    return `tx-${item.id}`;
  }

  protected linkLabel(item: Transaction): string {
    return `Verknüpfte Buchung auf ${item.linkedAccountName} anzeigen`;
  }

  protected ariaSort(key: TransactionSort): 'ascending' | 'descending' | 'none' {
    if (this.sort() !== key) return 'none';
    return this.direction() === 'Ascending' ? 'ascending' : 'descending';
  }

  protected sortIcon(key: TransactionSort): string {
    if (this.sort() !== key) return 'bi-arrow-down-up opacity-25';
    return this.direction() === 'Ascending' ? 'bi-sort-up' : 'bi-sort-down';
  }
}
