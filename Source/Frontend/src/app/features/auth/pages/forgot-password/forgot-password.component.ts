import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { AccountApiService } from '../../../../core/services/account-api.service';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card title="Passwort vergessen" subtitle="Wir senden dir einen Link zum Zurücksetzen">
      @if (submitted()) {
        <div class="alert alert-success" role="alert">
          Falls ein Konto zu dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen gesendet.
        </div>
        <a routerLink="/login" class="btn btn-outline-secondary w-100">Zurück zur Anmeldung</a>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="mb-4">
            <label for="email" class="form-label">E-Mail-Adresse</label>
            <input
              type="email"
              id="email"
              formControlName="email"
              class="form-control form-control-lg"
              autocomplete="email"
              placeholder="name@beispiel.de"
              [class.is-invalid]="isInvalid()"
              aria-describedby="emailError"
            />
            <div id="emailError" class="invalid-feedback">Bitte gib eine gültige E-Mail-Adresse ein.</div>
          </div>

          <button type="submit" class="btn btn-primary btn-lg w-100" [disabled]="form.invalid || loading()">
            @if (loading()) {
              <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Wird gesendet…
            } @else {
              Link anfordern
            }
          </button>

          <p class="text-center text-muted small mt-4 mb-0">
            <a routerLink="/login" class="text-decoration-none">Zurück zur Anmeldung</a>
          </p>
        </form>
      }
    </app-auth-card>
  `,
})
export class ForgotPasswordComponent {
  private fb = inject(FormBuilder);
  private accountApi = inject(AccountApiService);

  protected loading = signal(false);
  protected submitted = signal(false);

  protected form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected isInvalid(): boolean {
    const c = this.form.get('email');
    return !!c && c.invalid && c.touched;
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.accountApi.forgotPassword(this.form.getRawValue().email).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
      // Auch bei Fehler dieselbe neutrale Bestätigung (kein Enumeration-Leak).
      error: () => {
        this.loading.set(false);
        this.submitted.set(true);
      },
    });
  }
}
