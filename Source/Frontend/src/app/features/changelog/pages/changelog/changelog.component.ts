import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChangelogApiService } from '../../../../core/services/changelog-api.service';
import { Changelog } from '../../../../core/models/changelog.model';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OfflineNoticeComponent } from '../../../../shared/components/offline-notice/offline-notice.component';
import { ChangelogEntryComponent } from '../../components/changelog-entry/changelog-entry.component';

/**
 * Was sich in welcher Version geändert hat — als Zeitstrahl, neueste Version oben.
 *
 * Der Changelog ist reine Lektüre: es gibt nichts einzugeben und nichts zu speichern.
 * Deshalb trägt die Seite bewusst wenig Bedienelemente und stellt den Text in den
 * Vordergrund. Ohne Netz zeigt sie den zuletzt geladenen Stand samt Hinweis, statt
 * leer zu bleiben.
 */
@Component({
  selector: 'app-changelog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, OfflineNoticeComponent, ChangelogEntryComponent],
  template: `
    <div class="container fin-container--reading">
      <header class="fin-page-header">
        <div class="fin-page-header__text">
          <span class="fin-eyebrow">Neuigkeiten</span>
          <h1 class="fin-page-header__title">Changelog</h1>
          <p class="fin-page-header__subtitle">
            Was sich mit jeder Version für dich geändert hat — neueste zuerst.
          </p>
        </div>
      </header>

      @if (loading()) {
        <div class="fin-panel changelog-skeleton" role="status" aria-label="Changelog wird geladen">
          <div class="fin-skeleton fin-skeleton--title"></div>
          <div class="fin-skeleton fin-skeleton--line"></div>
          <div class="fin-skeleton fin-skeleton--line"></div>
          <div class="fin-skeleton fin-skeleton--line-short"></div>
        </div>
      } @else if (error()) {
        <div class="alert alert-danger changelog-error" role="alert">
          <span>{{ error() }}</span>
          <button type="button" class="btn btn-sm btn-outline-danger" (click)="load()">
            Erneut versuchen
          </button>
        </div>
      } @else if (data(); as changelog) {
        @if (stale()) {
          <div class="changelog-notice">
            <app-offline-notice [stale]="true" [savedAt]="savedAt()" />
          </div>
        }

        @if (changelog.entries.length === 0) {
          <app-empty-state
            icon="journal-text"
            title="Noch keine Einträge"
            message="Sobald es eine neue Version gibt, findest du hier, was sich für dich geändert hat."
          />
        } @else {
          <ol class="timeline">
            @for (entry of changelog.entries; track entry.version) {
              <li class="timeline__item">
                <span class="timeline__marker" aria-hidden="true"></span>
                <app-changelog-entry
                  [entry]="entry"
                  [current]="entry.version === changelog.currentVersion"
                />
              </li>
            }
          </ol>
        }
      }
    </div>
  `,
  styles: [
    `
      .changelog-skeleton {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-3);
        padding: var(--fin-space-5);
      }
      .changelog-error {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-3);
      }
      .changelog-notice {
        margin-bottom: var(--fin-space-5);
      }

      /* Der Zeitstrahl: eine durchgehende Linie links, je Version ein Punkt.
         Auf schmalen Displays bleibt die Linie schmal, damit dem Text die Breite
         gehört — lesbar ist wichtiger als dekorativ. */
      .timeline {
        position: relative;
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-5);
        margin: 0;
        padding: 0 0 0 var(--fin-space-6);
        list-style: none;
      }
      .timeline::before {
        content: '';
        position: absolute;
        top: var(--fin-space-2);
        bottom: var(--fin-space-2);
        left: var(--fin-space-1);
        width: 2px;
        border-radius: var(--fin-radius-pill);
        background-color: var(--fin-border);
      }
      @media (min-width: 48rem) {
        .timeline {
          padding-left: var(--fin-space-8);
          gap: var(--fin-space-6);
        }
        .timeline::before {
          left: var(--fin-space-2);
        }
      }
      .timeline__item {
        position: relative;
      }
      .timeline__marker {
        position: absolute;
        top: var(--fin-space-6);
        left: calc(var(--fin-space-6) * -1);
        width: var(--fin-space-3);
        height: var(--fin-space-3);
        border: 2px solid var(--fin-bg);
        border-radius: var(--fin-radius-pill);
        background-color: var(--fin-border-strong);
      }
      @media (min-width: 48rem) {
        .timeline__marker {
          left: calc(var(--fin-space-8) * -1 + var(--fin-space-1));
        }
      }
      /* Die jüngste Version bekommt den kräftigen Punkt — sie ist der Stand,
         den der Nutzer gerade vor sich hat. */
      .timeline__item:first-child .timeline__marker {
        background-color: var(--fin-accent);
      }
    `,
  ],
})
export class ChangelogComponent {
  private readonly changelogApi = inject(ChangelogApiService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly data = signal<Changelog | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);

  /** True, wenn die Anzeige aus dem Zwischenspeicher stammt. */
  protected readonly stale = signal(false);
  protected readonly savedAt = signal<Date | null>(null);

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.changelogApi
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.data.set(result.value);
          this.stale.set(result.fromCache);
          this.savedAt.set(result.savedAt);
          this.loading.set(false);
        },
        error: (err: Error) => {
          this.error.set(err.message);
          this.loading.set(false);
        },
      });
  }
}
