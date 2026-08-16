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
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  Debt,
  DebtEntry,
  DebtEntryPayload,
  DebtTransactionDirection,
} from '../../../../core/models/debt.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { parseMoneyInput } from '../../../../shared/utils/money.util';
import { toIsoDate } from '../../../../shared/utils/month.util';

/** Prüft, ob sich die Eingabe als Betrag größer 0 lesen lässt. */
function positiveMoneyValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null)?.trim();
  if (!value) return { required: true };

  const parsed = parseMoneyInput(value);
  if (parsed === null) return { money: true };

  return parsed > 0 ? null : { positive: true };
}

/**
 * Dialog für einen manuell erfassten Betrag — Geld, zu dem es keine Buchung auf einem
 * Geldkonto gibt: Bargeld, ein fremdes Konto, ein Vorgang von früher.
 *
 * Die Richtung steht ganz oben und als gefüllte Schaltfläche, nicht als Auswahlliste: sie
 * entscheidet, ob der offene Betrag steigt oder sinkt, und ist damit die folgenreichste
 * Angabe des Formulars. Ein Währungsfeld gibt es bewusst nicht — die Position läuft immer
 * in der Währung ihres Eintrags.
 */
@Component({
  selector: 'app-debt-entry-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalDialogComponent],
  template: `
    <app-modal-dialog [title]="dialogTitle()" (closed)="cancel()">
      <form [formGroup]="form" (ngSubmit)="submit()" id="debtEntryForm" class="fin-form">
        <p class="fin-dialog-lead">{{ lead() }}</p>

        <fieldset>
          <legend class="form-label mb-2">Art des Betrags</legend>
          <div class="btn-group w-100" role="radiogroup" aria-label="Art des Betrags">
            <button
              type="button"
              class="btn"
              role="radio"
              [class.btn-outline-secondary]="form.controls.direction.value !== 'Expense'"
              [class.btn-danger]="form.controls.direction.value === 'Expense'"
              [attr.aria-checked]="form.controls.direction.value === 'Expense'"
              (click)="selectDirection('Expense')"
            >
              <i class="bi bi-arrow-up-right me-1" aria-hidden="true"></i> Verliehen
            </button>
            <button
              type="button"
              class="btn"
              role="radio"
              [class.btn-outline-secondary]="form.controls.direction.value !== 'Income'"
              [class.btn-success]="form.controls.direction.value === 'Income'"
              [attr.aria-checked]="form.controls.direction.value === 'Income'"
              (click)="selectDirection('Income')"
            >
              <i class="bi bi-arrow-down-left me-1" aria-hidden="true"></i> Zurückgezahlt
            </button>
          </div>
          <div class="form-text">{{ directionHint() }}</div>
        </fieldset>

        <div class="row g-3">
          <div class="col-12 col-sm-6">
            <label for="debtEntryAmount" class="form-label">Betrag</label>
            <div class="input-group" [class.has-validation]="isInvalid('amount')">
              <input
                type="text"
                id="debtEntryAmount"
                formControlName="amount"
                class="form-control fin-input-amount"
                inputmode="decimal"
                autocomplete="off"
                placeholder="0,00"
                [class.is-invalid]="isInvalid('amount')"
                [attr.aria-describedby]="isInvalid('amount') ? 'debtEntryAmountError' : null"
              />
              <span class="input-group-text" aria-hidden="true">€</span>
              @if (isInvalid('amount')) {
                <div id="debtEntryAmountError" class="invalid-feedback">
                  Bitte gib einen Betrag größer als 0 ein, z. B. 50,00.
                </div>
              }
            </div>
          </div>

          <div class="col-12 col-sm-6">
            <label for="debtEntryDate" class="form-label">Datum</label>
            <input
              type="date"
              id="debtEntryDate"
              formControlName="entryDate"
              class="form-control"
              [class.is-invalid]="isInvalid('entryDate')"
              [attr.aria-describedby]="
                isInvalid('entryDate') ? 'debtEntryDateError' : 'debtEntryDateHint'
              "
            />
            @if (isInvalid('entryDate')) {
              <div id="debtEntryDateError" class="invalid-feedback">Bitte gib ein Datum an.</div>
            } @else {
              <div id="debtEntryDateHint" class="form-text">Wann das Geld geflossen ist.</div>
            }
          </div>
        </div>

        <div>
          <label for="debtEntryNote" class="form-label">
            Notiz <span class="form-label__optional">(optional)</span>
          </label>
          <input
            type="text"
            id="debtEntryNote"
            formControlName="note"
            class="form-control"
            placeholder="z. B. bar übergeben"
            autocomplete="off"
            maxlength="2000"
            aria-describedby="debtEntryNoteHint"
          />
          <div id="debtEntryNoteHint" class="form-text">Woran du dich später erinnern willst.</div>
        </div>

        <p class="form-text mb-0">
          Ein manueller Betrag verändert keinen Kontostand — er zählt nur in dieser
          Schuldnerrechnung mit.
        </p>
      </form>

      <div dialogFooter class="fin-dialog-actions">
        <button type="button" class="btn btn-light" [disabled]="saving()" (click)="cancel()">
          Abbrechen
        </button>
        <button type="submit" form="debtEntryForm" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          }
          {{ isEditMode() ? 'Speichern' : 'Betrag erfassen' }}
        </button>
      </div>
    </app-modal-dialog>
  `,
  styles: [
    `
      .fin-dialog-lead {
        margin: 0;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
      }
    `,
  ],
})
export class DebtEntryFormDialogComponent implements OnInit {
  /** Der Eintrag, zu dem der Betrag gehört — nur für die Beschriftung. */
  readonly debt = input.required<Debt>();
  /** `null` erfasst einen neuen Betrag, sonst wird der übergebene bearbeitet. */
  readonly entry = input<DebtEntry | null>(null);
  readonly saving = input(false);

