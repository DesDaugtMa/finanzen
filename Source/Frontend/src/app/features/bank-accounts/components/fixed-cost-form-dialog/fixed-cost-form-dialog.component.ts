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
import { Category } from '../../../../core/models/category.model';
import { FixedCost, FixedCostPayload } from '../../../../core/models/fixed-cost.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { parseMoneyInput } from '../../../../shared/utils/money.util';
import { formatMonthLong } from '../../../../shared/utils/month.util';

/** Prüft, ob sich die Eingabe als Betrag größer 0 lesen lässt. */
function positiveMoneyValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null)?.trim();
  if (!value) return { required: true };

  const parsed = parseMoneyInput(value);
  if (parsed === null) return { money: true };

  return parsed > 0 ? null : { positive: true };
}

/** Dialog zum Anlegen und Bearbeiten einer Fixkosten-Position. */
@Component({
  selector: 'app-fixed-cost-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalDialogComponent],
  template: `
    <app-modal-dialog
      [title]="isEditMode() ? 'Fixkosten bearbeiten' : 'Fixkosten hinzufügen'"
      (closed)="cancel()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" id="fixedCostForm" class="fin-form">
        <div>
          <label for="fixedCostName" class="form-label">Bezeichnung</label>
          <input
            type="text"
            id="fixedCostName"
            formControlName="name"
            class="form-control"
            placeholder="z. B. Miete"
            autocomplete="off"
            maxlength="200"
            [class.is-invalid]="isInvalid('name')"
            [attr.aria-describedby]="isInvalid('name') ? 'fixedCostNameError' : null"
          />
          @if (isInvalid('name')) {
            <div id="fixedCostNameError" class="invalid-feedback">
              Bitte gib eine Bezeichnung an.
            </div>
          }
        </div>

        <div class="row g-3">
          <div class="col-12 col-sm-6">
            <label for="fixedCostAmount" class="form-label">Betrag pro Monat</label>
            <div class="input-group" [class.has-validation]="isInvalid('amount')">
              <input
                type="text"
                id="fixedCostAmount"
                formControlName="amount"
                class="form-control fin-input-amount"
                inputmode="decimal"
                autocomplete="off"
                placeholder="0,00"
                [class.is-invalid]="isInvalid('amount')"
                [attr.aria-describedby]="isInvalid('amount') ? 'fixedCostAmountError' : null"
              />
              <span class="input-group-text" aria-hidden="true">€</span>
              @if (isInvalid('amount')) {
                <div id="fixedCostAmountError" class="invalid-feedback">
                  Bitte gib einen Betrag größer als 0 ein, z. B. 850,00.
                </div>
              }
            </div>
          </div>

          <div class="col-12 col-sm-6">
            <label for="fixedCostCategory" class="form-label">
              Kategorie <span class="form-label__optional">(optional)</span>
            </label>
            <select id="fixedCostCategory" formControlName="categoryId" class="form-select">
              <option value="">Ohne Kategorie</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select>
          </div>
        </div>

        <div>
          <label for="fixedCostNote" class="form-label">
            Notiz <span class="form-label__optional">(optional)</span>
          </label>
          <textarea
            id="fixedCostNote"
            formControlName="note"
            class="form-control"
            rows="3"
            maxlength="2000"
            aria-describedby="fixedCostNoteHint"
          ></textarea>
          <div id="fixedCostNoteHint" class="form-text">
            Zum Beispiel Vertragsnummer oder Kündigungsfrist.
          </div>
        </div>

        <p class="form-text mb-0">{{ monthHint() }}</p>
      </form>

      <div dialogFooter class="fin-dialog-actions">
        <button type="button" class="btn btn-light" [disabled]="saving()" (click)="cancel()">
          Abbrechen
        </button>
        <button type="submit" form="fixedCostForm" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          }
          {{ isEditMode() ? 'Speichern' : 'Fixkosten anlegen' }}
        </button>
      </div>
    </app-modal-dialog>
  `,
})
export class FixedCostFormDialogComponent implements OnInit {
  /** `null` legt eine neue Position an, sonst wird die übergebene bearbeitet. */
  readonly fixedCost = input<FixedCost | null>(null);
  readonly categories = input.required<Category[]>();
  /** Der Monat, für den die Position gilt. */
  readonly month = input.required<string>();
  readonly saving = input(false);

  readonly save = output<FixedCostPayload>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    amount: ['', [positiveMoneyValidator]],
    categoryId: [''],
    note: [''],
  });

  protected readonly isEditMode = computed(() => this.fixedCost() !== null);

  protected readonly monthHint = computed(
    () =>
      `Diese Fixkosten gelten für ${formatMonthLong(this.month())}. ` +
      'Für andere Monate übernimmst du sie im Fixkosten-Bereich.',
  );

  ngOnInit(): void {
    const existing = this.fixedCost();
    if (!existing) return;

    this.form.setValue({
      name: existing.name,
      amount: existing.amount.toFixed(2).replace('.', ','),
      categoryId: existing.categoryId === null ? '' : String(existing.categoryId),
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
      name: value.name.trim(),
      amount: parseMoneyInput(value.amount) ?? 0,
      categoryId: value.categoryId ? Number(value.categoryId) : null,
      note: value.note.trim() || null,
    });
  }
}
