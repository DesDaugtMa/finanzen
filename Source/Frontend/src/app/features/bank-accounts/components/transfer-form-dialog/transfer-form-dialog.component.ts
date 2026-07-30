import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
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
import { BankAccountApiService } from '../../../../core/services/bank-account-api.service';
import { CategoryApiService } from '../../../../core/services/category-api.service';
import { BankAccount } from '../../../../core/models/bank-account.model';
import { Category } from '../../../../core/models/category.model';
import {
  Transaction,
  TransferDirection,
  TransferPayload,
} from '../../../../core/models/transaction.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { parseMoneyInput } from '../../../../shared/utils/money.util';
import {
  formatMonthLong,
  isValidMonthKey,
  monthKeyOfDate,
  toIsoDate,
} from '../../../../shared/utils/month.util';

function positiveMoneyValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null)?.trim();
  if (!value) return { required: true };

  const parsed = parseMoneyInput(value);
  if (parsed === null) return { money: true };

  return parsed > 0 ? null : { positive: true };
}

/**
 * Dialog für eine Überweisung zwischen zwei Konten. Daraus entsteht ein fest
 * gekoppeltes Buchungspaar: eine Ausgabe auf dem abgebenden und eine Einnahme auf
 * dem empfangenden Konto. Betrag, Bezeichnung und Datum gelten für beide Seiten,
 * die Kategorie lässt sich je Konto getrennt wählen.
 */
