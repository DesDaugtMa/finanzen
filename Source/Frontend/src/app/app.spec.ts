import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { provideServiceWorker } from '@angular/service-worker';
import { of } from 'rxjs';
import { App } from './app';
import { APP_CONFIG } from './core/tokens/app-config.token';
import { AuthService } from './core/services/auth.service';
import { AppConfig } from './core/models/app-config.model';

const testConfig: AppConfig = {
  api: { baseUrl: 'http://localhost/', googleClientId: 'test-client-id' },
};

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: testConfig },
        // Stellt `SwUpdate` bereit, ohne einen Service Worker zu registrieren.
        provideServiceWorker('ngsw-worker.js', { enabled: false }),
        // Das echte Google-SDK würde im Test das Netz kontaktieren.
        {
          provide: SocialAuthService,
          useValue: { authState: of(null), signOut: () => Promise.resolve() },
        },
      ],
    }).compileComponents();
  });

  it('erzeugt die Anwendung', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('zeigt ohne Anmeldung keine Navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-navbar')).toBeNull();
    expect(element.querySelector('main#hauptinhalt')).not.toBeNull();
  });

  it('zeigt nach Anmeldung Navigation und Sprungmarke', async () => {
    TestBed.inject(AuthService).handleAuthSuccess({
      token: 'token',
      refreshToken: 'refresh-token',
      email: 'test@example.com',
      role: 'User',
      emailVerified: true,
    });

    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-navbar')).not.toBeNull();
    expect(element.querySelector('.fin-skip-link')).not.toBeNull();
  });
});
