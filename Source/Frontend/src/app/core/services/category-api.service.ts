import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { Category, CategoryPayload } from '../models/category.model';

/** Kategorien eines Kontos. Sie gelten monatsübergreifend. */
@Injectable({ providedIn: 'root' })
export class CategoryApiService {
  private readonly api = inject(ApiService);

  private resource(accountId: number): string {
    return `bankaccounts/${accountId}/categories`;
  }

  list(accountId: number): Observable<Category[]> {
    return this.api.get<Category[]>(this.resource(accountId));
  }

  create(accountId: number, payload: CategoryPayload): Observable<Category> {
    return this.api.post<Category>(this.resource(accountId), payload);
  }

  update(accountId: number, categoryId: number, payload: CategoryPayload): Observable<Category> {
    return this.api.put<Category>(`${this.resource(accountId)}/${categoryId}`, payload);
  }

  delete(accountId: number, categoryId: number): Observable<void> {
    return this.api.delete<void>(`${this.resource(accountId)}/${categoryId}`);
  }

  /** Übernimmt die Kategorien eines anderen Kontos; namensgleiche werden übersprungen. */
  copyFrom(accountId: number, sourceAccountId: number): Observable<Category[]> {
    return this.api.post<Category[]>(`${this.resource(accountId)}/copy`, { sourceAccountId });
  }
}
