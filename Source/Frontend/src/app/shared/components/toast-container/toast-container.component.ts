import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toast-container position-fixed top-0 end-0 p-3" style="z-index: 1080;" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="toast show align-items-center text-white border-0 mb-2"
          [class.bg-success]="toast.variant === 'success'"
          [class.bg-danger]="toast.variant === 'danger'"
          [class.bg-info]="toast.variant === 'info'"
          [class.bg-warning]="toast.variant === 'warning'"
          role="alert"
        >
          <div class="d-flex">
            <div class="toast-body">{{ toast.message }}</div>
            <button
              type="button"
              class="btn-close btn-close-white me-2 m-auto"
              aria-label="Schließen"
              (click)="toastService.dismiss(toast.id)"
            ></button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected toastService = inject(ToastService);
}
