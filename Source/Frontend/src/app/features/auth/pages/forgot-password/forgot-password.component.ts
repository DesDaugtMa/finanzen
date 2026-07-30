import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { TextFieldComponent } from '../../../../shared/components/text-field/text-field.component';
import { AccountApiService } from '../../../../core/services/account-api.service';

@Component({
  selector: 'app-forgot-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent, TextFieldComponent],
  template: `
    <app-auth-card title="Passwort vergessen" subtitle="Wir senden dir einen Link zum Zurücksetzen">
      @if (submitted()) {
        <div class="alert alert-success" role="alert">
          Falls ein Konto zu dieser E-Mail existiert, haben wir dir einen Link zum Zurücksetzen
          gesendet.
        </div>
        <a routerLink="/login" class="btn btn-outline-secondary w-100 mt-3">
          Zurück zur Anmeldung
        </a>
      } @else {
        <form class="fin-form" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <app-text-field
            [control]="form.controls.email"
            label="E-Mail-Adresse"
            type="email"
            size="lg"
            autocomplete="email"
            inputMode="email"
            placeholder="name@beispiel.de"
            error="Bitte gib eine gültige E-Mail-Adresse ein."
            [invalid]="isInvalid()"
          />

          <div class="fin-form-actions">
            <button type="submit" class="btn btn-primary btn-lg" [disabled]="loading()">
              @if (loading()) {
                <span
                  class="spinner-border spinner-border-sm"
                  role="status"
                  aria-hidden="true"
                ></span>
                Wird gesendet…
              } @else {
                Link anfordern
              }
            </button>
          </div>

          <p class="back-link"><a routerLink="/login">Zurück zur Anmeldung</a></p>
        </form>
      }
    </app-auth-card>
  `,
  styles: [
    `
      .back-link {
        margin: 0;
        font-size: var(--fin-text-sm);
        text-align: center;
      }
    `,
  ],
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
