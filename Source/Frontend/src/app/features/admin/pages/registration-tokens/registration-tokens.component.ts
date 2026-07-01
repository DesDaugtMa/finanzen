import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RegistrationTokenApiService } from '../../../../core/services/registration-token-api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { RegistrationTokenInfo } from '../../../../core/models/auth.model';

@Component({
  selector: 'app-registration-tokens',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <div class="container py-4" style="max-width: 52rem;">
      <h1 class="h4 fw-bold mb-4">Einladungen verwalten</h1>

      <div class="card border-0 shadow-sm mb-4">
        <div class="card-body">
          <h2 class="h6 fw-bold mb-3">Neuen Einladungs-Token erstellen</h2>
          <form [formGroup]="form" (ngSubmit)="create()" class="row g-2 align-items-end">
            <div class="col-12 col-sm-6">
              <label for="description" class="form-label">Beschreibung (optional)</label>
              <input type="text" id="description" formControlName="description" class="form-control" placeholder="z. B. für Max" />
            </div>
            <div class="col-8 col-sm-3">
              <label for="expiresInDays" class="form-label">Gültig (Tage)</label>
              <input type="number" id="expiresInDays" formControlName="expiresInDays" class="form-control" min="1" placeholder="∞" />
            </div>
            <div class="col-4 col-sm-3">
              <button type="submit" class="btn btn-primary w-100" [disabled]="creating()">
                @if (creating()) {
                  <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                } @else {
                  Erstellen
                }
              </button>
            </div>
          </form>
        </div>
      </div>

      @if (loading()) {
        <div class="text-center py-5"><span class="spinner-border text-primary" role="status" aria-hidden="true"></span></div>
      } @else if (error()) {
        <div class="alert alert-danger d-flex align-items-center gap-2" role="alert">
          <span class="me-auto">{{ error() }}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">Erneut versuchen</button>
        </div>
      } @else if (tokens().length === 0) {
        <div class="alert alert-info" role="alert">Noch keine Einladungs-Token vorhanden.</div>
      } @else {
        <div class="list-group shadow-sm">
          @for (token of tokens(); track token.token) {
            <div class="list-group-item">
              <div class="d-flex flex-wrap align-items-center gap-2">
                <div class="me-auto">
                  <div class="fw-semibold font-monospace text-break">{{ token.token }}</div>
                  <div class="text-muted small">
                    {{ token.description || 'Ohne Beschreibung' }} · erstellt {{ token.createdAt | date: 'short' }}
                    @if (token.expiresAt) {
                      · läuft ab {{ token.expiresAt | date: 'short' }}
                    }
                  </div>
                </div>
                @if (token.isUsed) {
                  <span class="badge text-bg-secondary">Verwendet</span>
                } @else if (!token.isActive) {
                  <span class="badge text-bg-danger">Inaktiv</span>
                } @else {
                  <span class="badge text-bg-success">Aktiv</span>
                }
              </div>

              @if (token.isActive && !token.isUsed) {
                <div class="d-flex flex-wrap gap-2 mt-2">
                  <button type="button" class="btn btn-outline-primary btn-sm" (click)="copyLink(token.token)">
                    <i class="bi bi-clipboard me-1"></i> Registrierungslink kopieren
                  </button>
                  <button type="button" class="btn btn-outline-danger btn-sm" (click)="deactivate(token.token)">
                    Deaktivieren
                  </button>
                </div>
              }
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class RegistrationTokensComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tokenApi = inject(RegistrationTokenApiService);
  private toastService = inject(ToastService);

  protected tokens = signal<RegistrationTokenInfo[]>([]);
  protected loading = signal(true);
  protected creating = signal(false);
  protected error = signal('');

  protected form = this.fb.nonNullable.group({
    description: [''],
    expiresInDays: [null as number | null],
  });

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set('');
    this.tokenApi.list().subscribe({
      next: (tokens) => {
        this.tokens.set(tokens);
        this.loading.set(false);
      },
      error: (err: Error) => {
        this.error.set(err.message || 'Token konnten nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  protected create(): void {
    this.creating.set(true);
    const { description, expiresInDays } = this.form.getRawValue();
    this.tokenApi
      .create({
        description: description || undefined,
        expiresInDays: expiresInDays ?? undefined,
      })
      .subscribe({
        next: (created) => {
          this.creating.set(false);
          this.tokens.update((list) => [created, ...list]);
          this.form.reset({ description: '', expiresInDays: null });
          this.toastService.success('Einladungs-Token erstellt.');
        },
        error: (err: Error) => {
          this.creating.set(false);
          this.toastService.error(err.message || 'Erstellen fehlgeschlagen.');
        },
      });
  }

  protected deactivate(token: string): void {
    this.tokenApi.deactivate(token).subscribe({
      next: () => {
        this.tokens.update((list) => list.map((t) => (t.token === token ? { ...t, isActive: false } : t)));
        this.toastService.success('Token deaktiviert.');
      },
      error: (err: Error) => this.toastService.error(err.message || 'Deaktivieren fehlgeschlagen.'),
    });
  }

  protected copyLink(token: string): void {
    const link = `${window.location.origin}/register/${token}`;
    navigator.clipboard.writeText(link).then(
      () => this.toastService.success('Registrierungslink kopiert.'),
      () => this.toastService.error('Kopieren fehlgeschlagen.'),
    );
  }
}
