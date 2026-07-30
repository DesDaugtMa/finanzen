import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BankAccount, BankAccountPayload } from '../models/bank-account.model';
import { MonthSummary } from '../models/month-summary.model';

@Injectable({ providedIn: 'root' })
export class BankAccountApiService {
  private api = inject(ApiService);

  private readonly resource = 'bankaccounts';

  list(): Observable<BankAccount[]> {
    return this.api.get<BankAccount[]>(this.resource);
  }

  getById(id: number): Observable<BankAccount> {
    return this.api.get<BankAccount>(`${this.resource}/${id}`);
  }

  create(payload: BankAccountPayload): Observable<BankAccount> {
    return this.api.post<BankAccount>(this.resource, payload);
  }

  update(id: number, payload: BankAccountPayload): Observable<BankAccount> {
    return this.api.put<BankAccount>(`${this.resource}/${id}`, payload);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`${this.resource}/${id}`);
  }

  /** Kennzahlen des Kontos für einen Abrechnungsmonat (`yyyy-MM`). */
  getSummary(id: number, month: string): Observable<MonthSummary> {
    return this.api.get<MonthSummary>(`${this.resource}/${id}/summary`, { params: { month } });
  }
}
