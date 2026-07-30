import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ModalDialogComponent } from '../modal-dialog/modal-dialog.component';

/** Rückfrage vor einer nicht offensichtlich umkehrbaren Aktion. */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalDialogComponent],
  template: `
    <app-modal-dialog [title]="title()" (closed)="cancelled.emit()">
      <p class="mb-0">{{ message() }}</p>

      <div dialogFooter class="d-flex flex-wrap gap-2 justify-content-end w-100">
        <button type="button" class="btn btn-light" [disabled]="busy()" (click)="cancelled.emit()">
          {{ cancelLabel() }}
        </button>
        <button
          type="button"
          class="btn"
          [class.btn-danger]="variant() === 'danger'"
          [class.btn-primary]="variant() === 'primary'"
          [disabled]="busy()"
          (click)="confirmed.emit()"
        >
          @if (busy()) {
            <span
              class="spinner-border spinner-border-sm me-1"
              role="status"
              aria-hidden="true"
            ></span>
          }
          {{ confirmLabel() }}
        </button>
      </div>
    </app-modal-dialog>
  `,
})
export class ConfirmDialogComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Bestätigen');
  readonly cancelLabel = input('Abbrechen');
  readonly variant = input<'danger' | 'primary'>('primary');
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
