import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';
import { DebtApiService } from './debt-api.service';
import { DebtOverview } from '../models/debt.model';

/**
 * Der gemeinsame Stand der Schuldnerliste.
 *
 * Es gibt ihn genau einmal, weil ihn zwei sehr unterschiedliche Stellen brauchen: die
 * Schuldner-Seite und der Zähler in der Navigation, der auf jeder Seite mitläuft. Läge der
 * Stand in der Seite, müsste die Navigation ihn erraten oder nachladen — der Zähler hinge
 * dann sichtbar hinterher.
 *
 * Alle ändernden Endpunkte antworten bereits mit dem neuen Gesamtstand. Der wandert über
 * {@link apply} direkt hierher, deshalb steht der Zähler unmittelbar richtig, ohne dass
 * eine zweite Anfrage nötig wäre.
 */
@Injectable({ providedIn: 'root' })
export class DebtStateService {
  private readonly debtApi = inject(DebtApiService);
  private readonly authService = inject(AuthService);

  private readonly overviewState = signal<DebtOverview | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');

  /** Der zuletzt geladene Stand, oder `null`, solange noch keiner vorliegt. */
  readonly overview = this.overviewState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  /**
   * Anzahl der Einträge, bei denen noch Geld aussteht — die Zahl am Navigationsziel.
   * Solange nichts geladen ist, ist sie 0: die Navigation soll niemals eine Zahl zeigen,
   * die sie nicht belegen kann.
   */
  readonly openCount = computed(() => this.overviewState()?.openCount ?? 0);

  /**
   * Für welchen Nutzer der Stand gilt. Ohne diesen Vergleich würde nach einem
   * Nutzerwechsel die Zahl des vorigen Nutzers stehen bleiben. Die E-Mail dient als
   * Kennung, weil der angemeldete Nutzer keine ID mit sich führt.
   */
  private loadedForUser: string | null = null;

  /** Läuft gerade eine Anfrage? Verhindert, dass mehrere Aufrufer parallel laden. */
  private requestInFlight = false;

  /**
   * Lädt den Stand, falls er fehlt oder zu einem anderen Nutzer gehört. Ein Fehler bleibt
   * hier stumm: eine nicht erreichbare Schuldnerliste darf in der Navigation keine
   * Fehlermeldung erzeugen — der Zähler bleibt dann schlicht aus.
   */
  ensureLoaded(): void {
    const user = this.authService.currentUser()?.email ?? null;

    if (this.requestInFlight) return;
    if (this.overviewState() !== null && this.loadedForUser === user) return;

    this.load().subscribe({ error: () => undefined });
  }

  /**
   * Holt den Stand in jedem Fall neu. Fehler werden hier gehalten (für die Seite) und
   * zusätzlich weitergereicht, damit ein Aufrufer eigen darauf reagieren kann.
   */
  load(): Observable<DebtOverview> {
    this.loadingState.set(true);
    this.errorState.set('');
    this.requestInFlight = true;

    return this.debtApi.getOverview().pipe(
      tap({
        next: (overview) => {
          this.apply(overview);
          this.loadingState.set(false);
          this.requestInFlight = false;
        },
        error: (err: Error) => {
          this.errorState.set(err.message || 'Die Schuldnerliste konnte nicht geladen werden.');
          this.loadingState.set(false);
          this.requestInFlight = false;
        },
      }),
    );
  }

  /**
   * Übernimmt einen Stand, den ein ändernder Endpunkt bereits mitgeliefert hat.
   * Damit wird der Zähler im selben Moment richtig, in dem die Änderung ankommt.
   */
  apply(overview: DebtOverview): void {
    this.overviewState.set(overview);
    this.loadedForUser = this.authService.currentUser()?.email ?? null;
    this.errorState.set('');
  }
}
