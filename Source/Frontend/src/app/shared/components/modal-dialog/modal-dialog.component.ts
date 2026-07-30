import {
  ChangeDetectionStrategy,
  Component,
  DOCUMENT,
  DestroyRef,
  ElementRef,
  afterNextRender,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';

let nextDialogId = 0;

/**
 * Wiederverwendbare Dialog-Hülle.
 *
 * Bewusst ohne Bootstrap-JavaScript umgesetzt, damit Öffnen und Schließen
 * vollständig über Signals im Aufrufer gesteuert werden (`@if`) und wir
 * Fokus-Management sowie Escape selbst kontrollieren können.
 *
 * Die Darstellung wechselt mit der Breite (Regeln in `_overlays.scss`): auf dem
 * Smartphone fährt der Dialog als Sheet vom unteren Rand ein und bleibt dort
 * verankert — die Aktionen liegen damit in Daumenreichweite. Ab Tablet ist es
 * ein zentrierter Dialog.
 */
@Component({
  selector: 'app-modal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <div class="fin-backdrop" (click)="requestClose()" aria-hidden="true"></div>

    <div class="fin-dialog-layer">
      <div
        #panel
        class="fin-dialog"
        [class.fin-dialog--lg]="size() === 'lg'"
        role="dialog"
        aria-modal="true"
        [attr.aria-labelledby]="titleId"
      >
        <!-- Griffleiste: Affordanz, dass das Sheet von unten kommt (nur mobil sichtbar). -->
        <div class="fin-dialog__grip" aria-hidden="true"></div>

        <div class="fin-dialog__header">
          <h2 class="fin-dialog__title" [id]="titleId">{{ title() }}</h2>
          <button
            type="button"
            class="btn-close"
            aria-label="Dialog schließen"
            (click)="requestClose()"
          ></button>
        </div>

        <div class="fin-dialog__body">
          <ng-content />
        </div>

        <div class="fin-dialog__footer">
          <ng-content select="[dialogFooter]" />
        </div>
      </div>
    </div>
  `,
})
export class ModalDialogComponent {
  readonly title = input.required<string>();
  readonly size = input<'md' | 'lg'>('md');

  /** Wird bei Escape, Backdrop-Klick oder Klick auf das Schließen-Kreuz ausgelöst. */
  readonly closed = output<void>();

  protected readonly titleId = `modal-title-${nextDialogId++}`;

  private readonly panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private readonly document = inject(DOCUMENT);

  constructor() {
    // Fokus des auslösenden Elements merken, um ihn beim Schließen zurückzugeben.
    const previouslyFocused = this.document.activeElement as HTMLElement | null;

    const body = this.document.body;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    afterNextRender(() => this.focusFirstElement());

    inject(DestroyRef).onDestroy(() => {
      body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.();
    });
  }

  protected requestClose(): void {
    this.closed.emit();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.requestClose();
      return;
    }

    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private focusFirstElement(): void {
    const focusable = this.focusableElements();
    (focusable[0] ?? this.panel().nativeElement).focus();
  }

  /** Hält den Tastatur-Fokus innerhalb des Dialogs (WCAG 2.1.2 "No Keyboard Trap" umgekehrt: modaler Kontext). */
  private trapFocus(event: KeyboardEvent): void {
    const focusable = this.focusableElements();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = this.document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusableElements(): HTMLElement[] {
    const selector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    return Array.from(this.panel().nativeElement.querySelectorAll<HTMLElement>(selector)).filter(
      (element) => element.offsetParent !== null,
    );
  }
}
