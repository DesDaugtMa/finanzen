import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import {
  FixedCost,
  FixedCostCopyPreview,
  FixedCostMonth,
  FixedCostPayload,
  FixedCostTransaction,
} from '../models/fixed-cost.model';

/**
 * Fixkosten eines Kontos. Jede Position gehört zu genau einem Abrechnungsmonat;
 * die Zuordnung tatsächlicher Buchungen läuft über die Unterressource `transactions`.
 */
@Injectable({ providedIn: 'root' })
export class FixedCostApiService {
  private readonly api = inject(ApiService);

  private resource(accountId: number): string {
    return `bankaccounts/${accountId}/fixedcosts`;
  }

  /** @param month Monat im Format `yyyy-MM`. */
  getMonth(accountId: number, month: string): Observable<FixedCostMonth> {
    return this.api.get<FixedCostMonth>(this.resource(accountId), { params: { month } });
  }

  create(accountId: number, month: string, payload: FixedCostPayload): Observable<FixedCost> {
    return this.api.post<FixedCost>(this.resource(accountId), payload, { params: { month } });
  }

  update(accountId: number, fixedCostId: number, payload: FixedCostPayload): Observable<FixedCost> {
    return this.api.put<FixedCost>(`${this.resource(accountId)}/${fixedCostId}`, payload);
  }

  /** Zugeordnete Buchungen bleiben erhalten und gelten danach wieder als variable Ausgaben. */
  delete(accountId: number, fixedCostId: number): Observable<void> {
    return this.api.delete<void>(`${this.resource(accountId)}/${fixedCostId}`);
  }

  /** @param sourceMonth Ohne Angabe wählt der Server den jüngsten Monat vor dem Zielmonat. */
  getCopyPreview(
    accountId: number,
    month: string,
    sourceMonth?: string,
  ): Observable<FixedCostCopyPreview> {
    const params: Record<string, string> = sourceMonth ? { month, sourceMonth } : { month };
    return this.api.get<FixedCostCopyPreview>(`${this.resource(accountId)}/copy-preview`, {
      params,
    });
  }

  /** Übernimmt die gewählten Positionen; namensgleiche werden übersprungen. */
  copy(accountId: number, month: string, fixedCostIds: number[]): Observable<FixedCostMonth> {
    return this.api.post<FixedCostMonth>(
      `${this.resource(accountId)}/copy`,
      { fixedCostIds },
      { params: { month } },
    );
  }

  /** Ausgaben des Kontos ohne bestehende Zuordnung — die Auswahl im Zuordnungs-Dialog. */
  getAssignableTransactions(
    accountId: number,
    fixedCostId: number,
    search: string,
  ): Observable<FixedCostTransaction[]> {
    return this.api.get<FixedCostTransaction[]>(
      `${this.resource(accountId)}/${fixedCostId}/assignable-transactions`,
      search ? { params: { search } } : undefined,
    );
  }

  linkTransaction(
    accountId: number,
    fixedCostId: number,
    transactionId: number,
  ): Observable<FixedCostMonth> {
    return this.api.put<FixedCostMonth>(
      `${this.resource(accountId)}/${fixedCostId}/transactions/${transactionId}`,
      {},
    );
  }

  unlinkTransaction(
    accountId: number,
    fixedCostId: number,
    transactionId: number,
  ): Observable<FixedCostMonth> {
    return this.api.delete<FixedCostMonth>(
      `${this.resource(accountId)}/${fixedCostId}/transactions/${transactionId}`,
    );
  }
}
