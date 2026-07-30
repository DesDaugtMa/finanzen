import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  PagedResult,
  Transaction,
  TransactionFilter,
  TransactionPayload,
  TransferPayload,
} from '../models/transaction.model';

/** Buchungen eines Kontos inklusive der Überweisungen zwischen zwei Konten. */
@Injectable({ providedIn: 'root' })
export class TransactionApiService {
  private readonly api = inject(ApiService);

  private resource(accountId: number): string {
    return `bankaccounts/${accountId}/transactions`;
  }

  list(accountId: number, filter: TransactionFilter): Observable<PagedResult<Transaction>> {
    return this.api.get<PagedResult<Transaction>>(this.resource(accountId), {
      params: buildParams(filter),
    });
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

  /** Löscht die Buchung endgültig; bei einer Überweisung auch die Gegenbuchung. */
  delete(accountId: number, transactionId: number): Observable<void> {
    return this.api.delete<void>(`${this.resource(accountId)}/${transactionId}`);
  }

  createTransfer(accountId: number, payload: TransferPayload): Observable<Transaction> {
    return this.api.post<Transaction>(`${this.resource(accountId)}/transfers`, payload);
  }

  updateTransfer(
    accountId: number,
    transactionId: number,
    payload: TransferPayload,
  ): Observable<Transaction> {
    return this.api.put<Transaction>(
      `${this.resource(accountId)}/transfers/${transactionId}`,
      payload,
    );
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
