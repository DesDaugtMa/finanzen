import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { AuthCardComponent } from '../../../../shared/components/auth-card/auth-card.component';
import { AccountApiService } from '../../../../core/services/account-api.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, AuthCardComponent],
  template: `
    <app-auth-card title="Neues Passwort" subtitle="Vergib ein neues Passwort für dein Konto">
      @if (!token()) {
        <div class="alert alert-danger" role="alert">Kein gültiger Reset-Link.</div>
        <a routerLink="/forgot-password" class="btn btn-outline-secondary w-100">Neuen Link anfordern</a>
      } @else {
        <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
          <div class="mb-3">
            <label for="password" class="form-label">Neues Passwort</label>
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

          <button type="submit" class="btn btn-primary btn-lg w-100" [disabled]="form.invalid || loading()">
            @if (loading()) {
              <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Wird gespeichert…
            } @else {
              Passwort zurücksetzen
            }
          </button>
        </form>
      }
    </app-auth-card>
  `,
})
export class ResetPasswordComponent implements OnInit {
  private fb = inject(FormBuilder);
  private accountApi = inject(AccountApiService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected loading = signal(false);
  protected token = signal('');

  protected form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordMatchValidator },
  );

  ngOnInit(): void {
    this.token.set(this.route.snapshot.paramMap.get('token') ?? '');
  }

  protected isInvalid(control: string): boolean {
    const c = this.form.get(control);
    return !!c && c.invalid && c.touched;
  }

  protected confirmMismatch(): boolean {
    const c = this.form.get('confirmPassword');
    return !!c && c.touched && this.form.hasError('passwordMismatch');
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.accountApi.resetPassword(this.token(), this.form.getRawValue().password).subscribe({
      next: () => {
        this.loading.set(false);
        this.toastService.success('Passwort zurückgesetzt. Bitte melde dich neu an.');
        this.router.navigate(['/login']);
      },
      error: (error: Error) => {
        this.loading.set(false);
        this.toastService.error(error.message || 'Zurücksetzen fehlgeschlagen.');
      },
    });
  }
}

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirm = control.get('confirmPassword')?.value;
  return password && confirm && password !== confirm ? { passwordMismatch: true } : null;
}
