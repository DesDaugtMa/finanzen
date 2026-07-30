import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { ToastContainerComponent } from './shared/components/toast-container/toast-container.component';
import { UpdateNoticeComponent } from './shared/components/update-notice/update-notice.component';

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, NavbarComponent, ToastContainerComponent, UpdateNoticeComponent],
  templateUrl: './app.html',
})
export class App {
  protected authService = inject(AuthService);

  // Injiziert, damit der Theme-Service ab dem Start läuft: er hält
  // `data-bs-theme` am <html>-Element und die Farbe der Browserleiste aktuell.
  private readonly themeService = inject(ThemeService);
}
