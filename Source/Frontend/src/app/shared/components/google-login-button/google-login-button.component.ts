import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { GoogleSigninButtonModule } from '@abacritt/angularx-social-login';
import { GoogleAuthStateService } from '../../../core/services/google-auth-state.service';

@Component({
  selector: 'app-google-login-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GoogleSigninButtonModule],
  template: `
    @if (isAvailable()) {
      <div class="d-flex justify-content-center">
        <asl-google-signin-button type="standard" size="large" text="continue_with" shape="pill" />
      </div>
    }
  `,
})
export class GoogleLoginButtonComponent {
  protected isAvailable = inject(GoogleAuthStateService).isAvailable;
}
