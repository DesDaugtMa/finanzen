import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountApiService } from '../../../../core/services/account-api.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="container py-4">
      @let user = authService.currentUser();

      @if (user && !user.emailVerified) {
        <div class="alert alert-warning d-flex flex-wrap align-items-center gap-2" role="alert">
          <i class="bi bi-envelope-exclamation"></i>
          <span class="me-auto">Bitte bestätige deine E-Mail-Adresse ({{ user.email }}).</span>
          <button type="button" class="btn btn-sm btn-warning" [disabled]="resending()" (click)="resend()">
            @if (resending()) {
              <span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
            }
            Erneut senden
          </button>
        </div>
      }

      <div class="card border-0 shadow-sm">
        <div class="card-body p-4">
          <h1 class="h4 fw-bold mb-1">Willkommen, {{ user?.displayName }}!</h1>
          <p class="text-muted mb-4">Schön, dass du da bist. Hier entsteht dein Finanz-Dashboard.</p>

          <div class="d-flex flex-wrap gap-2">
            <a routerLink="/konto/sitzungen" class="btn btn-outline-primary">
              <i class="bi bi-shield-lock me-1"></i> Aktive Sitzungen
            </a>
            @if (authService.isAdmin()) {
              <a routerLink="/admin/einladungen" class="btn btn-outline-primary">
                <i class="bi bi-person-plus me-1"></i> Einladungen verwalten
              </a>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class HomeComponent {
  protected authService = inject(AuthService);
  private accountApi = inject(AccountApiService);
  private toastService = inject(ToastService);

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
