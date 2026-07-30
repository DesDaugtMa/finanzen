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
 * Wiederverwendbare Dialog-Hülle im Bootstrap-Modal-Look.
 *
 * Bewusst ohne Bootstrap-JavaScript umgesetzt, damit Öffnen und Schließen
 * vollständig über Signals im Aufrufer gesteuert werden (`@if`) und wir
 * Fokus-Management sowie Escape selbst kontrollieren können.
 */
@Component({
  selector: 'app-modal-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <div class="modal-backdrop fade show" (click)="requestClose()" aria-hidden="true"></div>

    <div class="modal fade show d-block" tabindex="-1" role="dialog">
      <div
        class="modal-dialog modal-dialog-centered modal-dialog-scrollable"
        [class.modal-lg]="size() === 'lg'"
        role="document"
      >
        <div
          #panel
          class="modal-content border-0 shadow"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="titleId"
        >
          <div class="modal-header">
            <h2 class="modal-title h5 fw-bold mb-0" [id]="titleId">{{ title() }}</h2>
            <button
              type="button"
              class="btn-close"
              aria-label="Dialog schließen"
              (click)="requestClose()"
            ></button>
          </div>

          <div class="modal-body">
            <ng-content />
          </div>

          <div class="modal-footer">
            <ng-content select="[dialogFooter]" />
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-content {
        border-radius: 1rem;
      }
      .modal-header,
      .modal-footer {
        border-color: var(--bs-border-color-translucent);
      }
    `,
  ],
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
