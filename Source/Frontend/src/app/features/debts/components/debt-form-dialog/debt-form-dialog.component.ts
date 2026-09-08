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
import { toSignal } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Debt, DebtPayload } from '../../../../core/models/debt.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { parseMoneyInput } from '../../../../shared/utils/money.util';
import { toIsoDate } from '../../../../shared/utils/month.util';

/**
 * Der Startbetrag ist freiwillig: leer ist gültig. Steht aber etwas darin, muss es ein
 * Betrag größer 0 sein — eine unlesbare Eingabe stillschweigend zu verwerfen wäre
 * schlimmer als sie abzuweisen.
 */
function optionalPositiveMoneyValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null)?.trim();
  if (!value) return null;

  const parsed = parseMoneyInput(value);
  if (parsed === null) return { money: true };

  return parsed > 0 ? null : { positive: true };
}

/**
 * Dialog zum Anlegen und Bearbeiten eines Schuldeintrags.
 *
 * Beim Anlegen steht ein optionaler Startbetrag zur Verfügung — der häufigste Fall ist
 * „ich habe gerade jemandem etwas geliehen“, und der soll nicht zwei Dialoge kosten. Beim
 * Bearbeiten fehlt das Feld: dann gibt es bereits Positionen, und ein zweites Betragsfeld
 * daneben wäre nicht mehr eindeutig zuzuordnen.
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

        @if (!isEditMode()) {
          <div class="row g-3">
            <div class="col-12 col-sm-6">
              <label for="debtInitialAmount" class="form-label">
                Betrag <span class="form-label__optional">(optional)</span>
              </label>
              <div class="input-group" [class.has-validation]="isInvalid('initialAmount')">
                <input
                  type="text"
                  id="debtInitialAmount"
                  formControlName="initialAmount"
                  class="form-control fin-input-amount"
                  inputmode="decimal"
                  autocomplete="off"
                  placeholder="0,00"
                  [class.is-invalid]="isInvalid('initialAmount')"
                  [attr.aria-describedby]="
                    isInvalid('initialAmount') ? 'debtInitialAmountError' : 'debtInitialAmountHint'
                  "
                />
                <span class="input-group-text" aria-hidden="true">€</span>
                @if (isInvalid('initialAmount')) {
                  <div id="debtInitialAmountError" class="invalid-feedback">
                    Bitte gib einen Betrag größer als 0 ein, z. B. 50,00.
                  </div>
                }
              </div>
              @if (!isInvalid('initialAmount')) {
                <div id="debtInitialAmountHint" class="form-text">
                  Was du geliehen hast. Kannst du auch später erfassen.
                </div>
              }
            </div>

            <div class="col-12 col-sm-6">
              <label for="debtInitialDate" class="form-label">Datum</label>
              <input
                type="date"
                id="debtInitialDate"
                formControlName="initialDate"
                class="form-control"
                aria-describedby="debtInitialDateHint"
              />
              <div id="debtInitialDateHint" class="form-text">Wann das Geld geflossen ist.</div>
            </div>
          </div>
        }

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

        <p class="form-text mb-0">{{ amountHint() }}</p>
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
    initialAmount: ['', optionalPositiveMoneyValidator],
    initialDate: [toIsoDate(new Date()), Validators.required],
  });

  protected readonly isEditMode = computed(() => this.debt() !== null);

  /** Die Änderungen des Formulars als Signal — nur der Startbetrag wird beobachtet. */
  private readonly initialAmountValue = toSignal(this.form.controls.initialAmount.valueChanges, {
    initialValue: this.form.controls.initialAmount.value,
  });

  protected readonly hasInitialAmount = computed(() => this.initialAmountValue().trim().length > 0);

  /**
   * Der Schlusssatz erklärt, wie es weitergeht — und zwar unterschiedlich, je nachdem ob
   * der Nutzer schon einen Betrag getippt hat.
   */
  protected readonly amountHint = computed(() => {
    if (this.isEditMode()) {
      return 'Beträge pflegst du direkt am Eintrag — als manuelle Position oder über eine verknüpfte Buchung.';
    }

    return this.hasInitialAmount()
      ? 'Der Betrag wird als verliehen erfasst. Rückzahlungen trägst du danach am Eintrag nach.'
      : 'Ohne Betrag entsteht nur der Eintrag. Beträge kannst du danach jederzeit erfassen oder eine Buchung verknüpfen.';
  });

  ngOnInit(): void {
    const existing = this.debt();
    if (!existing) return;

    this.form.patchValue({
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

    // Der Startbetrag gilt nur beim Anlegen. Beim Bearbeiten wird er gar nicht erst
    // gesendet, damit ein alter Formularwert nicht versehentlich eine Position erzeugt.
    const initialAmount =
      this.isEditMode() || !value.initialAmount.trim()
        ? null
        : parseMoneyInput(value.initialAmount);

    this.save.emit({
      personName: value.personName.trim(),
      title: value.title.trim(),
      note: value.note.trim() || null,
      initialAmount,
      initialDate: initialAmount === null ? null : value.initialDate,
    });
  }
}
