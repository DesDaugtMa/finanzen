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
import { AccountType } from '../../../../core/models/balance.model';
import { Category } from '../../../../core/models/category.model';
import { FixedCost } from '../../../../core/models/fixed-cost.model';
import {
  LinkedTransaction,
  Transaction,
  TransactionPayload,
  TransactionType,
} from '../../../../core/models/transaction.model';
import { TransactionApiService } from '../../../../core/services/transaction-api.service';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { formatMoney, parseMoneyInput } from '../../../../shared/utils/money.util';
import {
  formatDate,
  formatMonthLong,
  isValidMonthKey,
  monthKeyOfDate,
  toIsoDate,
} from '../../../../shared/utils/month.util';
import { LinkTransactionDialogComponent } from '../link-transaction-dialog/link-transaction-dialog.component';
import { LinkedTransactionDialogComponent } from '../linked-transaction-dialog/linked-transaction-dialog.component';

/** Prüft, ob sich die Eingabe als Betrag größer 0 lesen lässt. */
function positiveMoneyValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value as string | null)?.trim();
  if (!value) return { required: true };

  const parsed = parseMoneyInput(value);
  if (parsed === null) return { money: true };

  return parsed > 0 ? null : { positive: true };
}

/**
 * Das Ergebnis des Dialogs. Beim Anlegen kann eine Verknüpfung schon gewählt sein,
 * obwohl es die Buchung noch gar nicht gibt — sie wird deshalb erst nach dem Speichern
 * gesetzt, und der Aufrufer erfährt hier, mit welcher Buchung.
 */
export interface TransactionFormResult {
  payload: TransactionPayload;
  /** Nur beim Anlegen gesetzt; beim Bearbeiten läuft das Verknüpfen sofort. */
  linkTo: number | null;
}

/** Welcher Inhalt gerade im Dialog steht. */
type View = 'form' | 'picker' | 'details';

/**
 * Dialog zum Erfassen und Bearbeiten einer Buchung, einschließlich ihrer Verknüpfung
 * mit einer Buchung eines anderen Kontos.
 *
 * Auswahl und Detailansicht der Verknüpfung ersetzen den Formularinhalt, statt als
 * zweiter Dialog darüber zu liegen: Zwei gleichzeitig offene modale Ebenen würden sich
 * Fokus-Falle und Escape-Taste teilen und wären mit der Tastatur nicht mehr sauber zu
 * bedienen. Das Formular bleibt dabei erhalten — nur die Ansicht wechselt.
 */
