import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-wrapper d-flex align-items-center justify-content-center px-3 py-5">
      <div class="auth-card card border-0 shadow-sm w-100">
        <div class="card-body p-4 p-sm-5">
          <div class="text-center mb-4">
            <div class="brand-badge mx-auto mb-3" aria-hidden="true">
              <i class="bi bi-wallet2"></i>
            </div>
            <h1 class="h4 fw-bold mb-1">{{ title() }}</h1>
            @if (subtitle()) {
              <p class="text-muted small mb-0">{{ subtitle() }}</p>
            }
          </div>
          <ng-content />
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-wrapper {
        min-height: 100vh;
      }
      .auth-card {
        max-width: 26rem;
        border-radius: 1rem;
      }
      .brand-badge {
        width: 3.25rem;
        height: 3.25rem;
        border-radius: 0.9rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background: var(--bs-primary);
        color: #fff;
        font-size: 1.6rem;
      }
    `,
  ],
})
export class AuthCardComponent {
  title = input<string>('');
  subtitle = input<string>('');
}
