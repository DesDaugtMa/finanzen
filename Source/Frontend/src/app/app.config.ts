import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import {
  SOCIAL_AUTH_CONFIG,
  GoogleLoginProvider,
  SocialAuthServiceConfig,
} from '@abacritt/angularx-social-login';

import { routes } from './app.routes';
import { AppConfig } from './core/models/app-config.model';
import { APP_CONFIG } from './core/tokens/app-config.token';
import { AppConfigService } from './core/services/app-config.service';
import { GoogleAuthStateService } from './core/services/google-auth-state.service';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';

export function createAppConfig(config: AppConfig): ApplicationConfig {
  return {
    providers: [
      provideBrowserGlobalErrorListeners(),
      provideRouter(
        routes,
        // Beim Navigieren an den Seitenanfang springen, beim Zurück-Navigieren
        // die vorherige Scroll-Position wiederherstellen — ohne das landet man
        // auf einer neuen Seite mitten im Inhalt.
        withInMemoryScrolling({
          scrollPositionRestoration: 'enabled',
          anchorScrolling: 'enabled',
        }),
      ),
      provideHttpClient(withInterceptors([authInterceptor, errorInterceptor])),
      provideServiceWorker('ngsw-worker.js', {
        enabled: !isDevMode(),
        // Erst registrieren, wenn die App zur Ruhe gekommen ist: der Service
        // Worker konkurriert sonst mit dem initialen Laden um Bandbreite.
        registrationStrategy: 'registerWhenStable:30000',
      }),
      { provide: APP_CONFIG, useValue: config },
      {
        provide: SOCIAL_AUTH_CONFIG,
        useFactory: (
          configService: AppConfigService,
          googleAuthState: GoogleAuthStateService,
        ): SocialAuthServiceConfig => ({
          autoLogin: false,
          providers: [
            {
              id: GoogleLoginProvider.PROVIDER_ID,
              provider: new GoogleLoginProvider(configService.googleClientId, {
                oneTapEnabled: false,
                prompt: 'select_account',
              }),
            },
          ],
          onError: (err) => {
            googleAuthState.markUnavailable();
            console.warn('[SocialAuth] Google-Login nicht verfügbar:', err);
          },
        }),
        deps: [AppConfigService, GoogleAuthStateService],
      },
    ],
  };
}
