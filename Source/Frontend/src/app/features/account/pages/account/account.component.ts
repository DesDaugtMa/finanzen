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
import { PasswordFieldComponent } from '../../../../shared/components/password-field/password-field.component';
import { ThemeSwitchComponent } from '../../../../shared/components/theme-switch/theme-switch.component';

@Component({
  selector: 'app-account',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, PasswordFieldComponent, ThemeSwitchComponent],
  template: `
    <div class="container account-page">
      <header class="fin-page-header">
        <div class="fin-page-header__text">
          <span class="fin-eyebrow">Einstellungen</span>
          <h1 class="fin-page-header__title">Profil</h1>
          <p class="fin-page-header__subtitle">Zugangsdaten, Erscheinungsbild und Geräte.</p>
        </div>
      </header>

      <section class="fin-panel account-section" aria-labelledby="accountInfoHeading">
        <div class="fin-panel__body">
          <h2 id="accountInfoHeading" class="account-heading">Konto</h2>
          <dl class="fin-kv">
            <div>
              <dt class="fin-kv__label">E-Mail-Adresse</dt>
              <dd class="account-email">
                <span class="fin-kv__value fin-break-all">{{ user()?.email }}</span>
                @if (user()?.emailVerified) {
                  <span class="fin-chip fin-chip--income">
                    <i class="bi bi-check-circle-fill" aria-hidden="true"></i>
                    Bestätigt
                  </span>
                } @else {
                  <span class="fin-chip fin-chip--warn">
                    <i class="bi bi-exclamation-circle-fill" aria-hidden="true"></i>
                    Nicht bestätigt
                  </span>
                }
              </dd>
            </div>
          </dl>
        </div>
      </section>

      <section class="fin-panel account-section" aria-labelledby="appearanceHeading">
        <div class="fin-panel__body account-row">
          <div class="account-row__text">
            <h2 id="appearanceHeading" class="account-heading account-heading--tight">
              Erscheinungsbild
            </h2>
            <p class="account-note">
              „System“ folgt der Einstellung deines Geräts und wechselt automatisch.
            </p>
          </div>
          <app-theme-switch />
        </div>
      </section>

      <section class="fin-panel account-section" aria-labelledby="passwordHeading">
        <div class="fin-panel__body">
          <h2 id="passwordHeading" class="account-heading">Passwort ändern</h2>

          <form class="fin-form" [formGroup]="passwordForm" (ngSubmit)="onSubmit()" novalidate>
            <app-password-field
              [control]="passwordForm.controls.currentPassword"
              label="Aktuelles Passwort"
              autocomplete="current-password"
              error="Bitte gib dein aktuelles Passwort ein."
              [invalid]="isInvalid('currentPassword')"
            />

            <app-password-field
              [control]="passwordForm.controls.newPassword"
              label="Neues Passwort"
              autocomplete="new-password"
              hint="Mindestens 6 Zeichen."
              error="Das Passwort muss mindestens 6 Zeichen lang sein."
              [invalid]="isInvalid('newPassword')"
            />

            <app-password-field
              [control]="passwordForm.controls.confirmPassword"
              label="Neues Passwort bestätigen"
              autocomplete="new-password"
              error="Die Passwörter stimmen nicht überein."
              [invalid]="confirmMismatch()"
            />

            <div class="account-submit">
              <button type="submit" class="btn btn-primary" [disabled]="loading()">
                @if (loading()) {
                  <span
                    class="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Wird gespeichert…
                } @else {
                  Passwort ändern
                }
              </button>
            </div>
          </form>
        </div>
      </section>

      <section class="fin-panel" aria-labelledby="sessionsHeading">
        <div class="fin-panel__body account-row">
          <div class="account-row__text">
            <h2 id="sessionsHeading" class="account-heading account-heading--tight">
              Aktive Sitzungen
            </h2>
            <p class="account-note">Verwalte die Geräte, auf denen du angemeldet bist.</p>
          </div>
          <a routerLink="/konto/sitzungen" class="btn btn-outline-secondary">
            <i class="bi bi-shield-lock" aria-hidden="true"></i>
            <span>Verwalten</span>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .account-page {
        max-width: 44rem;
      }
      .account-section {
        margin-bottom: var(--fin-space-4);
      }
      .account-heading {
        margin: 0 0 var(--fin-space-4);
        font-size: var(--fin-text-md);
      }
      .account-heading--tight {
        margin-bottom: var(--fin-space-1);
      }
      .account-note {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      /* Beschreibung links, Bedienelement rechts — auf schmalen Displays
         untereinander, damit das Element nicht gequetscht wird. */
      .account-row {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-4);
      }
      .account-row__text {
        flex: 1 1 14rem;
        min-width: 0;
      }
      .account-email {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-2);
        margin: 0.15rem 0 0;
      }
      .account-submit {
        margin-top: var(--fin-space-2);
      }
    `,
  ],
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
