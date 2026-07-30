import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { BudgetMonth } from '../models/budget.model';

/** Monatsbudgets der Kategorien eines Kontos. Jeder Aufruf gilt für genau einen Monat. */
@Injectable({ providedIn: 'root' })
export class BudgetApiService {
  private readonly api = inject(ApiService);

  private resource(accountId: number): string {
    return `bankaccounts/${accountId}/budgets`;
  }

  /** @param month Monat im Format `yyyy-MM`. */
  getMonth(accountId: number, month: string): Observable<BudgetMonth> {
    return this.api.get<BudgetMonth>(this.resource(accountId), { params: { month } });
  }

  /** `amount === null` entfernt das Budget für diesen Monat wieder. */
  set(
    accountId: number,
    categoryId: number,
    month: string,
    amount: number | null,
  ): Observable<BudgetMonth> {
    return this.api.put<BudgetMonth>(
      `${this.resource(accountId)}/${categoryId}`,
      { amount },
      { params: { month } },
    );
  }

  /** Übernimmt die Budgets des Vormonats für alle Kategorien ohne eigenes Budget. */
  applySuggestions(accountId: number, month: string): Observable<BudgetMonth> {
    return this.api.post<BudgetMonth>(
      `${this.resource(accountId)}/apply-suggestions`,
      {},
      { params: { month } },
    );
  }
}
