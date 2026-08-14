import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { OfflineCacheService, Sourced } from './offline-cache.service';
import { BankAccount, BankAccountPayload } from '../models/bank-account.model';
import { MonthSummary } from '../models/month-summary.model';

@Injectable({ providedIn: 'root' })
export class BankAccountApiService {
  private api = inject(ApiService);
  private cache = inject(OfflineCacheService);

  private readonly resource = 'bankaccounts';

  list(): Observable<BankAccount[]> {
    return this.api.get<BankAccount[]>(this.resource);
  }

  /**
   * Stammdaten eines Kontos. Über den Offline-Zwischenspeicher, damit die
   * Detailseite auch ohne Netz Name, Farbe und Kontostand zeigen kann.
   */
  getById(id: number): Observable<Sourced<BankAccount>> {
    return this.cache.withFallback(
      `account.${id}`,
      this.api.get<BankAccount>(`${this.resource}/${id}`),
    );
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

  /** Kennzahlen des Kontos für einen Abrechnungsmonat (`yyyy-MM`), mit Offline-Rückfall. */
  getSummary(id: number, month: string): Observable<Sourced<MonthSummary>> {
    return this.cache.withFallback(
      `summary.${id}.${month}`,
      this.api.get<MonthSummary>(`${this.resource}/${id}/summary`, { params: { month } }),
    );
  }
}