@Component({
  selector: 'app-transaction-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalDialogComponent,
    LinkTransactionDialogComponent,
    LinkedTransactionDialogComponent,
  ],
  template: `
    @if (view() === 'picker') {
      <app-link-transaction-dialog
        [accountId]="accountId()"
        [currency]="currency()"
        [type]="form.controls.type.value"
        [amount]="enteredAmount()"
        [ownTransactionId]="transaction()?.id ?? null"
        [saving]="linkBusy()"
        (selected)="applyLink($event)"
        (cancelled)="view.set('form')"
      />
    } @else if (view() === 'details') {
      <app-linked-transaction-dialog
        [linked]="linked()"
        [loading]="linkLoading()"
        [error]="linkError()"
        [busy]="linkBusy()"
        (jump)="jumpToLink()"
        (unlink)="removeLink()"
        (cancelled)="view.set('form')"
      />
    } @else {
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
                [disabled]="hasLink()"
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
                [disabled]="hasLink()"
                (click)="selectType('Income')"
              >
                <i class="bi bi-arrow-down-left me-1" aria-hidden="true"></i> Einnahme
              </button>
            </div>
            @if (hasLink()) {
              <div class="form-text">
                Art und Betrag tragen die Verknüpfung und lassen sich nicht ändern. Löse dafür
                zuerst die Verknüpfung.
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
                  [readonly]="hasLink()"
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

          @if (form.controls.type.value === 'Expense' && fixedCostOptions().length > 0) {
            <div>
              <label for="txFixedCost" class="form-label">
                Fixkosten <span class="form-label__optional">(optional)</span>
              </label>
              <select
                id="txFixedCost"
                formControlName="fixedCostId"
                class="form-select"
                aria-describedby="txFixedCostHint"
              >
                <option value="">Keine Fixkosten</option>
                @for (option of fixedCostOptions(); track option.id) {
                  <option [value]="option.id">{{ option.label }}</option>
                }
              </select>
              <div id="txFixedCostHint" class="form-text">
                Zugeordnete Buchungen zählen als Fixkosten statt als variable Ausgabe.
              </div>
            </div>
          }

          <!--
            Die Verknüpfung steht unter Betrag und Bezeichnung: Sie setzt beides voraus
            — gesucht wird die betragsgleiche Gegenbuchung auf einem anderen Konto.
          -->
          <div>
            <span class="form-label" id="txLinkLabel">
              Verknüpfte Buchung <span class="form-label__optional">(optional)</span>
            </span>

            @if (linked(); as item) {
              <div class="link-field">
                <span class="link-field__text">
                  <i class="bi bi-link-45deg link-field__icon" aria-hidden="true"></i>
                  <span>
                    <span class="link-field__title">{{ item.title }}</span>
                    <span class="link-field__meta">{{ linkMeta() }}</span>
                  </span>
                </span>

                <span class="link-field__actions">
                  @if (isEditMode()) {
                    <button
                      type="button"
                      class="btn btn-outline-secondary btn-sm"
                      [disabled]="saving() || linkBusy()"
                      (click)="openDetails()"
                    >
                      Details
                    </button>
                  }
                  <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    [disabled]="saving() || linkBusy()"
                    (click)="removeLink()"
                  >
                    Lösen
                  </button>
                </span>
              </div>
            } @else {
              <button
                type="button"
                class="btn btn-outline-secondary w-100"
                aria-describedby="txLinkHint"
                [disabled]="saving() || linkBusy() || !canPickLink()"
                (click)="view.set('picker')"
              >
                @if (linkBusy()) {
                  <span
                    class="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                }
                <i class="bi bi-link-45deg" aria-hidden="true"></i>
                <span>Buchung verknüpfen</span>
              </button>
              <div id="txLinkHint" class="form-text">{{ linkHint() }}</div>
            }

            @if (linkError() && view() === 'form') {
              <div class="alert alert-danger link-field__error mb-0" role="alert">
                {{ linkError() }}
              </div>
            }
          </div>

          <!--
            Die Angabe steht direkt unter Betrag und Bezeichnung, weil sie meist beim
            Erfassen fällt: gerade bezahlt, Bank hat noch nicht abgebucht. Sie ändert
            nichts an den Zahlen des Monats — nur der Stand „laut Bank“ lässt die
            Buchung außen vor, bis sie abgehakt ist.
          -->
          @if (canBePending()) {
            <div class="form-check pending-check">
              <input
                type="checkbox"
                id="txPending"
                formControlName="isPending"
                class="form-check-input"
                aria-describedby="txPendingHint"
              />
              <label for="txPending" class="form-check-label">Noch nicht abgebucht</label>
              <div id="txPendingHint" class="form-text">
                Zählt sofort im Kontostand und im frei verfügbaren Geld — nur der Stand laut Bank
                lässt sie aus, bis du sie als abgebucht markierst.
              </div>
            </div>
          }

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
          <button
            type="submit"
            form="transactionForm"
            class="btn btn-primary"
            [disabled]="saving() || linkBusy()"
          >
            @if (saving()) {
              <span
                class="spinner-border spinner-border-sm"
                role="status"
                aria-hidden="true"
              ></span>
            }
            {{ isEditMode() ? 'Speichern' : 'Buchung erfassen' }}
          </button>
        </div>
      </app-modal-dialog>
    }
  `,
  styles: [
    `
      /* Der ausklappbare Bereich kommt aus der globalen Muster-Schicht
         (.fin-details). */
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
      /* Der Hinweistext beginnt bündig unter der Beschriftung, nicht unter dem
         Kästchen — sonst liest er sich als eigener Absatz statt als Erläuterung. */
      .pending-check .form-text {
        margin-top: var(--fin-space-1);
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

      /* -------------------------------------------------------------------
         Verknüpfte Buchung
         ------------------------------------------------------------------- */

      /*
        Die bestehende Verknüpfung sieht aus wie ein Eingabefeld, ist aber keins:
        gleiche Höhe und Kante wie die Felder darüber, damit die Zeile im Formular
        nicht aus der Reihe fällt. Auf schmalen Displays brechen die Schaltflächen
        unter den Text, statt ihn auf wenige Zeichen zu quetschen.
      */
      .link-field {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: var(--fin-space-2) var(--fin-space-3);
        padding: var(--fin-space-2) var(--fin-space-3);
        border: 1px solid var(--fin-border);
        border-radius: var(--fin-radius-md);
        background-color: var(--fin-surface-sunken);
      }
      .link-field__text {
        display: flex;
        flex: 1 1 12rem;
        align-items: flex-start;
        gap: var(--fin-space-2);
        min-width: 0;
      }
      .link-field__icon {
        flex-shrink: 0;
        margin-top: 0.15rem;
        color: var(--fin-accent);
      }
      .link-field__title {
        display: block;
        color: var(--fin-text-strong);
        font-weight: 550;
        line-height: var(--fin-leading-snug);
        overflow-wrap: anywhere;
      }
      .link-field__meta {
        display: block;
        color: var(--fin-text-muted);
        font-size: var(--fin-text-sm);
        line-height: var(--fin-leading-snug);
        overflow-wrap: anywhere;
      }
      .link-field__actions {
        display: flex;
        flex-shrink: 0;
        gap: var(--fin-space-2);
      }
      .link-field__error {
        margin-top: var(--fin-space-2);
      }
    `,
  ],
})
export class TransactionFormDialogComponent implements OnInit {
  /** `null` erfasst eine neue Buchung, sonst wird die übergebene bearbeitet. */
  readonly transaction = input<Transaction | null>(null);
  /** Das geöffnete Konto — Grundlage für die Suche nach einer Gegenbuchung. */
  readonly accountId = input.required<number>();
  readonly categories = input.required<Category[]>();
  /** Fixkosten des angezeigten Monats, denen die Buchung zugeordnet werden kann. */
  readonly fixedCosts = input<FixedCost[]>([]);
  /** Vorbelegter Abrechnungsmonat — der gerade angezeigte Monat. */
  readonly month = input.required<string>();
  readonly currency = input.required<string>();
  /** Nur auf Girokonten gibt es den Zustand „erfasst, aber noch nicht abgebucht“. */
  readonly accountType = input.required<AccountType>();
  readonly saving = input(false);
  /** Restbudget je Kategorie, um vor einer Überschreitung zu warnen. */
  readonly remainingByCategory = input<ReadonlyMap<number, number>>(new Map());

