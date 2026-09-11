import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  LinkCandidateQuery,
  LinkedTransaction,
  Transaction,
  SettleResult,
  TransactionPayload,
} from '../models/transaction.model';

/** Buchungen eines Kontos samt ihrer Verknüpfung mit einer Buchung eines anderen Kontos. */
@Injectable({ providedIn: 'root' })
export class TransactionApiService {
  private readonly api = inject(ApiService);

  private resource(accountId: number): string {
    return `bankaccounts/${accountId}/transactions`;
  }

  /** Alle Buchungen eines Monats. Filterung und Sortierung laufen im Frontend. */
  list(accountId: number, month: string): Observable<Transaction[]> {
    return this.api.get<Transaction[]>(this.resource(accountId), { params: { month } });
  }

  create(accountId: number, payload: TransactionPayload): Observable<Transaction> {
    return this.api.post<Transaction>(this.resource(accountId), payload);
  }

  update(
    accountId: number,
    transactionId: number,
    payload: TransactionPayload,
  ): Observable<Transaction> {
    return this.api.put<Transaction>(`${this.resource(accountId)}/${transactionId}`, payload);
  }

  /**
   * Löscht die Buchung endgültig. Eine verknüpfte Gegenbuchung bleibt bestehen und
   * verliert nur ihre Verknüpfung.
   */
  delete(accountId: number, transactionId: number): Observable<void> {
    return this.api.delete<void>(`${this.resource(accountId)}/${transactionId}`);
  }

  /** Markiert eine noch nicht abgebuchte Buchung als abgebucht. */
  settle(accountId: number, transactionId: number): Observable<Transaction> {
    return this.api.post<Transaction>(`${this.resource(accountId)}/${transactionId}/settle`, null);
  }

  /** Markiert alle noch offenen Buchungen eines Abrechnungsmonats als abgebucht. */
  settleMonth(accountId: number, month: string): Observable<SettleResult> {
    return this.api.post<SettleResult>(`${this.resource(accountId)}/settle`, null, {
      params: { month },
    });
  }

  /** Die verknüpfte Buchung des anderen Kontos mit allen Details für das Popup. */
  getLink(accountId: number, transactionId: number): Observable<LinkedTransaction> {
    return this.api.get<LinkedTransaction>(`${this.resource(accountId)}/${transactionId}/link`);
  }

  /** Buchungen eines anderen Kontos, die als Gegenstück in Frage kommen. */
  linkCandidates(accountId: number, query: LinkCandidateQuery): Observable<LinkedTransaction[]> {
    const params: Record<string, string | number> = {
      counterAccountId: query.counterAccountId,
      type: query.type,
      amount: query.amount,
    };

    const search = query.search.trim();
    if (search) params['search'] = search;
    if (query.excludeTransactionId !== null)
      params['excludeTransactionId'] = query.excludeTransactionId;

    return this.api.get<LinkedTransaction[]>(`${this.resource(accountId)}/link-candidates`, {
      params,
    });
  }

  /** Verknüpft die Buchung 1-zu-1 mit einer Buchung eines anderen Kontos. */
  link(
    accountId: number,
    transactionId: number,
    counterTransactionId: number,
  ): Observable<LinkedTransaction> {
    return this.api.post<LinkedTransaction>(`${this.resource(accountId)}/${transactionId}/link`, {
      counterTransactionId,
    });
  }

  /** Löst die Verknüpfung; beide Buchungen bleiben erhalten. */
  unlink(accountId: number, transactionId: number): Observable<void> {
    return this.api.delete<void>(`${this.resource(accountId)}/${transactionId}/link`);
  }
}
