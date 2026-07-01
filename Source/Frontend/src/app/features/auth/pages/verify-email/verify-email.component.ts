import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { AccountApiService } from '../../../../core/services/account-api.service';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, AuthCardComponent],
  template: `
    <app-auth-card title="E-Mail-Bestätigung">
      @switch (state()) {
        @case ('loading') {
          <div class="text-center py-4">
            <span class="spinner-border text-primary" role="status" aria-hidden="true"></span>
            <p class="text-muted small mt-3 mb-0">E-Mail wird bestätigt…</p>
          </div>
        }
        @case ('success') {
          <div class="alert alert-success" role="alert">Deine E-Mail-Adresse wurde erfolgreich bestätigt.</div>
          <a [routerLink]="authService.isAuthenticated() ? '/' : '/login'" class="btn btn-primary w-100">
            {{ authService.isAuthenticated() ? 'Zur Startseite' : 'Zur Anmeldung' }}
          </a>
        }
        @case ('error') {
          <div class="alert alert-danger" role="alert">{{ error() }}</div>
          <a routerLink="/login" class="btn btn-outline-secondary w-100">Zur Anmeldung</a>
        }
      }
    </app-auth-card>
  `,
})
export class VerifyEmailComponent implements OnInit {
  private accountApi = inject(AccountApiService);
  private route = inject(ActivatedRoute);
  protected authService = inject(AuthService);

  protected state = signal<'loading' | 'success' | 'error'>('loading');
  protected error = signal('');

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    if (!token) {
      this.state.set('error');
      this.error.set('Kein gültiger Bestätigungs-Link.');
      return;
    }

    this.accountApi.verifyEmail(token).subscribe({
      next: () => {
        this.state.set('success');
        if (this.authService.isAuthenticated()) {
          this.authService.updateCurrentUserLocally({ emailVerified: true });
        }
      },
      error: (err: Error) => {
        this.state.set('error');
        this.error.set(err.message || 'Der Bestätigungs-Link ist ungültig oder abgelaufen.');
      },
    });
  }
}