  readonly save = output<TransactionFormResult>();
  readonly cancelled = output<void>();
  /** Eine Verknüpfung wurde gesetzt oder gelöst — die Liste dahinter ist veraltet. */
  readonly linkChanged = output<void>();
  /** Der Nutzer will zur verknüpften Buchung auf deren Konto wechseln. */
  readonly jump = output<LinkedTransaction>();

  private readonly fb = inject(FormBuilder);
  private readonly transactionApi = inject(TransactionApiService);
  private readonly submitted = signal(false);

  protected readonly view = signal<View>('form');

  /**
   * Die verknüpfte Buchung. Beim Bearbeiten der Stand des Servers, beim Anlegen die
   * vorgemerkte Auswahl — sie wird erst nach dem Speichern gesetzt.
   */
  protected readonly linked = signal<LinkedTransaction | null>(null);
  protected readonly linkLoading = signal(false);
  protected readonly linkBusy = signal(false);
  protected readonly linkError = signal('');

  protected readonly form = this.fb.nonNullable.group({
    type: ['Expense' as TransactionType, [Validators.required]],
    amount: ['', [positiveMoneyValidator]],
    title: ['', [Validators.required, Validators.maxLength(500)]],
    categoryId: [''],
    fixedCostId: [''],
    bookingDate: ['', [Validators.required]],
    purchaseDate: [''],
    accountingMonth: ['', [Validators.required]],
    note: [''],
    isPending: [false],
  });

  protected readonly isEditMode = computed(() => this.transaction() !== null);

  /** Solange eine Verknüpfung besteht, sind Art und Betrag festgeschrieben. */
  protected readonly hasLink = computed(() => this.linked() !== null);

  protected readonly suggestedMonthLabel = computed(() => formatMonthLong(this.month()));

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** Der eingegebene Betrag als Zahl; 0, solange die Eingabe unbrauchbar ist. */
  protected readonly enteredAmount = computed(
    () => parseMoneyInput(this.formValue().amount ?? '') ?? 0,
  );

  /** Ohne gültigen Betrag gibt es keine sinnvolle Suche — sie filtert genau darauf. */
  protected readonly canPickLink = computed(() => this.enteredAmount() > 0);

  protected readonly linkHint = computed(() =>
    this.canPickLink()
      ? 'Verbindet diese Buchung mit der betragsgleichen Gegenbuchung eines anderen Kontos.'
      : 'Gib zuerst den Betrag ein — gesucht wird die betragsgleiche Gegenbuchung.',
  );

  protected readonly linkMeta = computed(() => {
    const item = this.linked();
    if (!item) return '';

    return `${item.accountName} · ${formatDate(item.bookingDate)} · ${formatMoney(
      item.amount,
      item.currency,
    )}`;
  });

  /** Offen sein kann nur eine Ausgabe auf einem Girokonto. */
  protected readonly canBePending = computed(
    () => this.accountType() === 'CheckingAccount' && this.formValue().type === 'Expense',
  );

