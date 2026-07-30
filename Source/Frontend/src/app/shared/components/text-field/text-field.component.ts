import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

let nextFieldId = 0;

/**
 * Einzeiliges Textfeld mit Beschriftung, Hinweis und Fehlermeldung.
 *
 * Bündelt die Verdrahtung, die sonst in jedem Formular wiederholt würde:
 * `for`/`id`-Paarung, `aria-describedby` auf die jeweils sichtbare Meldung und
 * die einheitliche Reihenfolge Beschriftung → Feld → Meldung. Genau diese
 * Wiederholungen laufen sonst auseinander.
 */
@Component({
  selector: 'app-text-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule],
  template: `
    <div class="field">
      <label [for]="inputId" class="form-label">{{ label() }}</label>

      <input
        [id]="inputId"
        [type]="type()"
        [formControl]="control()"
        [class.is-invalid]="invalid()"
        [class.form-control-lg]="size() === 'lg'"
        [attr.autocomplete]="autocomplete()"
        [attr.inputmode]="inputMode()"
        [attr.placeholder]="placeholder() || null"
        [attr.aria-describedby]="describedBy()"
        class="form-control"
      />

      @if (invalid() && error()) {
        <p [id]="errorId" class="invalid-feedback">{{ error() }}</p>
      }
      @if (hint() && !invalid()) {
        <p [id]="hintId" class="form-text">{{ hint() }}</p>
      }
    </div>
  `,
})
export class TextFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly label = input.required<string>();
  readonly type = input('text');
  readonly size = input<'md' | 'lg'>('md');
  readonly placeholder = input('');
  readonly autocomplete = input<string | null>(null);
  /** Steuert die Bildschirmtastatur auf Mobilgeräten (z. B. `email`, `decimal`). */
  readonly inputMode = input<string | null>(null);
  readonly error = input('');
  readonly hint = input('');
  readonly invalid = input(false);

  private readonly uid = nextFieldId++;
  protected readonly inputId = `text-field-${this.uid}`;
  protected readonly errorId = `text-field-error-${this.uid}`;
  protected readonly hintId = `text-field-hint-${this.uid}`;

  protected readonly describedBy = computed(() => {
    if (this.invalid() && this.error()) return this.errorId;
    if (this.hint()) return this.hintId;
    return null;
  });
}
