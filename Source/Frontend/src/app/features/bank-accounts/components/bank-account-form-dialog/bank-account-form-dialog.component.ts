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
import { BankAccount, BankAccountPayload } from '../../../../core/models/bank-account.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { ColorPickerComponent } from '../../../../shared/components/color-picker/color-picker.component';
import { ACCENT_COLOR_PRESETS } from '../../../../shared/utils/color-presets';
import { formatIban, isValidIbanFormat, normalizeIban } from '../../../../shared/utils/iban.util';
import { parseMoneyInput } from '../../../../shared/utils/money.util';

/** Prüft ein optionales IBAN-Feld auf ein plausibles Format. */
function ibanFormatValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null)?.trim();
  if (!value) return null;
  return isValidIbanFormat(value) ? null : { ibanFormat: true };
}

/** Prüft, ob sich die Eingabe als Geldbetrag interpretieren lässt (`1.234,50` oder `1234.5`). */
function moneyValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null)?.trim();
  if (!value) return { required: true };
  return parseMoneyInput(value) === null ? { money: true } : null;
}

/** Dialog zum Anlegen und Bearbeiten eines Girokontos. */
@Component({
  selector: 'app-bank-account-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ModalDialogComponent, ColorPickerComponent],
  template: `
    <app-modal-dialog
      [title]="isEditMode() ? 'Girokonto bearbeiten' : 'Girokonto hinzufügen'"
      (closed)="cancel()"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        id="bankAccountForm"
        class="d-flex flex-column gap-3"
      >
        <div>
          <label for="accountName" class="form-label">Kontoname</label>
          <input
            type="text"
            id="accountName"
            formControlName="name"
            class="form-control"
            placeholder="z. B. Gehaltskonto"
            autocomplete="off"
            maxlength="200"
            [class.is-invalid]="isInvalid('name')"
            [attr.aria-describedby]="isInvalid('name') ? 'accountNameError' : null"
          />
          @if (isInvalid('name')) {
            <div id="accountNameError" class="invalid-feedback d-block">
              Bitte gib einen Kontonamen an.
            </div>
          }
        </div>

        <div>
          <label for="accountBank" class="form-label">
            Bank <span class="text-muted fw-normal">(optional)</span>
          </label>
          <input
            type="text"
            id="accountBank"
            formControlName="bankName"
            class="form-control"
            placeholder="z. B. Erste Bank"
            autocomplete="off"
            maxlength="200"
          />
        </div>

        <div>
          <label for="accountIban" class="form-label">
            IBAN <span class="text-muted fw-normal">(optional)</span>
          </label>
          <input
            type="text"
            id="accountIban"
            formControlName="iban"
            class="form-control font-monospace"
            placeholder="AT61 1904 3002 3457 3201"
            autocomplete="off"
            spellcheck="false"
            maxlength="42"
            [class.is-invalid]="isInvalid('iban')"
            [attr.aria-describedby]="isInvalid('iban') ? 'accountIbanError' : null"
            (blur)="normalizeIbanField()"
          />
          @if (isInvalid('iban')) {
            <div id="accountIbanError" class="invalid-feedback d-block">
              Diese IBAN hat kein gültiges Format.
            </div>
          }
        </div>

        <div>
          <label for="accountBalance" class="form-label">Aktueller Kontostand</label>
          <div class="input-group" [class.has-validation]="isInvalid('initialBalance')">
            <input
              type="text"
              id="accountBalance"
              formControlName="initialBalance"
              class="form-control text-end"
              inputmode="decimal"
              autocomplete="off"
              placeholder="0,00"
              [class.is-invalid]="isInvalid('initialBalance')"
              [attr.aria-describedby]="
                isInvalid('initialBalance') ? 'accountBalanceError' : 'accountBalanceHint'
              "
            />
            <span class="input-group-text" aria-hidden="true">€</span>
            @if (isInvalid('initialBalance')) {
              <div id="accountBalanceError" class="invalid-feedback">
                Bitte gib einen gültigen Betrag ein, z. B. 1.234,50.
              </div>
            }
          </div>
          <div id="accountBalanceHint" class="form-text">
            @if (isEditMode()) {
              Eine Änderung wirkt sich direkt auf den angezeigten Kontostand aus.
            } @else {
              Der Stand von heute. Spätere Buchungen werden darauf verrechnet.
            }
          </div>
        </div>

        <app-color-picker [value]="form.controls.color.value" (valueChange)="selectColor($event)" />
      </form>

      <div dialogFooter class="d-flex flex-wrap gap-2 justify-content-end w-100">
        <button type="button" class="btn btn-light" [disabled]="saving()" (click)="cancel()">
          Abbrechen
        </button>
        <button type="submit" form="bankAccountForm" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span
              class="spinner-border spinner-border-sm me-1"
              role="status"
              aria-hidden="true"
            ></span>
          }
          {{ isEditMode() ? 'Speichern' : 'Konto anlegen' }}
        </button>
      </div>
    </app-modal-dialog>
  `,
})
export class BankAccountFormDialogComponent implements OnInit {
  /** `null` legt ein neues Konto an, sonst wird das übergebene Konto bearbeitet. */
  readonly account = input<BankAccount | null>(null);
  readonly saving = input(false);

  readonly save = output<BankAccountPayload>();
  readonly cancelled = output<void>();

  protected readonly isEditMode = computed(() => this.account() !== null);

  private readonly fb = inject(FormBuilder);
  private readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    bankName: [''],
    iban: ['', [ibanFormatValidator]],
    initialBalance: ['0,00', [moneyValidator]],
    color: [ACCENT_COLOR_PRESETS[0].value],
  });

  ngOnInit(): void {
    const existing = this.account();
    if (existing) {
      this.form.setValue({
        name: existing.name,
        bankName: existing.bankName ?? '',
        iban: existing.iban ? formatIban(existing.iban) : '',
        initialBalance: existing.initialBalance.toFixed(2).replace('.', ','),
        color: existing.color ?? ACCENT_COLOR_PRESETS[0].value,
      });
    }
  }

  protected selectColor(color: string): void {
    this.form.controls.color.setValue(color);
  }

  /** Formatiert die eingegebene IBAN beim Verlassen des Feldes in Viererblöcke. */
  protected normalizeIbanField(): void {
    const control = this.form.controls.iban;
    const value = control.value.trim();
    if (!value) return;

    control.setValue(formatIban(value));
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

    const { name, bankName, iban, initialBalance, color } = this.form.getRawValue();

    this.save.emit({
      name: name.trim(),
      bankName: bankName.trim() || null,
      iban: iban.trim() ? normalizeIban(iban) : null,
      initialBalance: parseMoneyInput(initialBalance) ?? 0,
      color,
    });
  }
}