  /**
   * Die Fixkosten des angezeigten Monats. Ist die bearbeitete Buchung einer Position
   * aus einem anderen Monat zugeordnet, kommt diese zusätzlich hinein — sonst fiele
   * die bestehende Zuordnung beim Speichern still weg.
   */
  protected readonly fixedCostOptions = computed<{ id: number; label: string }[]>(() => {
    const options = this.fixedCosts().map((fixedCost) => ({
      id: fixedCost.id,
      label: `${fixedCost.name} · ${formatMoney(fixedCost.amount, fixedCost.currency)}`,
    }));

    const existing = this.transaction();
    if (existing?.fixedCostId == null || options.some((o) => o.id === existing.fixedCostId)) {
      return options;
    }

    const month = existing.fixedCostMonth ? formatMonthLong(existing.fixedCostMonth) : '';
    return [
      { id: existing.fixedCostId, label: `${existing.fixedCostName} · ${month}` },
      ...options,
    ];
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
        fixedCostId: existing.fixedCostId === null ? '' : String(existing.fixedCostId),
        bookingDate: existing.bookingDate,
        purchaseDate: existing.purchaseDate ?? '',
        accountingMonth: existing.accountingMonth,
        note: existing.note ?? '',
        isPending: existing.isPending,
      });

      if (existing.isLinked) this.loadLink(existing.id);
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

  protected openDetails(): void {
    this.linkError.set('');
    this.view.set('details');
  }

  protected jumpToLink(): void {
    const item = this.linked();
    if (item) this.jump.emit(item);
  }

  /**
   * Übernimmt die gewählte Gegenbuchung. Beim Bearbeiten gibt es die eigene Buchung
   * bereits — die Verknüpfung wird sofort gesetzt, damit sie auch dann besteht, wenn
   * der Nutzer den Dialog anschließend abbricht. Beim Anlegen bleibt sie vorgemerkt.
   */
  protected applyLink(candidate: LinkedTransaction): void {
    const existing = this.transaction();
    this.linkError.set('');

    if (!existing) {
      this.linked.set(candidate);
      this.view.set('form');
      return;
    }

    this.linkBusy.set(true);

    this.transactionApi.link(this.accountId(), existing.id, candidate.id).subscribe({
      next: (item) => {
        this.linked.set(item);
        this.linkBusy.set(false);
        this.view.set('form');
        this.linkChanged.emit();
      },
      error: (err: Error) => {
        this.linkBusy.set(false);
        this.view.set('form');
        this.linkError.set(err.message || 'Die Buchungen konnten nicht verknüpft werden.');
      },
    });
  }

  protected removeLink(): void {
    const existing = this.transaction();
    this.linkError.set('');

    if (!existing) {
      this.linked.set(null);
      this.view.set('form');
      return;
    }

    this.linkBusy.set(true);

    this.transactionApi.unlink(this.accountId(), existing.id).subscribe({
      next: () => {
        this.linked.set(null);
        this.linkBusy.set(false);
        this.view.set('form');
        this.linkChanged.emit();
      },
      error: (err: Error) => {
        this.linkBusy.set(false);
        this.view.set('form');
        this.linkError.set(err.message || 'Die Verknüpfung konnte nicht gelöst werden.');
      },
    });
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
      payload: {
        type: value.type,
        amount: parseMoneyInput(value.amount) ?? 0,
        title: value.title.trim(),
        categoryId: value.categoryId ? Number(value.categoryId) : null,
        // Nur Ausgaben können Fixkosten sein; ein Wechsel auf „Einnahme“ blendet das Feld
        // aus, ohne es zu leeren — die Zuordnung darf dann nicht mitgesendet werden.
        fixedCostId:
          value.type === 'Expense' && value.fixedCostId ? Number(value.fixedCostId) : null,
        bookingDate: value.bookingDate,
        purchaseDate: value.purchaseDate || null,
        accountingMonth: value.accountingMonth,
        note: value.note.trim() || null,
        // Wie beim Fixkosten-Feld: Wer auf „Einnahme“ umschaltet, blendet die Angabe nur
        // aus, ohne sie zu leeren — mitgesendet werden darf sie dann nicht.
        isPending: this.canBePending() && value.isPending,
      },
      // Beim Bearbeiten ist die Verknüpfung längst gesetzt und darf nicht erneut laufen.
      linkTo: this.isEditMode() ? null : (this.linked()?.id ?? null),
    });
  }

  /** Holt die Gegenbuchung, damit die Zeile im Formular sie beim Namen nennen kann. */
  private loadLink(transactionId: number): void {
    this.linkLoading.set(true);

    this.transactionApi.getLink(this.accountId(), transactionId).subscribe({
      next: (item) => {
        this.linked.set(item);
        this.linkLoading.set(false);
      },
      error: (err: Error) => {
        this.linkLoading.set(false);
        this.linkError.set(err.message || 'Die verknüpfte Buchung konnte nicht geladen werden.');
      },
    });
  }
}
