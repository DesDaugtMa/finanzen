import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountApiService } from '../../../../core/services/account-api.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-4" style="max-width: 48rem;">
      <div class="d-flex align-items-center gap-2 mb-4">
        <i class="bi bi-person-circle fs-3 text-primary"></i>
        <h1 class="h4 fw-bold mb-0">Profil &amp; Konto</h1>
      </div>

      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body p-4">
          <h2 class="h6 fw-bold mb-3">Konto-Informationen</h2>
          <dl class="row mb-0">
            <dt class="col-sm-4 text-muted fw-normal">E-Mail-Adresse</dt>
            <dd class="col-sm-8 mb-0 d-flex flex-wrap align-items-center gap-2">
              <span>{{ user()?.email }}</span>
              @if (user()?.emailVerified) {
                <span class="badge text-bg-success">Bestätigt</span>
              } @else {
                <span class="badge text-bg-warning">Nicht bestätigt</span>
              }
            </dd>
          </dl>
        </div>
      </div>

      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body p-4">
          <h2 class="h6 fw-bold mb-3">Passwort ändern</h2>
          <form [formGroup]="passwordForm" (ngSubmit)="onSubmit()" novalidate>
            <div class="mb-3">
              <label for="currentPassword" class="form-label">Aktuelles Passwort</label>
              <input
                type="password"
                id="currentPassword"
                formControlName="currentPassword"
                class="form-control"
                autocomplete="current-password"
                [class.is-invalid]="isInvalid('currentPassword')"
                aria-describedby="currentPasswordError"
              />
              <div id="currentPasswordError" class="invalid-feedback">Bitte gib dein aktuelles Passwort ein.</div>
            </div>

            <div class="mb-3">
              <label for="newPassword" class="form-label">Neues Passwort</label>
              <input
                type="password"
                id="newPassword"
                formControlName="newPassword"
                class="form-control"
                autocomplete="new-password"
                [class.is-invalid]="isInvalid('newPassword')"
                aria-describedby="newPasswordError"
              />
              <div id="newPasswordError" class="invalid-feedback">Mindestens 6 Zeichen.</div>
            </div>

            <div class="mb-4">
              <label for="confirmPassword" class="form-label">Neues Passwort bestätigen</label>
              <input
                type="password"
                id="confirmPassword"
                formControlName="confirmPassword"
                class="form-control"
                autocomplete="new-password"
                [class.is-invalid]="confirmMismatch()"
                aria-describedby="confirmError"
              />
              <div id="confirmError" class="invalid-feedback">Die Passwörter stimmen nicht überein.</div>
            </div>

            <button type="submit" class="btn btn-primary" [disabled]="passwordForm.invalid || loading()">
              @if (loading()) {
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Wird gespeichert…
              } @else {
                Passwort ändern
              }
            </button>
          </form>
        </div>
      </div>

      <div class="card border-0 shadow-sm">
        <div class="card-body p-4 d-flex flex-wrap align-items-center gap-2">
          <div class="me-auto">
            <h2 class="h6 fw-bold mb-1">Aktive Sitzungen</h2>
            <p class="text-muted small mb-0">Verwalte die Geräte, auf denen du angemeldet bist.</p>
          </div>
          <a routerLink="/konto/sitzungen" class="btn btn-outline-primary">
            <i class="bi bi-shield-lock me-1"></i> Sitzungen verwalten
          </a>
        </div>
      </div>
    </div>
  `,
})
export class AccountComponent {
  private fb = inject(FormBuilder);
  private accountApi = inject(AccountApiService);
  private toastService = inject(ToastService);
  protected authService = inject(AuthService);

  protected user = this.authService.currentUser;
  protected loading = signal(false);

  protected passwordForm = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  protected isInvalid(control: string): boolean {
    const c = this.passwordForm.get(control);
    return !!c && c.invalid && c.touched;
  }

  protected confirmMismatch(): boolean {
    const c = this.passwordForm.get('confirmPassword');
    return !!c && c.touched && this.passwordForm.hasError('passwordMismatch');
  }

  protected onSubmit(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();

    this.accountApi.changePassword(currentPassword, newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.passwordForm.reset();
        this.toastService.success('Passwort wurde erfolgreich geändert.');
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message || 'Passwort konnte nicht geändert werden.');
      },
    });
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('newPassword')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}
