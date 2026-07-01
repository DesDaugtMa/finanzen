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
    <div class="container py-4" style="max-width: 48rem;">
      <div class="d-flex flex-wrap align-items-center gap-2 mb-4">
        <h1 class="h4 fw-bold mb-0 me-auto">Aktive Sitzungen</h1>
        <button
          type="button"
          class="btn btn-outline-danger btn-sm"
          [disabled]="loading() || sessions().length <= 1"
          (click)="revokeOthers()"
        >
          Alle anderen abmelden
        </button>
      </div>

      @if (loading()) {
        <div class="text-center py-5">
          <span class="spinner-border text-primary" role="status" aria-hidden="true"></span>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <span class="me-auto">{{ error() }}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">Erneut versuchen</button>
        </div>
      } @else if (sessions().length === 0) {
        <div class="alert alert-info" role="alert">Keine aktiven Sitzungen gefunden.</div>
      } @else {
        <div class="list-group shadow-sm">
          @for (session of sessions(); track session.id) {
            <div class="list-group-item d-flex flex-wrap align-items-center gap-2">
              <div class="me-auto">
                <div class="fw-semibold">
                  {{ session.userAgent || 'Unbekanntes Gerät' }}
                  @if (session.isCurrent) {
                    <span class="badge text-bg-success ms-2">Dieses Gerät</span>
                  }
                </div>
                <div class="text-muted small">
                  IP: {{ session.ipAddress || '—' }} · Zuletzt aktiv: {{ session.lastSeenAt | date: 'short' }}
                </div>
              </div>
              @if (!session.isCurrent) {
                <button
                  type="button"
                  class="btn btn-outline-secondary btn-sm"
                  [disabled]="revoking() === session.id"
                  (click)="revoke(session.id)"
                >
                  Abmelden
                </button>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class SessionsComponent implements OnInit {
  private sessionsApi = inject(SessionsApiService);
  private toastService = inject(ToastService);

  protected sessions = signal<SessionInfo[]>([]);
  protected loading = signal(true);
  protected error = signal('');
  protected revoking = signal<string | null>(null);

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
