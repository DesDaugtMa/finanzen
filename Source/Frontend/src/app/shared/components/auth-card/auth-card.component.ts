import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-auth-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="auth-wrapper">
      <div class="auth-card fin-panel">
        <div class="auth-head">
          <span class="brand-mark" aria-hidden="true"><i class="bi bi-wallet2"></i></span>
          <h1 class="auth-title">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="auth-subtitle">{{ subtitle() }}</p>
          }
        </div>
        <ng-content />
      </div>
    </div>
  `,
  styles: [
    `
      .auth-wrapper {
        display: flex;
        align-items: center;
        justify-content: center;
        /* dvh statt vh: auf iOS würde vh die Browserleiste mitzählen und die
           Karte teils unter den Bildschirmrand schieben. */
        min-height: 100dvh;
        padding: var(--fin-space-8) var(--fin-space-4);
        padding-top: max(var(--fin-space-8), env(safe-area-inset-top, 0px));
        padding-bottom: max(var(--fin-space-8), env(safe-area-inset-bottom, 0px));
        /* Sehr flacher Markenschein hinter der Karte. Gibt der ansonsten leeren
           Anmeldeseite Tiefe, ohne als Farbverlauf aufzufallen. */
        background:
          radial-gradient(60% 44% at 50% 0%, var(--fin-accent-tint) 0%, transparent 68%),
          var(--fin-bg);
      }
      .auth-card {
        width: 100%;
        max-width: 25rem;
        padding: var(--fin-space-6) var(--fin-space-5);
        border-radius: var(--fin-radius-xl);
        box-shadow: var(--fin-shadow-lg);
      }
      @media (min-width: 34rem) {
        .auth-card {
          padding: var(--fin-space-8);
        }
      }
      .auth-head {
        margin-bottom: var(--fin-space-6);
        text-align: center;
      }
      .brand-mark {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 3rem;
        height: 3rem;
        margin-bottom: var(--fin-space-4);
        border-radius: var(--fin-radius-md);
        background: var(--fin-gradient-brand);
        color: #fff;
        font-size: var(--fin-text-xl);
        box-shadow: var(--fin-shadow-sm);
      }
      .auth-title {
        margin: 0;
        font-size: var(--fin-text-xl);
      }
      .auth-subtitle {
        margin: var(--fin-space-2) auto 0;
        max-width: 30ch;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-base);
      }
    `,
  ],
})
export class AuthCardComponent {
  title = input<string>('');
  subtitle = input<string>('');
}
