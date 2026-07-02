import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="navbar navbar-expand-lg bg-white border-bottom sticky-top">
      <div class="container">
        <a class="navbar-brand fw-bold text-primary d-flex align-items-center gap-2" routerLink="/">
          <i class="bi bi-wallet2"></i> Finanzen
        </a>

        <button
          class="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Navigation umschalten"
        >
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" id="mainNav">
          <ul class="navbar-nav me-auto mb-2 mb-lg-0">
            <li class="nav-item">
              <a class="nav-link" routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">
                Start
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link" routerLink="/konto/sitzungen" routerLinkActive="active">Sitzungen</a>
            </li>
            @if (authService.isAdmin()) {
              <li class="nav-item">
                <a class="nav-link" routerLink="/admin/einladungen" routerLinkActive="active">Einladungen</a>
              </li>
            }
          </ul>

          <div class="d-flex align-items-center gap-2">
            <a
              class="nav-link d-flex align-items-center gap-1"
              routerLink="/konto"
              routerLinkActive="active"
            >
              <i class="bi bi-person-circle"></i>
              <span>Profil</span>
            </a>
            <button type="button" class="btn btn-outline-secondary btn-sm" (click)="authService.logout()">
              <i class="bi bi-box-arrow-right me-1"></i> Abmelden
            </button>
          </div>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  protected authService = inject(AuthService);
}