@Component({
  selector: 'app-transfer-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalDialogComponent],
  template: `
    <app-modal-dialog
      [title]="isEditMode() ? 'Überweisung bearbeiten' : 'Überweisung erfassen'"
      size="lg"
      (closed)="cancel()"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        id="transferForm"
        class="d-flex flex-column gap-3"
      >
        <fieldset>
          <legend class="form-label mb-2">Richtung</legend>
          <div class="btn-group w-100" role="radiogroup" aria-label="Richtung der Überweisung">
            <button
              type="button"
              class="btn"
              role="radio"
              [class.btn-outline-secondary]="form.controls.direction.value !== 'Outgoing'"
              [class.btn-primary]="form.controls.direction.value === 'Outgoing'"
              [attr.aria-checked]="form.controls.direction.value === 'Outgoing'"
              (click)="selectDirection('Outgoing')"
            >
              <i class="bi bi-box-arrow-up-right me-1" aria-hidden="true"></i> Von diesem Konto
            </button>
            <button
              type="button"
              class="btn"
              role="radio"
              [class.btn-outline-secondary]="form.controls.direction.value !== 'Incoming'"
              [class.btn-primary]="form.controls.direction.value === 'Incoming'"
              [attr.aria-checked]="form.controls.direction.value === 'Incoming'"
              (click)="selectDirection('Incoming')"
            >
              <i class="bi bi-box-arrow-in-down-left me-1" aria-hidden="true"></i> Auf dieses Konto
            </button>
          </div>
        </fieldset>

        <div>
          <label for="trCounterAccount" class="form-label">Gegenkonto</label>
          @if (accountsLoading()) {
            <div class="form-control d-flex align-items-center gap-2 text-muted">
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
              Konten werden geladen …
            </div>
          } @else if (counterAccounts().length === 0) {
            <p class="alert alert-info mb-0">
              Für eine Überweisung brauchst du ein zweites Konto in derselben Währung.
            </p>
          } @else {
            <select
              id="trCounterAccount"
              formControlName="counterAccountId"
              class="form-select"
              [class.is-invalid]="isInvalid('counterAccountId')"
            >
              <option value="">Bitte wählen</option>
              @for (account of counterAccounts(); track account.id) {
                <option [value]="account.id">{{ account.name }}</option>
              }
            </select>
            @if (isInvalid('counterAccountId')) {
              <div class="invalid-feedback d-block">Bitte wähle ein Gegenkonto aus.</div>
            }
          }
        </div>

        <div class="row g-3">
          <div class="col-12 col-sm-6">
            <label for="trAmount" class="form-label">Betrag</label>
            <div class="input-group" [class.has-validation]="isInvalid('amount')">
              <input
                type="text"
                id="trAmount"
                formControlName="amount"
                class="form-control text-end"
                inputmode="decimal"
                autocomplete="off"
                placeholder="0,00"
                [class.is-invalid]="isInvalid('amount')"
              />
              <span class="input-group-text" aria-hidden="true">€</span>
              @if (isInvalid('amount')) {
                <div class="invalid-feedback">Bitte gib einen Betrag größer als 0 ein.</div>
              }
            </div>
          </div>

          <div class="col-12 col-sm-6">
            <label for="trBookingDate" class="form-label">Buchungsdatum</label>
            <input
              type="date"
              id="trBookingDate"
              formControlName="bookingDate"
              class="form-control"
              [class.is-invalid]="isInvalid('bookingDate')"
              (change)="syncAccountingMonth()"
            />
          </div>
        </div>

        <div>
          <label for="trTitle" class="form-label">Bezeichnung</label>
          <input
            type="text"
            id="trTitle"
            formControlName="title"
            class="form-control"
            placeholder="z. B. Umbuchung aufs Sparkonto"
            autocomplete="off"
            maxlength="500"
            [class.is-invalid]="isInvalid('title')"
          />
          @if (isInvalid('title')) {
            <div class="invalid-feedback d-block">Bitte gib eine Bezeichnung an.</div>
          }
        </div>

        <div>
          <label for="trAccountingMonth" class="form-label">Abrechnungsmonat</label>
          <input
            type="month"
            id="trAccountingMonth"
            formControlName="accountingMonth"
            class="form-control"
            aria-describedby="trAccountingMonthHint"
            [class.is-invalid]="isInvalid('accountingMonth')"
          />
          <div id="trAccountingMonthHint" class="form-text">
            Gilt für beide Buchungen — standardmäßig {{ suggestedMonthLabel() }}.
          </div>
        </div>

        <div class="row g-3">
          <div class="col-12 col-sm-6">
            <label for="trCategory" class="form-label">
              Kategorie auf diesem Konto <span class="text-muted fw-normal">(optional)</span>
            </label>
            <select id="trCategory" formControlName="categoryId" class="form-select">
              <option value="">Ohne Kategorie</option>
              @for (category of categories(); track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select>
          </div>

          <div class="col-12 col-sm-6">
            <label for="trCounterCategory" class="form-label">
              Kategorie auf dem Gegenkonto <span class="text-muted fw-normal">(optional)</span>
            </label>
            <select
              id="trCounterCategory"
              formControlName="counterCategoryId"
              class="form-select"
              [disabled]="counterCategoriesLoading() || counterCategories().length === 0"
            >
              <option value="">Ohne Kategorie</option>
              @for (category of counterCategories(); track category.id) {
                <option [value]="category.id">{{ category.name }}</option>
              }
            </select>
            @if (counterCategoriesLoading()) {
              <div class="form-text">Kategorien des Gegenkontos werden geladen …</div>
            }
          </div>
        </div>

        <details class="details-block" [open]="hasNote()">
          <summary class="details-summary">Weitere Details</summary>

          <div class="pt-3 d-flex flex-column gap-3">
            <div>
              <label for="trPurchaseDate" class="form-label">
                Kaufdatum <span class="text-muted fw-normal">(optional)</span>
              </label>
              <input
                type="date"
                id="trPurchaseDate"
                formControlName="purchaseDate"
                class="form-control"
              />
            </div>

            <div>
              <label for="trNote" class="form-label">
                Notiz <span class="text-muted fw-normal">(optional)</span>
              </label>
              <textarea
                id="trNote"
                formControlName="note"
                class="form-control"
                rows="3"
                maxlength="2000"
              ></textarea>
            </div>
          </div>
        </details>
      </form>

      <div dialogFooter class="d-flex flex-wrap gap-2 justify-content-end w-100">
        <button type="button" class="btn btn-light" [disabled]="saving()" (click)="cancel()">
          Abbrechen
        </button>
        <button
          type="submit"
          form="transferForm"
          class="btn btn-primary"
          [disabled]="saving() || counterAccounts().length === 0"
        >
          @if (saving()) {
            <span
              class="spinner-border spinner-border-sm me-1"
              role="status"
              aria-hidden="true"
            ></span>
          }
          {{ isEditMode() ? 'Speichern' : 'Überweisung erfassen' }}
        </button>
      </div>
    </app-modal-dialog>
  `,
  styles: [
    `
      .details-block {
        border-top: 1px solid var(--bs-border-color-translucent);
        padding-top: 0.75rem;
      }
      .details-summary {
        cursor: pointer;
        font-weight: 600;
        min-height: 2.25rem;
        display: flex;
        align-items: center;
      }
      .details-summary:focus-visible {
        outline: 2px solid var(--bs-primary);
        outline-offset: 2px;
        border-radius: 0.25rem;
      }
    `,
  ],
})
export class TransferFormDialogComponent implements OnInit {
  /** `null` erfasst eine neue Überweisung, sonst wird das übergebene Paar bearbeitet. */
  readonly transaction = input<Transaction | null>(null);
  readonly accountId = input.required<number>();
  readonly currency = input.required<string>();
  readonly categories = input.required<Category[]>();
  readonly month = input.required<string>();
  readonly saving = input(false);

