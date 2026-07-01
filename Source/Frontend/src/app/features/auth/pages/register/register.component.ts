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
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { GoogleAuthStateService } from '../../../../core/services/google-auth-state.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, GoogleLoginButtonComponent],
  template: `
    <app-auth-card title="Registrieren" subtitle="Erstelle dein Finanzen-Konto">
      @switch (tokenState()) {
        @case ('loading') {
          <div class="text-center py-4">
            <span class="spinner-border text-primary" role="status" aria-hidden="true"></span>
            <p class="text-muted small mt-3 mb-0">Einladungslink wird geprüft…</p>
          </div>
        }
        @case ('invalid') {
          <div class="alert alert-danger" role="alert">{{ tokenError() }}</div>
          <a routerLink="/login" class="btn btn-outline-secondary w-100">Zur Anmeldung</a>
        }
        @case ('valid') {
          <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" novalidate>
            <div class="mb-3">
              <label for="displayName" class="form-label">Anzeigename</label>
              <input
                type="text"
                id="displayName"
                formControlName="displayName"
                class="form-control form-control-lg"
                autocomplete="nickname"
                [class.is-invalid]="isInvalid('displayName')"
                aria-describedby="displayNameError"
              />
              <div id="displayNameError" class="invalid-feedback">Mindestens 3 Zeichen.</div>
            </div>

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

            <div class="mb-3">
              <label for="password" class="form-label">Passwort</label>
              <input
                type="password"
                id="password"
                formControlName="password"
                class="form-control form-control-lg"
                autocomplete="new-password"
                placeholder="••••••••"
                [class.is-invalid]="isInvalid('password')"
                aria-describedby="passwordError"
              />
              <div id="passwordError" class="invalid-feedback">Mindestens 6 Zeichen.</div>
            </div>

            <div class="mb-4">
              <label for="confirmPassword" class="form-label">Passwort bestätigen</label>
              <input
                type="password"
                id="confirmPassword"
                formControlName="confirmPassword"
                class="form-control form-control-lg"
                autocomplete="new-password"
                placeholder="••••••••"
                [class.is-invalid]="confirmMismatch()"
                aria-describedby="confirmError"
              />
              <div id="confirmError" class="invalid-feedback">Die Passwörter stimmen nicht überein.</div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg w-100" [disabled]="registerForm.invalid || loading()">
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Konto wird erstellt…
              } @else {
                Konto erstellen
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

            <p class="text-center text-muted small mt-4 mb-0">
              Bereits registriert? <a routerLink="/login" class="text-decoration-none">Anmelden</a>
            </p>
          </form>
        }
      }
    </app-auth-card>
  `,
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
      displayName: ['', [Validators.required, Validators.minLength(3)]],
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
        this.tokenError.set(err.message || 'Der Einladungslink ist ungültig oder wurde bereits verwendet.');
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
    const { displayName, email, password } = this.registerForm.getRawValue();

    this.authService.register({ displayName, email, password, registrationToken: this.token }).subscribe({
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
