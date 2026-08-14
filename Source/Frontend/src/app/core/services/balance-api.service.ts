import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';
import { OfflineCacheService, Sourced } from './offline-cache.service';
import { MonthBalance, YearBalance } from '../models/balance.model';

/**
 * Die konten-übergreifende Bilanz — die Datenquelle der Startseite.
 *
 * Jede Antwort landet im Offline-Zwischenspeicher. Erreicht ein Aufruf den Server
 * nicht, liefert der Dienst den letzten bekannten Stand statt eines Fehlers und
 * markiert ihn als solchen: eine Bilanz von gestern ist deutlich mehr wert als
 * eine leere Seite — solange klar ist, dass sie von gestern ist.
 */
@Injectable({ providedIn: 'root' })
export class BalanceApiService {
  private readonly api = inject(ApiService);
  private readonly cache = inject(OfflineCacheService);

  private readonly resource = 'balance';

  /** Bilanz eines Monats (`yyyy-MM`) über alle Konten, nach Kontokategorie gruppiert. */
  getMonth(month: string): Observable<Sourced<MonthBalance>> {
    return this.cache.withFallback(
      `balance.month.${month}`,
      this.api.get<MonthBalance>(`${this.resource}/month`, { params: { month } }),
    );
  }

  /** Bilanz eines Jahres über alle Konten samt Verlauf der zwölf Monate. */
  getYear(year: number): Observable<Sourced<YearBalance>> {
    return this.cache.withFallback(
      `balance.year.${year}`,
      this.api.get<YearBalance>(`${this.resource}/year`, { params: { year } }),
    );
  }
}
