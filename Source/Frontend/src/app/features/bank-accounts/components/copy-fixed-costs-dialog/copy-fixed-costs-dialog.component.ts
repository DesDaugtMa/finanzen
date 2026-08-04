import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FixedCostCopyPreview } from '../../../../core/models/fixed-cost.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { MoneyAmountComponent } from '../../../../shared/components/money-amount/money-amount.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { formatMonthLong } from '../../../../shared/utils/month.util';

/**
 * Übernimmt Fixkosten aus einem anderen Monat. Quellmonat und Positionen werden
 * ausdrücklich gewählt — Beträge ändern sich von Monat zu Monat, deshalb soll die
 * Übernahme eine bewusste Entscheidung sein und keine stille Kopie.
 */
@Component({
  selector: 'app-copy-fixed-costs-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent, MoneyAmountComponent, CategoryBadgeComponent],
  template: `
    <app-modal-dialog title="Fixkosten übernehmen" size="lg" (closed)="cancelled.emit()">
      @if (loading()) {
        <div class="copy-loading" role="status">
          <span class="spinner-border" aria-hidden="true"></span>
          <span class="visually-hidden">Fixkosten werden geladen …</span>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger mb-0" role="alert">{{ error() }}</div>
      } @else if (preview(); as data) {
        @if (data.availableMonths.length === 0) {
          <p class="mb-0">
            Es gibt bisher keinen anderen Monat mit Fixkosten, aus dem übernommen werden könnte.
          </p>
        } @else {
          <div class="copy-source">
            <label for="fixedCostSourceMonth" class="form-label">Aus welchem Monat?</label>
            <select
              id="fixedCostSourceMonth"
              class="form-select"
              [value]="data.sourceMonth ?? ''"
              [disabled]="saving()"
              (change)="onSourceChange($event)"
            >
              @for (month of data.availableMonths; track month) {
                <option [value]="month">{{ monthLabel(month) }}</option>
              }
            </select>
          </div>

          @if (data.items.length === 0) {
            <p class="copy-note mb-0">In diesem Monat sind keine Fixkosten hinterlegt.</p>
          } @else {
            <fieldset class="copy-list">
              <legend class="form-label">Welche Positionen?</legend>

              @for (item of data.items; track item.id) {
                <div class="form-check copy-item" [class.copy-item--disabled]="item.alreadyExists">
                  <input
                    type="checkbox"
                    class="form-check-input"
                    [id]="'copyFixedCost' + item.id"
                    [checked]="isSelected(item.id)"
                    [disabled]="item.alreadyExists || saving()"
                    (change)="toggle(item.id)"
                  />
                  <label
                    class="form-check-label copy-item__label"
                    [for]="'copyFixedCost' + item.id"
                  >
                    <span class="copy-item__text">
                      <span class="copy-item__name fin-truncate">{{ item.name }}</span>
                      @if (item.alreadyExists) {
                        <span class="copy-item__hint">Gibt es in diesem Monat schon</span>
                      } @else if (item.categoryId !== null) {
                        <app-category-badge
                          class="copy-item__category"
                          [name]="item.categoryName"
                          [color]="item.categoryColor"
                          [icon]="item.categoryIcon"
                        />
                      }
                    </span>
                    <app-money-amount size="sm" [amount]="item.amount" [currency]="data.currency" />
                  </label>
                </div>
              }
            </fieldset>

            <p class="copy-note mb-0">
              Übernommen werden Bezeichnung, Betrag, Kategorie und Notiz — nicht die Buchungen.
            </p>
          }
        }
      }

      <div dialogFooter class="fin-dialog-actions">
        <button
          type="button"
          class="btn btn-light"
          [disabled]="saving()"
          (click)="cancelled.emit()"
        >
          Abbrechen
        </button>
        <button
          type="button"
          class="btn btn-primary"
          [disabled]="saving() || selectedIds().length === 0"
          (click)="submit()"
        >
          @if (saving()) {
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          }
          {{ submitLabel() }}
        </button>
      </div>
    </app-modal-dialog>
  `,
  styles: [
    `
      .copy-loading {
        display: flex;
        justify-content: center;
        padding: var(--fin-space-6) 0;
        color: var(--fin-accent);
      }
      .copy-source {
        margin-bottom: var(--fin-space-4);
      }
      .copy-list {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }
      .copy-list legend {
        float: none;
        width: auto;
        padding: 0;
      }
      .copy-item {
        display: flex;
        align-items: center;
        gap: var(--fin-space-2);
        padding: var(--fin-space-2) 0;
        margin: 0;
        border-top: 1px solid var(--fin-border-subtle);
      }
      .copy-item:first-of-type {
        border-top: none;
      }
      .copy-item .form-check-input {
        flex-shrink: 0;
        margin: 0;
      }
      .copy-item__label {
        display: flex;
        flex: 1 1 auto;
        align-items: center;
        gap: var(--fin-space-3);
        justify-content: space-between;
        min-width: 0;
        /* Große Trefferfläche: das gesamte Label schaltet die Auswahl. */
        min-height: var(--fin-touch-min);
        cursor: pointer;
      }
      .copy-item--disabled .copy-item__label {
        cursor: default;
        opacity: 0.6;
      }
      .copy-item__text {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-1);
        min-width: 0;
      }
      .copy-item__name {
        font-weight: 550;
      }
      .copy-item__category {
        min-width: 0;
        font-size: var(--fin-text-sm);
      }
      .copy-item__hint {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-xs);
      }
      .copy-note {
        margin-top: var(--fin-space-3);
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
    `,
  ],
})
export class CopyFixedCostsDialogComponent {
  readonly preview = input<FixedCostCopyPreview | null>(null);
  readonly loading = input(false);
  readonly saving = input(false);
  readonly error = input('');

  /** Der Nutzer hat einen anderen Quellmonat gewählt (`yyyy-MM`). */
  readonly sourceMonthChange = output<string>();
  readonly copy = output<number[]>();
  readonly cancelled = output<void>();

  private readonly selection = signal<ReadonlySet<number>>(new Set());

  protected readonly selectedIds = computed(() => [...this.selection()]);

  protected readonly submitLabel = computed(() => {
    const count = this.selectedIds().length;
    return count === 0 ? 'Übernehmen' : `${count} übernehmen`;
  });

  constructor() {
    // Beim Wechsel des Quellmonats sind standardmäßig alle Positionen gewählt,
    // die es im Zielmonat noch nicht gibt — der Regelfall ist „alles übernehmen“.
    effect(() => {
      const data = this.preview();
      const preselected = (data?.items ?? []).filter((i) => !i.alreadyExists).map((i) => i.id);
      this.selection.set(new Set(preselected));
    });
  }

  protected monthLabel(month: string): string {
    return formatMonthLong(month);
  }

  protected isSelected(id: number): boolean {
    return this.selection().has(id);
  }

  protected toggle(id: number): void {
    this.selection.update((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  protected onSourceChange(event: Event): void {
    this.sourceMonthChange.emit((event.target as HTMLSelectElement).value);
  }

  protected submit(): void {
    const ids = this.selectedIds();
    if (ids.length > 0) this.copy.emit(ids);
  }
}
