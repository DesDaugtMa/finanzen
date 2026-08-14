import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ConnectivityService } from '../../../core/services/connectivity.service';
import { MONTH_LOCALE } from '../../utils/month.util';

/**
 * Hinweis, dass die gezeigten Zahlen aus dem Zwischenspeicher stammen.
 *
 * Er steht bewusst direkt über den Daten und nicht als Toast am Rand: eine
 * Bilanz, die nicht vom Server kommt, darf man nicht wegwischen können, ohne
 * dass der Vorbehalt mit verschwindet.
 */
@Component({
  selector: 'app-offline-notice',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (visible()) {
      <div class="offline" role="status">
        <i class="bi bi-cloud-slash offline__icon" aria-hidden="true"></i>
        <span class="offline__text">{{ text() }}</span>
      </div>
    }
  `,
  styles: [
    `
      :host {
        display: block;
      }
      .offline {
        display: flex;
        align-items: center;
        gap: var(--fin-space-3);
        padding: var(--fin-space-3) var(--fin-space-4);
        background-color: var(--fin-warn-tint);
        border: 1px solid var(--fin-warn);
        border-radius: var(--fin-radius-md);
        color: var(--fin-text);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
      .offline__icon {
        flex-shrink: 0;
        color: var(--fin-warn);
        font-size: var(--fin-text-md);
      }
      .offline__text {
        min-width: 0;
      }
    `,
  ],
})
export class OfflineNoticeComponent {
  /** True, wenn die gezeigten Daten aus dem Zwischenspeicher stammen. */
  readonly stale = input(false);
  /** Wann die gezeigten Daten geholt wurden. */
  readonly savedAt = input<Date | null>(null);

  private readonly connectivity = inject(ConnectivityService);

  /**
   * Der Hinweis erscheint, sobald entweder das Gerät offline ist oder die Daten
   * aus dem Zwischenspeicher kommen — beides bedeutet für den Nutzer dasselbe:
   * was hier steht, ist nicht zwingend der aktuelle Stand.
   */
  protected readonly visible = computed(() => this.stale() || this.connectivity.offline());

  protected readonly text = computed(() => {
    const savedAt = this.savedAt();

    if (!this.stale())
      return 'Keine Verbindung. Änderungen sind erst wieder möglich, sobald du online bist.';

    if (!savedAt) return 'Offline — es wird der zuletzt geladene Stand gezeigt.';

    return `Offline — Stand von ${formatTimestamp(savedAt)}. Änderungen sind erst wieder möglich, sobald du online bist.`;
  });
}

/** Datum und Uhrzeit des Zwischenspeicher-Stands, z. B. `14.08.2026, 09:12`. */
function formatTimestamp(value: Date): string {
  return new Intl.DateTimeFormat(MONTH_LOCALE, {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(value);
}
