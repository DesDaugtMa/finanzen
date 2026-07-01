import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { GoogleLoginButtonComponent } from '../../../../shared/components/google-login-button/google-login-button.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { GoogleAuthStateService } from '../../../../core/services/google-auth-state.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, GoogleLoginButtonComponent],
  template: `
    <app-auth-card title="Anmelden" subtitle="Willkommen zurück bei deiner Finanzen-App">
      <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate>
        <div class="mb-3">
          <label for="email" class="form-label">E-Mail-Adresse</label>
          <input
            type="email"
            id="email"
            formControlName="email"
            class="form-control form-control-lg"
            autocomplete="email"
            placeholder="name@beispiel.de"
            [class.is-invalid]="isInvalid('email')"
            aria-describedby="emailError"
          />
          <div id="emailError" class="invalid-feedback">Bitte gib eine gültige E-Mail-Adresse ein.</div>
        </div>

        <div class="mb-2">
          <label for="password" class="form-label">Passwort</label>
          <input
            type="password"
            id="password"
            formControlName="password"
            class="form-control form-control-lg"
            autocomplete="current-password"
            placeholder="••••••••"
            [class.is-invalid]="isInvalid('password')"
            aria-describedby="passwordError"
          />
          <div id="passwordError" class="invalid-feedback">Bitte gib dein Passwort ein.</div>
        </div>

        <div class="mb-4 text-end">
          <a routerLink="/forgot-password" class="small link-secondary text-decoration-none">Passwort vergessen?</a>
        </div>

        <button type="submit" class="btn btn-primary btn-lg w-100" [disabled]="loginForm.invalid || loading()">
          @if (loading()) {
            <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
            Wird angemeldet…
          } @else {
            Anmelden
          }
        </button>

        @if (isGoogleAvailable()) {
          <div class="my-4 d-flex align-items-center">
            <hr class="flex-grow-1" />
            <span class="px-3 text-muted small fw-semibold">ODER</span>
            <hr class="flex-grow-1" />
          </div>
          <app-google-login-button />
        }
      </form>
    </app-auth-card>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private socialAuthService = inject(SocialAuthService);

  protected loading = signal(false);
  protected isGoogleAvailable = inject(GoogleAuthStateService).isAvailable;
  private returnUrl = '/';

  protected loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  constructor() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';

    this.socialAuthService.authState.pipe(takeUntilDestroyed()).subscribe((user) => {
      if (user?.idToken) {
        this.onGoogleLogin(user.idToken);
      }
    });
  }

  protected isInvalid(control: string): boolean {
    const c = this.loginForm.get(control);
    return !!c && c.invalid && c.touched;
  }

  protected onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.authService.login(this.loginForm.getRawValue()).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message || 'Login fehlgeschlagen. Bitte überprüfe deine Daten.');
      },
    });
  }

  private onGoogleLogin(idToken: string): void {
    this.loading.set(true);
    this.authService.loginWithGoogle({ idToken }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(this.returnUrl);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message || 'Google-Login fehlgeschlagen.');
      },
    });
  }
}
