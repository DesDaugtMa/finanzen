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
import { Category } from '../../../../core/models/category.model';
import {
  Transaction,
  TransactionPayload,
  TransactionType,
} from '../../../../core/models/transaction.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { formatMoney, parseMoneyInput } from '../../../../shared/utils/money.util';
import {
  formatMonthLong,
  isValidMonthKey,
  monthKeyOfDate,
  toIsoDate,
} from '../../../../shared/utils/month.util';

/** Prüft, ob sich die Eingabe als Betrag größer 0 lesen lässt. */
function positiveMoneyValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null)?.trim();
  if (!value) return { required: true };

  const parsed = parseMoneyInput(value);
  if (parsed === null) return { money: true };

  return parsed > 0 ? null : { positive: true };
}

/** Dialog zum Erfassen und Bearbeiten einer Buchung. */
@Component({
  selector: 'app-transaction-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalDialogComponent],
  template: `
    <app-modal-dialog
      [title]="isEditMode() ? 'Buchung bearbeiten' : 'Buchung erfassen'"
      size="lg"
      (closed)="cancel()"
    >
      <form [formGroup]="form" (ngSubmit)="submit()" id="transactionForm" class="fin-form">
        <fieldset>
          <legend class="form-label mb-2">Art der Buchung</legend>
          <div class="btn-group w-100" role="radiogroup" aria-label="Art der Buchung">
            <button
              type="button"
              class="btn"
              role="radio"
              [class.btn-outline-secondary]="form.controls.type.value !== 'Expense'"
              [class.btn-danger]="form.controls.type.value === 'Expense'"
              [attr.aria-checked]="form.controls.type.value === 'Expense'"
              [disabled]="lockedType()"
              (click)="selectType('Expense')"
            >
              <i class="bi bi-arrow-up-right me-1" aria-hidden="true"></i> Ausgabe
            </button>
            <button
              type="button"
              class="btn"
              role="radio"
              [class.btn-outline-secondary]="form.controls.type.value !== 'Income'"
              [class.btn-success]="form.controls.type.value === 'Income'"
              [attr.aria-checked]="form.controls.type.value === 'Income'"
              [disabled]="lockedType()"
              (click)="selectType('Income')"
            >
              <i class="bi bi-arrow-down-left me-1" aria-hidden="true"></i> Einnahme
            </button>
          </div>
          @if (lockedType()) {
            <div class="form-text">
              Diese Buchung gehört zu einer Überweisung. Die Richtung lässt sich nur im
              Überweisungs-Dialog ändern.
            </div>
          }
        </fieldset>

        <div class="row g-3">
          <div class="col-12 col-sm-6">
            <label for="txAmount" class="form-label">Betrag</label>
            <div class="input-group" [class.has-validation]="isInvalid('amount')">
              <input
                type="text"
                id="txAmount"
                formControlName="amount"
                class="form-control fin-input-amount"
                inputmode="decimal"
                autocomplete="off"
                placeholder="0,00"
                [class.is-invalid]="isInvalid('amount')"
                [attr.aria-describedby]="isInvalid('amount') ? 'txAmountError' : null"
              />
              <span class="input-group-text" aria-hidden="true">€</span>
              @if (isInvalid('amount')) {
                <div id="txAmountError" class="invalid-feedback">
                  Bitte gib einen Betrag größer als 0 ein, z. B. 24,90.
                </div>
              }
            </div>
          </div>

          <div class="col-12 col-sm-6">
            <label for="txCategory" class="form-label">
              Kategorie <span class="form-label__optional">(optional)</span>
            </label>
            <select id="txCategory" formControlName="categoryId" class="form-select">
              <option value="">Ohne Kategorie</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select>
          </div>
        </div>

        <div>
          <label for="txTitle" class="form-label">Bezeichnung</label>
          <input
            type="text"
            id="txTitle"
            formControlName="title"
            class="form-control"
            placeholder="z. B. Wocheneinkauf"
            autocomplete="off"
            maxlength="500"
            [class.is-invalid]="isInvalid('title')"
            [attr.aria-describedby]="isInvalid('title') ? 'txTitleError' : null"
          />
          @if (isInvalid('title')) {
            <div id="txTitleError" class="invalid-feedback">Bitte gib eine Bezeichnung an.</div>
          }
        </div>

        <div>
          <label for="txBookingDate" class="form-label">Buchungsdatum</label>
          <input
            type="date"
            id="txBookingDate"
            formControlName="bookingDate"
            class="form-control"
            [class.is-invalid]="isInvalid('bookingDate')"
            (change)="syncAccountingMonth()"
          />
          @if (isInvalid('bookingDate')) {
            <div class="invalid-feedback">Bitte gib ein Buchungsdatum an.</div>
          }
        </div>

        <div>
          <label for="txAccountingMonth" class="form-label">Abrechnungsmonat</label>
          <input
            type="month"
            id="txAccountingMonth"
            formControlName="accountingMonth"
            class="form-control"
            [class.is-invalid]="isInvalid('accountingMonth')"
            aria-describedby="txAccountingMonthHint"
          />
          <div id="txAccountingMonthHint" class="form-text">
            Bestimmt, in welcher Monatsübersicht die Buchung erscheint — standardmäßig
            {{ suggestedMonthLabel() }}.
          </div>
          @if (isInvalid('accountingMonth')) {
            <div class="invalid-feedback">Bitte gib einen gültigen Monat an.</div>
          }
        </div>

        <details class="fin-details" [open]="hasDetails()">
          <summary class="fin-details__summary">Weitere Details</summary>

          <div class="fin-form fin-details__body">
            <div>
              <label for="txPurchaseDate" class="form-label">
                Kaufdatum <span class="form-label__optional">(optional)</span>
              </label>
              <input
                type="date"
                id="txPurchaseDate"
                formControlName="purchaseDate"
                class="form-control"
              />
              <div class="form-text">
                Falls der Kauf vor der Buchung lag, z. B. bei Kartenzahlungen.
              </div>
            </div>

            <div>
              <label for="txNote" class="form-label">
                Notiz <span class="form-label__optional">(optional)</span>
              </label>
              <textarea
                id="txNote"
                formControlName="note"
                class="form-control"
                rows="3"
                maxlength="2000"
              ></textarea>
            </div>
          </div>
        </details>

        @if (budgetWarning(); as warning) {
          <div class="alert alert-warning budget-warning" role="status">
            <i class="bi bi-exclamation-triangle budget-warning__icon" aria-hidden="true"></i>
            <span>{{ warning }}</span>
          </div>
        }
      </form>

      <div dialogFooter class="fin-dialog-actions">
        <button type="button" class="btn btn-light" [disabled]="saving()" (click)="cancel()">
          Abbrechen
        </button>
        <button type="submit" form="transactionForm" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
          }
          {{ isEditMode() ? 'Speichern' : 'Buchung erfassen' }}
        </button>
      </div>
    </app-modal-dialog>
  `,
  styles: [
    `
      /* Der ausklappbare Bereich kommt aus der globalen Muster-Schicht
         (.fin-details) — er wird hier und im Überweisungsdialog identisch
         gebraucht. */
      fieldset {
        min-width: 0;
        margin: 0;
        padding: 0;
        border: 0;
      }
      legend.form-label {
        float: none;
        width: auto;
        padding: 0;
      }
      .budget-warning {
        display: flex;
        align-items: flex-start;
        gap: var(--fin-space-2);
        margin-bottom: 0;
      }
      .budget-warning__icon {
        flex-shrink: 0;
        margin-top: 0.15rem;
      }
    `,
  ],
})
export class TransactionFormDialogComponent implements OnInit {
  /** `null` erfasst eine neue Buchung, sonst wird die übergebene bearbeitet. */
  readonly transaction = input<Transaction | null>(null);
  readonly categories = input.required<Category[]>();
  /** Vorbelegter Abrechnungsmonat — der gerade angezeigte Monat. */
  readonly month = input.required<string>();
  readonly currency = input.required<string>();
  readonly saving = input(false);
  /** Restbudget je Kategorie, um vor einer Überschreitung zu warnen. */
  readonly remainingByCategory = input<ReadonlyMap<number, number>>(new Map());

