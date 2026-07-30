import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
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
  selector: 'app-register',
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
    <app-auth-card title="Registrieren" subtitle="Erstelle dein Finanzen-Konto">
      @switch (tokenState()) {
        @case ('loading') {
          <div class="token-check" role="status">
            <span class="spinner-border" aria-hidden="true"></span>
            <p class="token-check__text">Einladungslink wird geprüft…</p>
          </div>
        }
        @case ('invalid') {
          <div class="alert alert-danger" role="alert">{{ tokenError() }}</div>
          <a routerLink="/login" class="btn btn-outline-secondary w-100 mt-3">Zur Anmeldung</a>
        }
        @case ('valid') {
          <form class="fin-form" [formGroup]="registerForm" (ngSubmit)="onSubmit()" novalidate>
            <app-text-field
              [control]="registerForm.controls.email"
              label="E-Mail-Adresse"
              type="email"
              size="lg"
              autocomplete="email"
              inputMode="email"
              placeholder="name@beispiel.de"
              error="Bitte gib eine gültige E-Mail-Adresse ein."
              [invalid]="isInvalid('email')"
            />

            <app-password-field
              [control]="registerForm.controls.password"
              label="Passwort"
              autocomplete="new-password"
              hint="Mindestens 6 Zeichen."
              error="Das Passwort muss mindestens 6 Zeichen lang sein."
              [invalid]="isInvalid('password')"
            />

            <app-password-field
              [control]="registerForm.controls.confirmPassword"
              label="Passwort bestätigen"
              autocomplete="new-password"
              error="Die Passwörter stimmen nicht überein."
              [invalid]="confirmMismatch()"
            />

            <div class="fin-form-actions">
              <button type="submit" class="btn btn-primary btn-lg" [disabled]="loading()">
                @if (loading()) {
                  <span
                    class="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Konto wird erstellt…
                } @else {
                  Konto erstellen
                }
              </button>
            </div>

            @if (isGoogleAvailable()) {
              <div>
                <p class="fin-divider-labelled">oder</p>
                <app-google-login-button />
              </div>
            }

            <p class="register-switch">Bereits registriert? <a routerLink="/login">Anmelden</a></p>
          </form>
        }
      }
    </app-auth-card>
  `,
  styles: [
    `
      .token-check {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--fin-space-4);
        padding: var(--fin-space-6) 0;
        color: var(--fin-accent);
      }
      .token-check__text {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .register-switch {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        text-align: center;
      }
    `,
  ],
})
export class RegisterComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private socialAuthService = inject(SocialAuthService);

  protected loading = signal(false);
  protected tokenState = signal<'loading' | 'valid' | 'invalid'>('loading');
  protected tokenError = signal('');
  protected isGoogleAvailable = inject(GoogleAuthStateService).isAvailable;
  private token = '';

  protected registerForm = this.fb.nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  constructor() {
    this.socialAuthService.authState.pipe(takeUntilDestroyed()).subscribe((user) => {
      if (user?.idToken) {
        this.onGoogleRegister(user.idToken);
      }
    });
  }

  ngOnInit(): void {
    this.token = this.route.snapshot.paramMap.get('token') ?? '';

    if (!this.token) {
      this.tokenState.set('invalid');
      this.tokenError.set(
        'Kein Einladungslink vorhanden. Bitte nutze den Registrierungslink, den du erhalten hast.',
      );
      return;
    }

    this.authService.validateToken(this.token).subscribe({
      next: () => this.tokenState.set('valid'),
      error: (err: Error) => {
        this.tokenState.set('invalid');
        this.tokenError.set(
          err.message || 'Der Einladungslink ist ungültig oder wurde bereits verwendet.',
        );
      },
    });
  }

  protected isInvalid(control: string): boolean {
    const c = this.registerForm.get(control);
    return !!c && c.invalid && c.touched;
  }

  protected confirmMismatch(): boolean {
    const c = this.registerForm.get('confirmPassword');
    return !!c && c.touched && this.registerForm.hasError('passwordMismatch');
  }

  protected onSubmit(): void {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { email, password } = this.registerForm.getRawValue();

    this.authService.register({ email, password, registrationToken: this.token }).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success('Willkommen! Bitte bestätige deine E-Mail-Adresse.');
        this.router.navigate(['/']);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message || 'Registrierung fehlgeschlagen.');
      },
    });
  }

  private onGoogleRegister(idToken: string): void {
    this.loading.set(true);
    this.authService.loginWithGoogle({ idToken, registrationToken: this.token }).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message || 'Google-Registrierung fehlgeschlagen.');
      },
    });
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}
