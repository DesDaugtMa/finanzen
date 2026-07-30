import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService, ToastVariant } from '../../../core/services/toast.service';

/**
 * Kurzmeldungen am oberen Bildschirmrand.
 *
 * Anders als bei vollflächig gefärbten Meldungen bleibt der Text hier in der
 * normalen Textfarbe; die Bedeutung tragen ein Symbol und eine farbige Kante.
 * Das hält den Kontrast in beiden Themes zuverlässig über WCAG AA und macht die
 * Art der Meldung auch ohne Farbwahrnehmung erkennbar.
 */
@Component({
  selector: 'app-toast-container',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fin-toasts" aria-live="polite" aria-atomic="true">
      @for (toast of toastService.toasts(); track toast.id) {
        <div class="fin-toast fin-toast--{{ toast.variant }}" role="alert">
          <i class="bi bi-{{ icons[toast.variant] }} fin-toast__icon" aria-hidden="true"></i>
          <p class="fin-toast__message">{{ toast.message }}</p>
          <button
            type="button"
            class="btn-close"
            aria-label="Meldung schließen"
            (click)="toastService.dismiss(toast.id)"
          ></button>
        </div>
      }
    </div>
  `,
})
export class ToastContainerComponent {
  protected toastService = inject(ToastService);

  protected readonly icons: Record<ToastVariant, string> = {
    success: 'check-circle-fill',
    danger: 'exclamation-octagon-fill',
    warning: 'exclamation-triangle-fill',
    info: 'info-circle-fill',
  };
}