  readonly save = output<TransactionPayload>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    type: ['Expense' as TransactionType, [Validators.required]],
    amount: ['', [positiveMoneyValidator]],
    title: ['', [Validators.required, Validators.maxLength(500)]],
    categoryId: [''],
    bookingDate: ['', [Validators.required]],
    purchaseDate: [''],
    accountingMonth: ['', [Validators.required]],
    note: [''],
  });

  protected readonly isEditMode = computed(() => this.transaction() !== null);

  /** Bei einer Überweisung darf die Richtung hier nicht gedreht werden. */
  protected readonly lockedType = computed(() => this.transaction()?.isTransfer === true);

  protected readonly suggestedMonthLabel = computed(() => formatMonthLong(this.month()));

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly hasDetails = computed(() => {
    const existing = this.transaction();
    return Boolean(existing?.purchaseDate || existing?.note);
  });

  /**
   * Hinweis, wenn die Buchung das Budget der gewählten Kategorie sprengt. Rein
   * informativ — gespeichert wird trotzdem, die Entscheidung bleibt beim Nutzer.
   */
  protected readonly budgetWarning = computed(() => {
    const value = this.formValue();
    if (value.type !== 'Expense' || !value.categoryId) return '';

    const remaining = this.remainingByCategory().get(Number(value.categoryId));
    if (remaining === undefined) return '';

    const amount = parseMoneyInput(value.amount ?? '');
    if (amount === null || amount <= 0) return '';

    // Der bereits gebuchte Betrag zählt beim Bearbeiten nicht doppelt.
    const previous = this.transaction();
    const alreadyCounted =
      previous && previous.type === 'Expense' && previous.categoryId === Number(value.categoryId)
        ? previous.amount
        : 0;

    const overrun = Math.round((amount - alreadyCounted - remaining) * 100) / 100;
    if (overrun <= 0) return '';

    return `Diese Buchung überschreitet das Budget der Kategorie um ${formatMoney(overrun, this.currency())}.`;
  });

  ngOnInit(): void {
    const existing = this.transaction();

    if (existing) {
      this.form.setValue({
        type: existing.type,
        amount: existing.amount.toFixed(2).replace('.', ','),
        title: existing.title,
        categoryId: existing.categoryId === null ? '' : String(existing.categoryId),
        bookingDate: existing.bookingDate,
        purchaseDate: existing.purchaseDate ?? '',
        accountingMonth: existing.accountingMonth,
        note: existing.note ?? '',
      });
      return;
    }

    // Neue Buchungen liegen standardmäßig im angezeigten Monat: heute, wenn der
    // Monat der laufende ist, sonst der Monatserste.
    const today = new Date();
    const bookingDate =
      monthKeyOfDate(toIsoDate(today)) === this.month() ? toIsoDate(today) : `${this.month()}-01`;

    this.form.patchValue({ bookingDate, accountingMonth: this.month() });
  }

  protected selectType(type: TransactionType): void {
    this.form.controls.type.setValue(type);
  }

  /** Beim Ändern des Buchungsdatums folgt der Abrechnungsmonat, solange er nicht bewusst abweicht. */
  protected syncAccountingMonth(): void {
    const bookingDate = this.form.controls.bookingDate.value;
    if (!bookingDate) return;

    const control = this.form.controls.accountingMonth;
    if (control.dirty && control.value !== this.month()) return;

    control.setValue(monthKeyOfDate(bookingDate));
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

    if (!isValidMonthKey(value.accountingMonth)) {
      this.form.controls.accountingMonth.setErrors({ month: true });
      return;
    }

    this.save.emit({
      type: value.type,
      amount: parseMoneyInput(value.amount) ?? 0,
      title: value.title.trim(),
      categoryId: value.categoryId ? Number(value.categoryId) : null,
      bookingDate: value.bookingDate,
      purchaseDate: value.purchaseDate || null,
      accountingMonth: value.accountingMonth,
      note: value.note.trim() || null,
    });
  }
}
