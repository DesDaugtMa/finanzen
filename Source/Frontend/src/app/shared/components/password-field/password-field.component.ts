import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

let nextFieldId = 0;

/**
 * Passwort-Eingabe mit Sichtbarkeits-Umschalter.
 *
 * Der Umschalter ist auf dem Smartphone kein Komfort-Extra: ein Passwort auf
 * einer Bildschirmtastatur einzugeben, ohne es prüfen zu können, ist die
 * häufigste Ursache für fehlgeschlagene Anmeldeversuche. Der Zustand fällt beim
 * Verlassen der Seite automatisch zurück auf „verborgen“, weil die Komponente
 * dabei zerstört wird.
 *
 * Die Kontrolle wird als `FormControl` übergeben statt über `ControlValueAccessor`
 * angebunden — das hält die Komponente frei von Zustandsspiegelung und die
 * Validierungsmeldung bleibt Sache des Aufrufers.
 */
@Component({
  selector: 'app-password-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="field">
      <label [for]="inputId" class="form-label">{{ label() }}</label>

      <div class="field__control">
        <input
          [id]="inputId"
          [type]="visible() ? 'text' : 'password'"
          [formControl]="control()"
          [class.is-invalid]="invalid()"
          [attr.autocomplete]="autocomplete()"
          [attr.aria-describedby]="describedBy()"
          class="form-control form-control-lg"
          placeholder="••••••••"
        />

        <button
          type="button"
          class="field__toggle"
          [attr.aria-label]="visible() ? 'Passwort verbergen' : 'Passwort anzeigen'"
          [attr.aria-pressed]="visible()"
          (click)="toggle()"
        >
          <i class="bi" [class.bi-eye]="!visible()" [class.bi-eye-slash]="visible()"></i>
        </button>
      </div>

      @if (invalid() && error()) {
        <p [id]="errorId" class="invalid-feedback">{{ error() }}</p>
      }
      @if (hint() && !invalid()) {
        <p [id]="hintId" class="form-text">{{ hint() }}</p>
      }
    </div>
  `,
  styles: [
    `
      .field__control {
        position: relative;
      }
      .field__control input {
        /* Platz für den Umschalter freihalten, damit lange Passwörter nicht
           unter das Symbol laufen. */
        padding-right: var(--fin-space-12);
      }
      .field__toggle {
        position: absolute;
        top: 50%;
        right: 0.3125rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: var(--fin-touch-min);
        height: var(--fin-touch-min);
        transform: translateY(-50%);
        border: 0;
        border-radius: var(--fin-radius-xs);
        background: none;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-md);
        cursor: pointer;
        transition:
          color var(--fin-duration-fast) var(--fin-ease-out),
          background-color var(--fin-duration-fast) var(--fin-ease-out);
      }
      .field__toggle:hover {
        background-color: var(--fin-surface-hover);
        color: var(--fin-text-strong);
      }
      .field__toggle:focus-visible {
        outline: 2px solid var(--fin-accent);
        outline-offset: -2px;
      }
    `,
  ],
})
export class PasswordFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly label = input('Passwort');
  readonly autocomplete = input('current-password');
  /** Fehlertext; wird nur gezeigt, wenn `invalid` gesetzt ist. */
  readonly error = input('');
  readonly hint = input('');
  /** Der Aufrufer entscheidet, wann ein Fehler sichtbar wird (z. B. erst nach Berührung). */
  readonly invalid = input(false);

  protected readonly visible = signal(false);

  private readonly uid = nextFieldId++;
  protected readonly inputId = `password-field-${this.uid}`;
  protected readonly errorId = `password-field-error-${this.uid}`;
  protected readonly hintId = `password-field-hint-${this.uid}`;

  protected readonly describedBy = computed(() => {
    if (this.invalid() && this.error()) return this.errorId;
    if (this.hint()) return this.hintId;
    return null;
  });

  protected toggle(): void {
    this.visible.update((value) => !value);
  }
}
