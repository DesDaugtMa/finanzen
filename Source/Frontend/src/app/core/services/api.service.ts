import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppConfigService } from './app-config.service';

export interface ApiOptions {
  headers?: HttpHeaders | Record<string, string | string[]>;
  /** Arrays werden als wiederholter Parameter gesendet (`?ids=1&ids=2`). */
  params?:
    HttpParams | Record<string, string | number | boolean | readonly (string | number | boolean)[]>;
}

/**
 * Ein fehlgeschlagener API-Aufruf. Erweitert `Error`, damit vorhandene Aufrufer
 * unverändert `err.message` anzeigen können, trägt aber zusätzlich, ob der Server
 * überhaupt erreicht wurde — nur dann ist ein Rückgriff auf zwischengespeicherte
 * Daten fachlich vertretbar.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly connectionFailed: boolean,
  ) {
    super(message);
    this.name = 'ApiError';
  }
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
    return this.http
      .post<T>(`${this.baseUrl}${path}`, body, options)
      .pipe(catchError(this.handleError));
  }

  put<T>(path: string, body: unknown, options?: ApiOptions): Observable<T> {
    return this.http
      .put<T>(`${this.baseUrl}${path}`, body, options)
      .pipe(catchError(this.handleError));
  }

  delete<T>(path: string, options?: ApiOptions): Observable<T> {
    return this.http
      .delete<T>(`${this.baseUrl}${path}`, options)
      .pipe(catchError(this.handleError));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    let message = 'Ein unbekannter Fehler ist aufgetreten.';

    // Status 0 heißt: die Anfrage hat den Server nie erreicht — kein Netz, DNS,
    // CORS-Preflight. Genau dieser Fall darf offline auf alte Daten zurückfallen.
    const connectionFailed = error.status === 0;

    if (error.error instanceof ErrorEvent) {
      message = `Fehler: ${error.error.message}`;
    } else if (connectionFailed) {
      message = 'Keine Verbindung zum Server. Bitte überprüfe deine Internetverbindung.';
    } else if (error.error && typeof error.error === 'object' && 'message' in error.error) {
      message = (error.error as { message: string }).message;
    } else if (error.status === 403) {
      message = 'Du hast keine Berechtigung für diese Aktion.';
    } else {
      // Modellvalidierung von [ApiController] liefert ValidationProblemDetails statt unserer ErrorResponse.
      message = extractValidationMessage(error.error) ?? `Serverfehler ${error.status}.`;
    }

    return throwError(() => new ApiError(message, error.status, connectionFailed));
  }
}

/** Zieht die erste Validierungsmeldung aus einem ValidationProblemDetails-Body. */
function extractValidationMessage(body: unknown): string | null {
  if (!body || typeof body !== 'object' || !('errors' in body)) return null;

  const errors = (body as { errors: unknown }).errors;
  if (!errors || typeof errors !== 'object') return null;

  const firstMessage = Object.values(errors as Record<string, unknown>)
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .find((value): value is string => typeof value === 'string' && value.length > 0);

  return firstMessage ?? null;
}
