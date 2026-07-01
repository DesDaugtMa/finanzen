import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, BehaviorSubject, switchMap, throwError, filter, take } from 'rxjs';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { ApiService } from './api.service';
import { AppConfigService } from './app-config.service';
import {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  GoogleLoginRequest,
  UserInfo,
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';

  private apiService = inject(ApiService);
  private router = inject(Router);
  private socialAuthService = inject(SocialAuthService);
  private httpBackend = inject(HttpBackend);
  private configService = inject(AppConfigService);

  // HttpClient ohne Interceptors – nur für Refresh/Logout (verhindert Endlosschleifen)
  private rawHttp = new HttpClient(this.httpBackend);

  private currentUserSignal = signal<UserInfo | null>(this.loadUserFromStorage());
  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => !!this.currentUserSignal());
  readonly isAdmin = computed(() => this.currentUserSignal()?.role === 'Admin');

  private isRefreshing = false;
  private refreshSubject = new BehaviorSubject<string | null>(null);

  login(request: LoginRequest): Observable<AuthResponse> {
    return this.apiService
      .post<AuthResponse>('auth/login', request)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  register(request: RegisterRequest): Observable<AuthResponse> {
    return this.apiService
      .post<AuthResponse>('auth/register', request)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  loginWithGoogle(request: GoogleLoginRequest): Observable<AuthResponse> {
    return this.apiService
      .post<AuthResponse>('auth/google', request)
      .pipe(tap((response) => this.handleAuthSuccess(response)));
  }

  validateToken(token: string): Observable<{ valid: boolean }> {
    return this.apiService.get<{ valid: boolean }>(`auth/validate-token/${encodeURIComponent(token)}`);
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.rawHttp.post(this.buildApiUrl('auth/logout'), { refreshToken }).subscribe({ error: () => {} });
    }

    this.clearStorage();
    this.socialAuthService.signOut().catch(() => {});
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Silent-Refresh mit dem gespeicherten Refresh-Token. Parallele Aufrufer
   * warten auf denselben laufenden Refresh via refreshSubject.
   */
  refreshAccessToken(): Observable<string> {
    if (this.isRefreshing) {
      return this.refreshSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap(
          (token) =>
            new Observable<string>((observer) => {
              observer.next(token!);
              observer.complete();
            }),
        ),
      );
    }

    const storedRefreshToken = this.getRefreshToken();
    if (!storedRefreshToken) {
      return throwError(() => new Error('Kein Refresh-Token vorhanden.'));
    }

    this.isRefreshing = true;
    this.refreshSubject.next(null);

    return this.rawHttp
      .post<AuthResponse>(this.buildApiUrl('auth/refresh'), { refreshToken: storedRefreshToken })
      .pipe(
        tap((response) => {
          this.handleAuthSuccess(response);
          this.isRefreshing = false;
          this.refreshSubject.next(response.token);
        }),
        switchMap(
          (response) =>
            new Observable<string>((observer) => {
              observer.next(response.token);
              observer.complete();
            }),
        ),
        tap({
          error: () => {
            this.isRefreshing = false;
            this.refreshSubject.next(null);
          },
        }),
      );
  }

  handleAuthSuccess(response: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, response.token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, response.refreshToken);

    const userInfo: UserInfo = {
      displayName: response.displayName,
      email: response.email,
      role: response.role,
      emailVerified: response.emailVerified,
    };

    localStorage.setItem(this.USER_KEY, JSON.stringify(userInfo));
    this.currentUserSignal.set(userInfo);
  }

  updateCurrentUserLocally(patch: Partial<UserInfo>): void {
    const current = this.currentUserSignal();
    if (!current) return;
    const updated = { ...current, ...patch };
    localStorage.setItem(this.USER_KEY, JSON.stringify(updated));
    this.currentUserSignal.set(updated);
  }

  clearStorage(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.currentUserSignal.set(null);
  }

  private buildApiUrl(path: string): string {
    let base = this.configService.apiBaseUrl;
    if (!base.endsWith('/')) base += '/';
    return `${base}api/${path}`;
  }

  private loadUserFromStorage(): UserInfo | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    if (!userJson) return null;
    try {
      return JSON.parse(userJson) as UserInfo;
    } catch {
      return null;
    }
  }
}
