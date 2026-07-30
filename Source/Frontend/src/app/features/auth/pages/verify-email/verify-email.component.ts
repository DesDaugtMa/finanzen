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
          <div class="verify-pending" role="status">
            <span class="spinner-border" aria-hidden="true"></span>
            <p class="verify-pending__text">E-Mail wird bestätigt…</p>
          </div>
        }
        @case ('success') {
          <div class="verify-result">
            <span class="verify-result__icon verify-result__icon--ok" aria-hidden="true">
              <i class="bi bi-check-lg"></i>
            </span>
            <p class="verify-result__text">Deine E-Mail-Adresse wurde bestätigt.</p>
          </div>
          <a
            [routerLink]="authService.isAuthenticated() ? '/' : '/login'"
            class="btn btn-primary btn-lg w-100"
          >
            {{ authService.isAuthenticated() ? 'Zur Übersicht' : 'Zur Anmeldung' }}
          </a>
        }
        @case ('error') {
          <div class="alert alert-danger" role="alert">{{ error() }}</div>
          <a routerLink="/login" class="btn btn-outline-secondary w-100 mt-3">Zur Anmeldung</a>
        }
      }
    </app-auth-card>
  `,
  styles: [
    `
      .verify-pending {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--fin-space-4);
        padding: var(--fin-space-6) 0;
        color: var(--fin-accent);
      }
      .verify-pending__text {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      /* Erfolg wird als Zustand gezeigt, nicht als Hinweisbalken: ein Alert
         signalisiert „etwas beachten“, hier ist die Sache erledigt. */
      .verify-result {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--fin-space-4);
        margin-bottom: var(--fin-space-6);
        text-align: center;
      }
      .verify-result__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        border-radius: 50%;
        font-size: var(--fin-text-xl);
      }
      .verify-result__icon--ok {
        background-color: var(--fin-success-tint);
        color: var(--fin-success);
      }
      .verify-result__text {
        margin: 0;
        color: var(--fin-text-strong);
        font-weight: 550;
      }
    `,
  ],
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
