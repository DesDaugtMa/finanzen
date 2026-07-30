import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { AuthService } from '../../../../core/services/auth.service';
import { AccountApiService } from '../../../../core/services/account-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { BankAccountsSectionComponent } from '../../../bank-accounts/components/bank-accounts-section/bank-accounts-section.component';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BankAccountsSectionComponent],
  template: `
    <div class="container">
      @let user = authService.currentUser();

      <header class="fin-page-header home-header">
        <div class="fin-page-header__text">
          <span class="fin-eyebrow">{{ greeting() }}</span>
          <h1 class="fin-page-header__title">Übersicht</h1>
          <p class="fin-page-header__subtitle">Alle Konten, Salden und Buchungen an einem Ort.</p>
        </div>
      </header>

      @if (user && !user.emailVerified) {
        <div class="alert alert-warning verify-banner" role="alert">
          <i class="bi bi-envelope-exclamation verify-banner__icon" aria-hidden="true"></i>
          <div class="verify-banner__text">
            <strong>E-Mail-Adresse noch nicht bestätigt</strong>
            <span class="fin-break-all"
              >Wir haben eine Bestätigung an {{ user.email }} gesendet.</span
            >
          </div>
          <button
            type="button"
            class="btn btn-sm btn-warning"
            [disabled]="resending()"
            (click)="resend()"
          >
            @if (resending()) {
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
            }
            Erneut senden
          </button>
        </div>
      }

      <app-bank-accounts-section />
    </div>
  `,
  styles: [
    `
      .home-header {
        margin-bottom: var(--fin-space-6);
      }
      .verify-banner {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-3);
        margin-bottom: var(--fin-space-6);
      }
      .verify-banner__icon {
        flex-shrink: 0;
        font-size: var(--fin-text-lg);
      }
      .verify-banner__text {
        /* Nimmt den verfügbaren Platz, damit die Schaltfläche rechts außen sitzt
           und auf schmalen Displays in die nächste Zeile rutscht. */
        flex: 1 1 14rem;
        display: flex;
        flex-direction: column;
        min-width: 0;
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
    `,
  ],
})
export class HomeComponent {
  protected authService = inject(AuthService);
  private accountApi = inject(AccountApiService);
  private toastService = inject(ToastService);

  protected resending = signal(false);

  /**
   * Tageszeitabhängige Anrede. Wird einmal beim Erzeugen der Seite bestimmt —
   * eine über den Tag mitlaufende Begrüßung wäre Aufwand ohne Nutzen.
   */
  protected readonly greeting = signal(buildGreeting(new Date())).asReadonly();

  protected resend(): void {
    const email = this.authService.currentUser()?.email;
    if (!email) return;

    this.resending.set(true);
    this.accountApi.resendVerification(email).subscribe({
      next: () => {
        this.resending.set(false);
        this.toastService.success('Bestätigungs-E-Mail wurde versendet.');
      },
      error: () => {
        this.resending.set(false);
        this.toastService.success('Bestätigungs-E-Mail wurde versendet.');
      },
    });
  }
}

function buildGreeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 5) return 'Gute Nacht';
  if (hour < 11) return 'Guten Morgen';
  if (hour < 18) return 'Guten Tag';
  return 'Guten Abend';
}
