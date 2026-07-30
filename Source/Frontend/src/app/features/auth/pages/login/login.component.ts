import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { GoogleLoginButtonComponent } from '../../../../shared/components/google-login-button/google-login-button.component';
import { PasswordFieldComponent } from '../../../../shared/components/password-field/password-field.component';
import { TextFieldComponent } from '../../../../shared/components/text-field/text-field.component';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { GoogleAuthStateService } from '../../../../core/services/google-auth-state.service';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    AuthCardComponent,
    GoogleLoginButtonComponent,
    TextFieldComponent,
    PasswordFieldComponent,
  ],
  template: `
    <app-auth-card title="Anmelden" subtitle="Willkommen zurück bei deiner Finanzen-App">
      <form class="fin-form" [formGroup]="loginForm" (ngSubmit)="onSubmit()" novalidate>
        <app-text-field
          [control]="loginForm.controls.email"
          label="E-Mail-Adresse"
          type="email"
          size="lg"
          autocomplete="email"
          inputMode="email"
          placeholder="name@beispiel.de"
          error="Bitte gib eine gültige E-Mail-Adresse ein."
          [invalid]="isInvalid('email')"
        />

        <div>
          <app-password-field
            [control]="loginForm.controls.password"
            label="Passwort"
            autocomplete="current-password"
            error="Bitte gib dein Passwort ein."
            [invalid]="isInvalid('password')"
          />
          <p class="login-forgot">
            <a routerLink="/forgot-password">Passwort vergessen?</a>
          </p>
        </div>

        <div class="fin-form-actions">
          <button type="submit" class="btn btn-primary btn-lg" [disabled]="loading()">
            @if (loading()) {
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              Wird angemeldet…
            } @else {
              Anmelden
            }
          </button>
        </div>

        @if (isGoogleAvailable()) {
          <div>
            <p class="fin-divider-labelled">oder</p>
            <app-google-login-button />
          </div>
        }
      </form>
    </app-auth-card>
  `,
  styles: [
    `
      .login-forgot {
        margin: var(--fin-space-2) 0 0;
        font-size: var(--fin-text-sm);
        text-align: right;
      }
      .login-forgot a {
        color: var(--fin-text-muted);
        font-weight: 550;
        text-decoration: none;
      }
      .login-forgot a:hover {
        color: var(--fin-accent);
        text-decoration: underline;
      }
    `,
  ],
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
        this.toastService.error(
          error.message || 'Login fehlgeschlagen. Bitte überprüfe deine Daten.',
        );
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
