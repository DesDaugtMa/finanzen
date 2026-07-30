import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { SessionsApiService } from '../../../../core/services/sessions-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SessionInfo } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-sessions',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe],
  template: `
    <div class="container sessions-page">
      <header class="fin-page-header">
        <div class="fin-page-header__text">
          <span class="fin-eyebrow">Sicherheit</span>
          <h1 class="fin-page-header__title">Aktive Sitzungen</h1>
          <p class="fin-page-header__subtitle">Geräte, auf denen du derzeit angemeldet bist.</p>
        </div>

        <div class="fin-page-header__actions">
          <button
            type="button"
            class="btn btn-outline-danger btn-sm"
            [disabled]="loading() || sessions().length <= 1"
            (click)="revokeOthers()"
          >
            Alle anderen abmelden
          </button>
        </div>
      </header>

      @if (loading()) {
        <div class="fin-panel fin-panel--flush" role="status" aria-label="Sitzungen werden geladen">
          <div class="fin-rows">
            @for (placeholder of skeletonSlots; track $index) {
              <div class="fin-row">
                <div class="fin-row__main sessions-skeleton">
                  <div class="fin-skeleton fin-skeleton--line-short"></div>
                  <div class="fin-skeleton fin-skeleton--text"></div>
                </div>
              </div>
            }
          </div>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger sessions-error" role="alert">
          <span>{{ error() }}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">
            Erneut versuchen
          </button>
        </div>
      } @else if (sessions().length === 0) {
        <div class="alert alert-info" role="alert">Keine aktiven Sitzungen gefunden.</div>
      } @else {
        <div class="fin-panel fin-panel--flush">
          <ul class="fin-rows">
            @for (session of sessions(); track session.id) {
              <li class="fin-row">
                <span
                  class="fin-emblem fin-emblem--sm"
                  [class.fin-emblem--muted]="!session.isCurrent"
                  aria-hidden="true"
                >
                  <i class="bi bi-{{ session.isCurrent ? 'laptop' : 'display' }}"></i>
                </span>

                <div class="fin-row__main">
                  <p
                    class="fin-row__title session-agent"
                    [attr.title]="session.userAgent || 'Unbekanntes Gerät'"
                  >
                    {{ session.userAgent || 'Unbekanntes Gerät' }}
                  </p>
                  <p class="fin-row__meta">
                    @if (session.isCurrent) {
                      <span class="fin-chip fin-chip--accent">Dieses Gerät</span>
                    }
                    <span>IP {{ session.ipAddress || '—' }}</span>
                    <span class="fin-dot"></span>
                    <span>Zuletzt aktiv {{ session.lastSeenAt | date: 'short' }}</span>
                  </p>
                </div>

                @if (!session.isCurrent) {
                  <div class="fin-row__aside">
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm"
                      [disabled]="revoking() === session.id"
                      [attr.aria-label]="
                        'Sitzung ' + (session.userAgent || 'Unbekanntes Gerät') + ' abmelden'
                      "
                      (click)="revoke(session.id)"
                    >
                      @if (revoking() === session.id) {
                        <span
                          class="spinner-border spinner-border-sm"
                          role="status"
                          aria-hidden="true"
                        ></span>
                      }
                      Abmelden
                    </button>
                  </div>
                }
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .sessions-page {
        max-width: 44rem;
      }
      .sessions-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }
      /* Browser-Kennungen sind lang; die Zeile bleibt einzeilig und kürzt, damit
         die Liste scanbar bleibt. Vollständig steht sie im Titel-Attribut. */
      .session-agent {
        font-weight: 600;
      }
      .sessions-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
      }
    `,
  ],
})
export class SessionsComponent implements OnInit {
  private sessionsApi = inject(SessionsApiService);
  private toastService = inject(ToastService);

  protected sessions = signal<SessionInfo[]>([]);
  protected loading = signal(true);
  protected error = signal('');
  protected revoking = signal<string | null>(null);

  /** Anzahl der Platzhalter-Zeilen während des Ladens. */
  protected readonly skeletonSlots = [0, 1, 2];

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.sessionsApi.list().subscribe({
      next: (sessions) => {
        this.sessions.set(sessions);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Sitzungen konnten nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  protected revoke(id: string): void {
    this.revoking.set(id);
    this.sessionsApi.revoke(id).subscribe({
      next: () => {
        this.revoking.set(null);
        this.sessions.update((list) => list.filter((s) => s.id !== id));
        this.toastService.success('Sitzung abgemeldet.');
      },
      error: (err: Error) => {
        this.revoking.set(null);
        this.toastService.error(err.message || 'Abmelden fehlgeschlagen.');
      },
    });
  }

  protected revokeOthers(): void {
    this.sessionsApi.revokeOthers().subscribe({
      next: () => {
        this.sessions.update((list) => list.filter((s) => s.isCurrent));
        this.toastService.success('Alle anderen Sitzungen wurden abgemeldet.');
      },
      error: (err: Error) => this.toastService.error(err.message || 'Aktion fehlgeschlagen.'),
    });
  }
}