  readonly save = output<DebtEntryPayload>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    direction: ['Expense' as DebtTransactionDirection, Validators.required],
    amount: ['', positiveMoneyValidator],
    entryDate: [toIsoDate(new Date()), Validators.required],
    note: [''],
  });

  protected readonly isEditMode = computed(() => this.entry() !== null);

  protected readonly dialogTitle = computed(() =>
    this.isEditMode() ? 'Betrag bearbeiten' : 'Betrag erfassen',
  );

  protected readonly lead = computed(
    () => `Für den Eintrag „${this.debt().title}“ von ${this.debt().personName}.`,
  );

  /**
   * Die Richtung wird in Zahlen erklärt, nicht in Fachbegriffen: „steigt“ und „sinkt“
   * sagt dem Nutzer unmittelbar, was seine Wahl mit dem offenen Betrag macht.
   */
  protected readonly directionHint = computed(() =>
    this.form.controls.direction.value === 'Expense'
      ? 'Geliehenes Geld — der offene Betrag steigt.'
      : 'Eine Rückzahlung — der offene Betrag sinkt.',
  );

  ngOnInit(): void {
    const existing = this.entry();
    if (!existing) return;

    this.form.setValue({
      direction: existing.direction,
      // Als deutsche Eingabe zurückgeschrieben, damit der Wert genauso aussieht,
      // wie der Nutzer ihn erfasst hat.
      amount: existing.amount.toFixed(2).replace('.', ','),
      entryDate: existing.entryDate,
      note: existing.note ?? '',
    });
  }

  protected isInvalid(field: keyof typeof this.form.controls): boolean {
    const control = this.form.controls[field];
    return control.invalid && (control.touched || this.submitted());
  }

  protected selectDirection(direction: DebtTransactionDirection): void {
    this.form.controls.direction.setValue(direction);
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
      direction: value.direction,
      // Der Validator hat den Wert bereits geprüft; die 0 ist nur der Typ-Abschluss.
      amount: parseMoneyInput(value.amount) ?? 0,
      entryDate: value.entryDate,
      note: value.note.trim() || null,
    });
  }
}
