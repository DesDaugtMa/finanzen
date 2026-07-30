import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BankAccount } from '../../../../core/models/bank-account.model';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { maskIban } from '../../../../shared/utils/iban.util';
import { DEFAULT_ACCENT_COLOR } from '../../../../shared/utils/color-presets';

/** Übersichtskarte eines Girokontos. Die gesamte Karte führt zur Detailseite. */
@Component({
  selector: 'app-bank-account-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, MoneyAmountComponent],
  template: `
    @let item = account();

    <article class="account-card card shadow-sm h-100" [style.border-top-color]="accentColor()">
      <div class="card-body d-flex flex-column p-3 p-sm-4">
        <div class="d-flex align-items-start gap-3">
          <span
            class="account-avatar flex-shrink-0"
            [style.background-color]="accentColor()"
            aria-hidden="true"
          >
            <i class="bi bi-bank2"></i>
          </span>

          <div class="flex-grow-1 min-width-0">
            <h3 class="h6 fw-bold mb-1 text-truncate">
              <a class="stretched-link account-link" [routerLink]="['/girokonten', item.id]">{{
                item.name
              }}</a>
            </h3>
            <p class="text-muted small mb-0 text-truncate">{{ subtitle() }}</p>
          </div>

          <div class="dropdown card-actions flex-shrink-0">
            <button
              type="button"
              class="btn btn-sm btn-light rounded-circle account-menu-button"
              data-bs-toggle="dropdown"
              data-bs-boundary="viewport"
              aria-expanded="false"
              [attr.aria-label]="'Aktionen für ' + item.name"
            >
              <i class="bi bi-three-dots-vertical" aria-hidden="true"></i>
            </button>
            <ul class="dropdown-menu dropdown-menu-end shadow-sm">
              <li>
                <button type="button" class="dropdown-item" (click)="edit.emit(item)">
                  <i class="bi bi-pencil me-2" aria-hidden="true"></i> Bearbeiten
                </button>
              </li>
              <li><hr class="dropdown-divider" /></li>
              <li>
                <button type="button" class="dropdown-item text-danger" (click)="remove.emit(item)">
                  <i class="bi bi-trash me-2" aria-hidden="true"></i> Löschen
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div class="mt-auto pt-3">
          <p class="text-muted text-uppercase account-label mb-1">Kontostand</p>
          <app-money-amount [amount]="item.currentBalance" [currency]="item.currency" size="lg" />
        </div>
      </div>
    </article>
  `,
  styles: [
    `
      /* Ohne Höhe am Host greift h-100 der Karte nicht — Karten im Raster wären ungleich hoch. */
      :host {
        display: block;
        height: 100%;
      }
      .account-card {
        border-radius: 1rem;
        /* Die Akzentfarbe des Kontos sitzt als Inline-Style auf border-top-color. */
        border: 1px solid var(--bs-border-color-translucent);
        border-top-width: 3px;
        background-color: var(--color-surface);
        transition:
          transform 0.15s ease,
          box-shadow 0.15s ease;
      }
      .account-card:hover,
      .account-card:focus-within {
        transform: translateY(-2px);
        box-shadow: var(--bs-box-shadow) !important;
      }
      .account-avatar {
        width: 2.75rem;
        height: 2.75rem;
        border-radius: 0.85rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        font-size: 1.25rem;
      }
      /* Ohne min-width:0 bricht text-truncate im Flex-Kind nicht um. */
      .min-width-0 {
        min-width: 0;
      }
      .account-link {
        color: inherit;
        text-decoration: none;
      }
      .account-link:hover {
        text-decoration: underline;
      }
      .account-link:focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: 2px;
        border-radius: 0.25rem;
      }
      .account-label {
        font-size: 0.7rem;
        letter-spacing: 0.06em;
      }
      /* Über der stretched-link-Fläche, damit das Menü nicht zur Detailseite navigiert. */
      .card-actions {
        position: relative;
        z-index: 2;
      }
      .account-menu-button {
        width: 2.25rem;
        height: 2.25rem;
        line-height: 1;
      }
    `,
  ],
})
export class BankAccountCardComponent {
  readonly account = input.required<BankAccount>();

  readonly edit = output<BankAccount>();
  readonly remove = output<BankAccount>();

  protected readonly accentColor = computed(() => this.account().color ?? DEFAULT_ACCENT_COLOR);

  protected readonly subtitle = computed(() => {
    const { bankName, iban } = this.account();
    const parts = [bankName, iban ? maskIban(iban) : null].filter(Boolean);
    return parts.length > 0 ? parts.join(' · ') : 'Girokonto';
  });
}
