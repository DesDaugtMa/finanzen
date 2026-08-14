import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ChangelogEntry } from '../../../../core/models/changelog.model';
import { MONTH_LOCALE } from '../../../../shared/utils/month.util';

/** Eine Rubrik innerhalb einer Version, so wie sie angezeigt wird. */
interface EntryGroup {
  kind: 'features' | 'changes' | 'bugfixes';
  label: string;
  icon: string;
  items: string[];
}

/**
 * Eine Version im Zeitstrahl: Nummer, Datum, Zusammenfassung und die Änderungen,
 * gegliedert in Neu, Verbessert und Behoben.
 *
 * Die Rubriken heißen bewusst nicht „Features“, „Changes“ und „Bugfixes“: der Changelog
 * richtet sich an Nutzer, nicht an Entwickler. Die Zuordnung erkennt man zusätzlich am
 * Symbol und an der Überschrift — nicht allein an der Farbe.
 */
@Component({
  selector: 'app-changelog-entry',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="fin-panel entry">
      <header class="entry__header">
        <div class="entry__title">
          <h2 class="entry__version">Version {{ entry().version }}</h2>
          @if (current()) {
            <span class="fin-chip fin-chip--accent entry__badge">
              <i class="bi bi-check-circle" aria-hidden="true"></i>
              <span>Aktuelle Version</span>
            </span>
          }
        </div>

        <time class="entry__date" [attr.datetime]="entry().releaseDate">
          {{ formattedDate() }}
        </time>
      </header>

      @if (entry().summary) {
        <p class="entry__summary">{{ entry().summary }}</p>
      }

      @for (group of groups(); track group.kind) {
        <section class="group">
          <h3 class="group__title">
            <span class="group__icon group__icon--{{ group.kind }}" aria-hidden="true">
              <i class="bi bi-{{ group.icon }}"></i>
            </span>
            <span>{{ group.label }}</span>
          </h3>

          <ul class="group__list">
            @for (item of group.items; track item) {
              <li class="group__item">{{ item }}</li>
            }
          </ul>
        </section>
      }
    </article>
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .entry {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-4);
        padding: var(--fin-space-5);
      }
      @media (min-width: 48rem) {
        .entry {
          padding: var(--fin-space-6);
        }
      }
      .entry__header {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
      }
      .entry__title {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--fin-space-3);
      }
      .entry__version {
        margin: 0;
        font-size: var(--fin-text-xl);
        letter-spacing: var(--fin-tracking-tight);
      }
      .entry__badge {
        gap: var(--fin-space-1);
      }
      .entry__date {
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
      }
      .entry__summary {
        margin: 0;
        color: var(--fin-text);
        font-size: var(--fin-text-base);
        line-height: var(--fin-leading-relaxed);
      }
      .group {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
      }
      .group__title {
        display: flex;
        align-items: center;
        gap: var(--fin-space-2);
        margin: 0;
        font-size: var(--fin-text-sm);
        font-weight: 600;
        letter-spacing: var(--fin-tracking-wide);
        text-transform: uppercase;
        color: var(--fin-text-muted);
      }
      .group__icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--fin-space-6);
        height: var(--fin-space-6);
        border-radius: var(--fin-radius-sm);
        font-size: var(--fin-text-xs);
      }
      .group__icon--features {
        background-color: var(--fin-accent-tint);
        color: var(--fin-accent-on-tint);
      }
      .group__icon--changes {
        background-color: var(--fin-info-tint);
        color: var(--fin-info);
      }
      .group__icon--bugfixes {
        background-color: var(--fin-warn-tint);
        color: var(--fin-warn);
      }
      .group__list {
        display: flex;
        flex-direction: column;
        gap: var(--fin-space-2);
        margin: 0;
        padding-left: var(--fin-space-8);
        list-style: disc;
      }
      .group__item {
        color: var(--fin-text);
        font-size: var(--fin-text-base);
        line-height: var(--fin-leading-normal);
      }
      .group__item::marker {
        color: var(--fin-border-strong);
      }
    `,
  ],
})
export class ChangelogEntryComponent {
  readonly entry = input.required<ChangelogEntry>();

  /** Markiert die Version, die gerade ausgeliefert ist. */
  readonly current = input(false);

  protected readonly formattedDate = computed(() => formatReleaseDate(this.entry().releaseDate));

  protected readonly groups = computed<EntryGroup[]>(() => {
    const entry = this.entry();

    const groups: EntryGroup[] = [
      { kind: 'features', label: 'Neu', icon: 'stars', items: entry.features },
      { kind: 'changes', label: 'Verbessert', icon: 'arrow-repeat', items: entry.changes },
      { kind: 'bugfixes', label: 'Behoben', icon: 'bandaid', items: entry.bugfixes },
    ];

    return groups.filter((group) => group.items.length > 0);
  });
}

/** `2026-08-14` → `14. August 2026`. Ohne gültiges Datum bleibt der Rohwert stehen. */
function formatReleaseDate(value: string): string {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;

  return new Intl.DateTimeFormat(MONTH_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day));
}
