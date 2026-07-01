import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

export interface ApiOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  params?: HttpParams | Record<string, string | number | boolean>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private configService = inject(AppConfigService);

  private get baseUrl(): string {
    let url = this.configService.apiBaseUrl;
    if (!url.endsWith('/')) {
      url += '/';
    }
    return `${url}api/`;
  }

  get<T>(path: string, options?: ApiOptions): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, options).pipe(catchError(this.handleError));
  }

  post<T>(path: string, body: unknown, options?: ApiOptions): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, options).pipe(catchError(this.handleError));
  }

  put<T>(path: string, body: unknown, options?: ApiOptions): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body, options).pipe(catchError(this.handleError));
  }

  delete<T>(path: string, options?: ApiOptions): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`, options).pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ein unbekannter Fehler ist aufgetreten.';

    if (error.error instanceof ErrorEvent) {
      message = `Fehler: ${error.error.message}`;
    } else if (error.status === 0) {
      message = 'Keine Verbindung zum Server. Bitte überprüfe deine Internetverbindung.';
    } else if (error.error && typeof error.error === 'object' && 'message' in error.error) {
      message = (error.error as { message: string }).message;
    } else if (error.status === 403) {
      message = 'Du hast keine Berechtigung für diese Aktion.';
    } else {
      message = `Serverfehler ${error.status}.`;
    }

    return throwError(() => new Error(message));
  }
}
