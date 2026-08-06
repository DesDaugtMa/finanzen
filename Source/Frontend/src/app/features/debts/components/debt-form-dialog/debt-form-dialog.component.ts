import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Debt, DebtPayload } from '../../../../core/models/debt.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';

/**
 * Dialog zum Anlegen und Bearbeiten eines Schuldeintrags. Es gibt bewusst kein
 * Betragsfeld: Was offen ist, ergibt sich aus den zugeordneten Buchungen.
 */
@Component({
  selector: 'app-debt-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalDialogComponent],
  template: `
    <app-modal-dialog
      [title]="isEditMode() ? 'Eintrag bearbeiten' : 'Schuldeintrag anlegen'"
      (closed)="cancel()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" id="debtForm" class="fin-form">
        <div>
          <label for="debtPersonName" class="form-label">Wer schuldet dir?</label>
          <input
            type="text"
            id="debtPersonName"
            formControlName="personName"
            class="form-control"
            placeholder="z. B. Anna"
            autocomplete="off"
            maxlength="200"
            list="debtPersonSuggestions"
            [class.is-invalid]="isInvalid('personName')"
            [attr.aria-describedby]="
              isInvalid('personName') ? 'debtPersonNameError' : 'debtPersonNameHint'
            "
          />
          <!-- Vorschläge aus bestehenden Einträgen: hält die Schreibweise einer Person
               einheitlich, ohne die freie Eingabe einzuschränken. -->
          <datalist id="debtPersonSuggestions">
            @for (name of knownPersons(); track name) {
              <option [value]="name"></option>
            }
          </datalist>
          @if (isInvalid('personName')) {
            <div id="debtPersonNameError" class="invalid-feedback">Bitte gib einen Namen an.</div>
          } @else {
            <div id="debtPersonNameHint" class="form-text">
              Einträge mit gleichem Namen werden auf der Seite zusammengefasst.
            </div>
          }
        </div>

        <div>
          <label for="debtTitle" class="form-label">Worum geht es?</label>
          <input
            type="text"
            id="debtTitle"
            formControlName="title"
            class="form-control"
            placeholder="z. B. Urlaub Kroatien"
            autocomplete="off"
            maxlength="200"
            [class.is-invalid]="isInvalid('title')"
            [attr.aria-describedby]="isInvalid('title') ? 'debtTitleError' : null"
          />
          @if (isInvalid('title')) {
            <div id="debtTitleError" class="invalid-feedback">Bitte gib eine Bezeichnung an.</div>
          }
        </div>

        <div>
          <label for="debtNote" class="form-label">
            Notiz <span class="form-label__optional">(optional)</span>
          </label>
          <textarea
            id="debtNote"
            formControlName="note"
            class="form-control"
            rows="3"
            maxlength="2000"
            aria-describedby="debtNoteHint"
          ></textarea>
          <div id="debtNoteHint" class="form-text">Zum Beispiel eine vereinbarte Rückzahlung.</div>
        </div>

        <p class="form-text mb-0">
          Beträge trägst du nicht hier ein — du verknüpfst danach die Buchungen deiner
          Geldkonten. So bleibt jeder Betrag durch eine echte Geldbewegung belegt.
        </p>
      </form>

      <div dialogFooter class="fin-dialog-actions">
        <button type="button" class="btn btn-light" [disabled]="saving()" (click)="cancel()">
          Abbrechen
        </button>
        <button type="submit" form="debtForm" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          }
          {{ isEditMode() ? 'Speichern' : 'Eintrag anlegen' }}
        </button>
      </div>
    </app-modal-dialog>
  `,
})
export class DebtFormDialogComponent implements OnInit {
  /** `null` legt einen neuen Eintrag an, sonst wird der übergebene bearbeitet. */
  readonly debt = input<Debt | null>(null);
  /** Bereits erfasste Personen als Eingabevorschlag. */
  readonly knownPersons = input<readonly string[]>([]);
  readonly saving = input(false);

  readonly save = output<DebtPayload>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    personName: ['', [Validators.required, Validators.maxLength(200)]],
    title: ['', [Validators.required, Validators.maxLength(200)]],
    note: [''],
  });

  protected readonly isEditMode = computed(() => this.debt() !== null);

  ngOnInit(): void {
    const existing = this.debt();
    if (!existing) return;

    this.form.setValue({
      personName: existing.personName,
      title: existing.title,
      note: existing.note ?? '',
    });
  }

  protected isInvalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected submit(): void {
    this.submitted.set(true);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();

    this.save.emit({
      personName: value.personName.trim(),
      title: value.title.trim(),
      note: value.note.trim() || null,
    });
  }
}
