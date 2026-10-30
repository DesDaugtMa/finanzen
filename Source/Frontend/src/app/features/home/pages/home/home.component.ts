import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountApiService } from '../../../../core/services/account-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';

/**
 * Die Startseite nach der Anmeldung. Sie ist bewusst leer und dient als
 * Ausgangspunkt für die fachlichen Bereiche, die neu entstehen.
 */
@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent],
  template: `
    <div class="container">
      @let user = authService.currentUser();

      <header class="fin-page-header">
        <div class="fin-page-header__text">
          <h1 class="fin-page-header__title">Übersicht</h1>
        </div>
      </header>

      @if (user && !user.emailVerified) {
        <div class="alert alert-warning verify-banner" role="alert">
          <i class="bi bi-envelope-exclamation verify-banner__icon" aria-hidden="true"></i>
          <div class="verify-banner__text">
            <strong>E-Mail-Adresse noch nicht bestätigt</strong>
            <span class="fin-break-all"
              >Wir haben eine Bestätigung an {{ user.email }} gesendet.</span
            >
          </div>
          <button
            type="button"
            class="btn btn-sm btn-warning"
            [disabled]="resending()"
            (click)="resend()"
          >
            @if (resending()) {
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
            }
            Erneut senden
          </button>
        </div>
      }

      <app-empty-state
        icon="stars"
        title="Hier entsteht etwas Neues"
        message="Die Anwendung wird gerade neu aufgebaut."
      />
    </div>
  `,
  styles: [
    `
      .verify-banner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-5);
      }
      .verify-banner__icon {
        flex-shrink: 0;
        font-size: var(--fin-text-lg);
      }
      .verify-banner__text {
        /* Nimmt den verfügbaren Platz, damit die Schaltfläche rechts außen sitzt
           und auf schmalen Displays in die nächste Zeile rutscht. */
        flex: 1 1 14rem;
        display: flex;
        flex-direction: column;
        min-width: 0;
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
    `,
  ],
})
export class HomeComponent {
  protected authService = inject(AuthService);

  private readonly accountApi = inject(AccountApiService);
  private readonly toastService = inject(ToastService);

  protected resending = signal(false);

  protected resend(): void {
    const email = this.authService.currentUser()?.email;
    if (!email) return;

    this.resending.set(true);
    this.accountApi.resendVerification(email).subscribe({
      next: () => {
        this.resending.set(false);
        this.toastService.success('Bestätigungs-E-Mail wurde versendet.');
      },
      error: () => {
        this.resending.set(false);
        this.toastService.success('Bestätigungs-E-Mail wurde versendet.');
      },
    });
  }
}
