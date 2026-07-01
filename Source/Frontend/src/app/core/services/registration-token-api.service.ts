import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { RegistrationTokenInfo, CreateRegistrationTokenRequest } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class RegistrationTokenApiService {
  private api = inject(ApiService);

  list(): Observable<RegistrationTokenInfo[]> {
    return this.api.get<RegistrationTokenInfo[]>('registrationtokens');
  }

  create(request: CreateRegistrationTokenRequest): Observable<RegistrationTokenInfo> {
    return this.api.post<RegistrationTokenInfo>('registrationtokens', request);
  }

  deactivate(token: string): Observable<void> {
    return this.api.delete<void>(`registrationtokens/${encodeURIComponent(token)}`);
  }
}
