import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { BankAccount } from '../../../../core/models/bank-account.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';

/** Übernimmt die Kategorien eines anderen Kontos in das geöffnete Konto. */
@Component({
  selector: 'app-copy-categories-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent],
  template: `
    <app-modal-dialog title="Kategorien übernehmen" (closed)="cancelled.emit()">
      @if (loading()) {
        <div class="text-center py-4">
          <span class="spinner-border text-primary" role="status">
            <span class="visually-hidden">Konten werden geladen …</span>
          </span>
        </div>
      } @else if (accounts().length === 0) {
        <p class="mb-0">
          Es gibt noch kein weiteres Girokonto, aus dem Kategorien übernommen werden könnten.
        </p>
      } @else {
        <label for="sourceAccount" class="form-label">Quelle</label>
        <select
          id="sourceAccount"
          class="form-select"
          [value]="selectedId() ?? ''"
          [disabled]="saving()"
          (change)="onSelect($event)"
        >
          @for (account of accounts(); track account.id) {
            <option [value]="account.id">{{ account.name }}</option>
          }
        </select>
        <p class="form-text mb-0">
          Kategorien, die es hier schon gibt, werden übersprungen. Budgets werden nicht übernommen.
        </p>
      }

      <div dialogFooter class="d-flex flex-wrap gap-2 justify-content-end w-100">
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
          [disabled]="saving() || selectedId() === null"
          (click)="submit()"
        >
          @if (saving()) {
            <span
              class="spinner-border spinner-border-sm me-1"
              role="status"
              aria-hidden="true"
            ></span>
          }
          Übernehmen
        </button>
      </div>
    </app-modal-dialog>
  `,
})
export class CopyCategoriesDialogComponent {
  readonly accounts = input.required<BankAccount[]>();
  readonly loading = input(false);
  readonly saving = input(false);

  readonly copy = output<number>();
  readonly cancelled = output<void>();

  private readonly manualSelection = signal<number | null>(null);

  /** Ohne eigene Auswahl ist das erste Konto vorbelegt. */
  protected readonly selectedId = computed<number | null>(() => {
    const manual = this.manualSelection();
    if (manual !== null) return manual;

    const accounts = this.accounts();
    return accounts.length > 0 ? accounts[0].id : null;
  });

  protected onSelect(event: Event): void {
    this.manualSelection.set(Number((event.target as HTMLSelectElement).value));
  }

  protected submit(): void {
    const id = this.selectedId();
    if (id !== null) this.copy.emit(id);
  }
}
