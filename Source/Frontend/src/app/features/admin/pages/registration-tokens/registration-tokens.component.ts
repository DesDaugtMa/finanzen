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
    <div class="container tokens-page">
      <header class="fin-page-header">
        <div class="fin-page-header__text">
          <span class="fin-eyebrow">Verwaltung</span>
          <h1 class="fin-page-header__title">Einladungen</h1>
          <p class="fin-page-header__subtitle">
            Die Registrierung ist nur mit einem Einladungslink möglich.
          </p>
        </div>
      </header>

      <section class="fin-panel tokens-create" aria-labelledby="createTokenHeading">
        <div class="fin-panel__body">
          <h2 id="createTokenHeading" class="tokens-heading">Neue Einladung erstellen</h2>

          <form class="tokens-form" [formGroup]="form" (ngSubmit)="create()">
            <div class="tokens-form__field">
              <label for="description" class="form-label">
                Beschreibung <span class="form-label__optional">(optional)</span>
              </label>
              <input
                type="text"
                id="description"
                formControlName="description"
                class="form-control"
                placeholder="z. B. für Max"
                autocomplete="off"
              />
            </div>
            <div class="tokens-form__field tokens-form__field--narrow">
              <label for="expiresInDays" class="form-label">Gültig (Tage)</label>
              <input
                type="number"
                id="expiresInDays"
                formControlName="expiresInDays"
                class="form-control fin-input-amount"
                min="1"
                inputmode="numeric"
                placeholder="∞"
                aria-describedby="expiresHint"
              />
              <p id="expiresHint" class="form-text">Leer = unbegrenzt</p>
            </div>
            <div class="tokens-form__submit">
              <button type="submit" class="btn btn-primary" [disabled]="creating()">
                @if (creating()) {
                  <span
                    class="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                }
                Erstellen
              </button>
            </div>
          </form>
        </div>
      </section>

      @if (loading()) {
        <div
          class="fin-panel fin-panel--flush"
          role="status"
          aria-label="Einladungen werden geladen"
        >
          <div class="fin-rows">
            @for (placeholder of skeletonSlots; track $index) {
              <div class="fin-row">
                <div class="fin-row__main tokens-skeleton">
                  <div class="fin-skeleton fin-skeleton--line-short"></div>
                  <div class="fin-skeleton fin-skeleton--text"></div>
                </div>
              </div>
            }
          </div>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger tokens-error" role="alert">
          <span>{{ error() }}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">
            Erneut versuchen
          </button>
        </div>
      } @else if (tokens().length === 0) {
        <div class="alert alert-info" role="alert">Noch keine Einladungen vorhanden.</div>
      } @else {
        <div class="fin-panel fin-panel--flush">
          <ul class="fin-rows">
            @for (token of tokens(); track token.token) {
              <li class="token-item">
                <div class="token-item__head">
                  <div class="token-item__main">
                    <p class="token-item__code fin-mono fin-break-all">{{ token.token }}</p>
                    <p class="fin-row__meta">
                      <span>{{ token.description || 'Ohne Beschreibung' }}</span>
                      <span class="fin-dot"></span>
                      <span>erstellt {{ token.createdAt | date: 'short' }}</span>
                      @if (token.expiresAt) {
                        <span class="fin-dot"></span>
                        <span>läuft ab {{ token.expiresAt | date: 'short' }}</span>
                      }
                    </p>
                  </div>

                  @if (token.isUsed) {
                    <span class="fin-chip">Verwendet</span>
                  } @else if (!token.isActive) {
                    <span class="fin-chip fin-chip--expense">Inaktiv</span>
                  } @else {
                    <span class="fin-chip fin-chip--income">Aktiv</span>
                  }
                </div>

                @if (token.isActive && !token.isUsed) {
                  <div class="token-item__actions">
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm"
                      (click)="copyLink(token.token)"
                    >
                      <i class="bi bi-clipboard" aria-hidden="true"></i>
                      <span>Link kopieren</span>
                    </button>
                    <button
                      type="button"
                      class="btn btn-outline-danger btn-sm"
                      (click)="deactivate(token.token)"
                    >
                      Deaktivieren
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
      .tokens-page {
        max-width: 48rem;
      }
      .tokens-create {
        margin-bottom: var(--fin-space-4);
      }
      .tokens-heading {
        margin: 0 0 var(--fin-space-4);
        font-size: var(--fin-text-md);
      }
      /* Auf Mobil gestapelt, ab Tablet in einer Zeile mit der Schaltfläche am
         Ende. Die Ausrichtung sitzt an der Feldunterkante, nicht am Text —
         sonst steht der Button auf Höhe der Beschriftung. */
      .tokens-form {
        display: grid;
        gap: var(--fin-space-4);
      }
      @media (min-width: 34rem) {
        .tokens-form {
          grid-template-columns: 1fr auto auto;
          align-items: start;
        }
      }
      .tokens-form__field--narrow {
        max-width: 9rem;
      }
      .tokens-form__submit {
        /* Rückt den Button auf die Höhe der Eingabefelder unter deren
           Beschriftungen. */
        padding-top: 1.8125rem;
      }
      @media (max-width: 33.999rem) {
        .tokens-form__submit {
          padding-top: 0;
        }
        .tokens-form__submit .btn {
          width: 100%;
        }
      }
      .tokens-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }

      .token-item {
        padding: var(--fin-space-4);
        border-top: 1px solid var(--fin-border-subtle);
      }
      .token-item:first-child {
        border-top: 0;
      }
      @media (min-width: 48rem) {
        .token-item {
          padding-inline: var(--fin-space-5);
        }
      }
      .token-item__head {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
        gap: var(--fin-space-3);
      }
      .token-item__main {
        flex: 1 1 auto;
        min-width: 0;
      }
      .token-item__code {
        margin: 0 0 0.15rem;
        color: var(--fin-text-strong);
        font-weight: 600;
      }
      .token-item__actions {
        display: flex;
        flex-wrap: wrap;
        gap: var(--fin-space-2);
        margin-top: var(--fin-space-3);
      }
      .tokens-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
      }
    `,
  ],
})
export class RegistrationTokensComponent implements OnInit {
  private fb = inject(FormBuilder);
  private tokenApi = inject(RegistrationTokenApiService);
  private toastService = inject(ToastService);

  protected tokens = signal<RegistrationTokenInfo[]>([]);
  protected loading = signal(true);
  protected creating = signal(false);
  protected error = signal('');

  /** Anzahl der Platzhalter-Zeilen während des Ladens. */
  protected readonly skeletonSlots = [0, 1, 2];

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
        this.tokens.update((list) =>
          list.map((t) => (t.token === token ? { ...t, isActive: false } : t)),
        );
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