  readonly save = output<TransferPayload>();
  readonly cancelled = output<void>();

  private readonly fb = inject(FormBuilder);
  private readonly bankAccountApi = inject(BankAccountApiService);
  private readonly categoryApi = inject(CategoryApiService);
  private readonly submitted = signal(false);

  protected readonly accounts = signal<BankAccount[]>([]);
  protected readonly accountsLoading = signal(true);
  protected readonly counterCategories = signal<Category[]>([]);
  protected readonly counterCategoriesLoading = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    direction: ['Outgoing' as TransferDirection, [Validators.required]],
    counterAccountId: ['', [Validators.required]],
    amount: ['', [positiveMoneyValidator]],
    title: ['', [Validators.required, Validators.maxLength(500)]],
    bookingDate: ['', [Validators.required]],
    purchaseDate: [''],
    accountingMonth: ['', [Validators.required]],
    note: [''],
    categoryId: [''],
    counterCategoryId: [''],
  });

  protected readonly isEditMode = computed(() => this.transaction() !== null);
  protected readonly suggestedMonthLabel = computed(() => formatMonthLong(this.month()));
  protected readonly hasNote = computed(() =>
    Boolean(this.transaction()?.note || this.transaction()?.purchaseDate),
  );

  /** Nur eigene Konten in derselben Währung — andere lehnt das Backend ohnehin ab. */
  protected readonly counterAccounts = computed(() =>
    this.accounts().filter(
      (account) => account.id !== this.accountId() && account.currency === this.currency(),
    ),
  );

  private readonly counterAccountId = toSignal(this.form.controls.counterAccountId.valueChanges, {
    initialValue: '',
  });

  constructor() {
    // Die Kategorien des Gegenkontos hängen an der Auswahl und werden bei jedem Wechsel neu geladen.
    effect(() => {
      const value = this.counterAccountId();
      const id = value ? Number(value) : null;

      if (id === null) {
        this.counterCategories.set([]);
        return;
      }

      this.loadCounterCategories(id);
    });
  }

  ngOnInit(): void {
    this.loadAccounts();

    const existing = this.transaction();

    if (existing) {
      this.form.patchValue({
        // Eine Ausgabe auf diesem Konto bedeutet: Das Geld verlässt dieses Konto.
        direction: existing.type === 'Expense' ? 'Outgoing' : 'Incoming',
        counterAccountId:
          existing.counterAccountId === null ? '' : String(existing.counterAccountId),
        amount: existing.amount.toFixed(2).replace('.', ','),
        title: existing.title,
        bookingDate: existing.bookingDate,
        purchaseDate: existing.purchaseDate ?? '',
        accountingMonth: existing.accountingMonth,
        note: existing.note ?? '',
        categoryId: existing.categoryId === null ? '' : String(existing.categoryId),
        counterCategoryId:
          existing.counterCategoryId === null ? '' : String(existing.counterCategoryId),
      });
      return;
    }

    const today = new Date();
    const bookingDate =
      monthKeyOfDate(toIsoDate(today)) === this.month() ? toIsoDate(today) : `${this.month()}-01`;

    this.form.patchValue({ bookingDate, accountingMonth: this.month() });
  }

  protected selectDirection(direction: TransferDirection): void {
    this.form.controls.direction.setValue(direction);
  }

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
      counterAccountId: Number(value.counterAccountId),
      direction: value.direction,
      amount: parseMoneyInput(value.amount) ?? 0,
      title: value.title.trim(),
      bookingDate: value.bookingDate,
      purchaseDate: value.purchaseDate || null,
      accountingMonth: value.accountingMonth,
      note: value.note.trim() || null,
      categoryId: value.categoryId ? Number(value.categoryId) : null,
      counterCategoryId: value.counterCategoryId ? Number(value.counterCategoryId) : null,
    });
  }

  private loadAccounts(): void {
    this.accountsLoading.set(true);

    this.bankAccountApi.list().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.accountsLoading.set(false);
      },
      error: () => {
        this.accounts.set([]);
        this.accountsLoading.set(false);
      },
    });
  }

  private loadCounterCategories(accountId: number): void {
    this.counterCategoriesLoading.set(true);

    this.categoryApi.list(accountId).subscribe({
      next: (categories) => {
        this.counterCategories.set(categories);
        this.counterCategoriesLoading.set(false);
      },
      error: () => {
        this.counterCategories.set([]);
        this.counterCategoriesLoading.set(false);
      },
    });
  }
}
