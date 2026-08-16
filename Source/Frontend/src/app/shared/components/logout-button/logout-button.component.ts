import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

/**
 * Abmelden samt Rückfrage.
 *
 * Als eigene Komponente, weil die Aktion an zwei Stellen auftaucht — als Eintrag
 * ganz unten in der Seitenleiste und als Schaltfläche auf der Profilseite (der
 * einzige Weg auf schmalen Displays). Beide sollen sich exakt gleich verhalten,
 * inklusive derselben Rückfrage; doppelter Code würde genau das verlieren.
 */
@Component({
  selector: 'app-logout-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent],
  template: `
    @if (variant() === 'nav') {
      <button
        type="button"
        class="fin-sidebar__link fin-sidebar__link--danger"
        (click)="confirming.set(true)"
      >
        <i class="bi bi-box-arrow-right fin-sidebar__icon" aria-hidden="true"></i>
        <span class="fin-sidebar__label">Abmelden</span>
      </button>
    } @else {
      <button type="button" class="btn btn-outline-danger" (click)="confirming.set(true)">
        <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
        <span>Abmelden</span>
      </button>
    }

    @if (confirming()) {
      <app-confirm-dialog
        title="Abmelden?"
        message="Du wirst auf diesem Gerät abgemeldet und musst dich beim nächsten Mal neu anmelden."
        confirmLabel="Abmelden"
        variant="danger"
        (confirmed)="logout()"
        (cancelled)="confirming.set(false)"
      />
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class LogoutButtonComponent {
  /** `nav` fügt sich in die Seitenleiste ein, `button` ist eine eigenständige Schaltfläche. */
  readonly variant = input<'nav' | 'button'>('button');

  private readonly authService = inject(AuthService);

  protected readonly confirming = signal(false);

  protected logout(): void {
    this.confirming.set(false);
    this.authService.logout();
  }
}
