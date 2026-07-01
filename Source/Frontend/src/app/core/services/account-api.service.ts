import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

interface MessageResponse {
  message: string;
}

@Injectable({ providedIn: 'root' })
export class AccountApiService {
  private api = inject(ApiService);

  forgotPassword(email: string): Observable<MessageResponse> {
    return this.api.post<MessageResponse>('auth/forgot-password', { email });
  }

  resetPassword(token: string, newPassword: string): Observable<MessageResponse> {
    return this.api.post<MessageResponse>('auth/reset-password', { token, newPassword });
  }

  verifyEmail(token: string): Observable<MessageResponse> {
    return this.api.get<MessageResponse>(`auth/verify-email/${encodeURIComponent(token)}`);
  }

  resendVerification(email: string): Observable<MessageResponse> {
    return this.api.post<MessageResponse>('auth/resend-verification', { email });
  }
}
