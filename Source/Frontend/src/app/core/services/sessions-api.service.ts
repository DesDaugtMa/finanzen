import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { SessionInfo } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class SessionsApiService {
  private api = inject(ApiService);
  private authService = inject(AuthService);

  list(): Observable<SessionInfo[]> {
    const refreshToken = this.authService.getRefreshToken() ?? '';
    return this.api.get<SessionInfo[]>('sessions', {
      headers: { 'X-Refresh-Token': refreshToken },
    });
  }

  revoke(id: string): Observable<void> {
    return this.api.delete<void>(`sessions/${id}`);
  }

  revokeOthers(): Observable<void> {
    const refreshToken = this.authService.getRefreshToken() ?? '';
    return this.api.post<void>('sessions/revoke-others', { refreshToken });
  }
}
