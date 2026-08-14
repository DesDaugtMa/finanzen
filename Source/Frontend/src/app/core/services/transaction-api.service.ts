import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  LinkCandidateQuery,
  LinkedTransaction,
  PagedResult,
  Transaction,
  TransactionFilter,
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

  /**
   * Buchungen eines Monats. Ist `focusTransactionId` gesetzt, liefert der Server die
   * Seite, auf der diese Buchung steht — sonst die angeforderte.
   */
  list(
    accountId: number,
    filter: TransactionFilter,
    focusTransactionId: number | null = null,
  ): Observable<PagedResult<Transaction>> {
    const params = buildParams(filter);
    if (focusTransactionId !== null) params['focusTransactionId'] = focusTransactionId;

    return this.api.get<PagedResult<Transaction>>(this.resource(accountId), { params });
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

/**
 * Baut die Query-Parameter der Liste. Leere Filter werden weggelassen, damit die
 * URL kurz bleibt und der Server seine Defaults verwendet.
 */
function buildParams(
  filter: TransactionFilter,
): Record<string, string | number | boolean | readonly string[]> {
  const params: Record<string, string | number | boolean | readonly string[]> = {
    month: filter.month,
    sort: filter.sort,
    direction: filter.direction,
    page: filter.page,
    pageSize: filter.pageSize,
  };

  const search = filter.search.trim();
  if (search) params['search'] = search;
  if (filter.type) params['type'] = filter.type;
  if (filter.includeUncategorized) params['includeUncategorized'] = true;
  if (filter.categoryIds.length > 0) params['categoryIds'] = filter.categoryIds.map(String);

  return params;
}
