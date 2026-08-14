import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Debt, DebtOverview, DebtPayload, DebtTransaction } from '../models/debt.model';

/**
 * Schuldeinträge des angemeldeten Nutzers. Anders als die übrigen Finanz-Ressourcen
 * hängen sie nicht an einem Konto: Verleih und Rückzahlung laufen häufig über
 * verschiedene Geldkonten.
 */
@Injectable({ providedIn: 'root' })
export class DebtApiService {
  private readonly api = inject(ApiService);

  private readonly resource = 'debts';

  /** Alle Einträge, gruppiert nach Person, samt Summen. */
  getOverview(): Observable<DebtOverview> {
    return this.api.get<DebtOverview>(this.resource);
  }

  create(payload: DebtPayload): Observable<Debt> {
    return this.api.post<Debt>(this.resource, payload);
  }

  update(debtId: number, payload: DebtPayload): Observable<Debt> {
    return this.api.put<Debt>(`${this.resource}/${debtId}`, payload);
  }

  /** Zugeordnete Buchungen bleiben erhalten und verlieren nur die Zuordnung. */
  delete(debtId: number): Observable<void> {
    return this.api.delete<void>(`${this.resource}/${debtId}`);
  }

  /** Buchungen aller Geldkonten, die noch keinem Eintrag zugeordnet sind. */
  getAssignableTransactions(
    debtId: number,
    search: string,
    accountId: number | null,
  ): Observable<DebtTransaction[]> {
    const params: Record<string, string | number> = {};
    if (search) params['search'] = search;
    if (accountId !== null) params['accountId'] = accountId;

    return this.api.get<DebtTransaction[]>(`${this.resource}/${debtId}/assignable-transactions`, {
      params,
    });
  }

  linkTransaction(debtId: number, transactionId: number): Observable<DebtOverview> {
    return this.api.put<DebtOverview>(
      `${this.resource}/${debtId}/transactions/${transactionId}`,
      {},
    );
  }

  unlinkTransaction(debtId: number, transactionId: number): Observable<DebtOverview> {
    return this.api.delete<DebtOverview>(
      `${this.resource}/${debtId}/transactions/${transactionId}`,
    );
  }
}
