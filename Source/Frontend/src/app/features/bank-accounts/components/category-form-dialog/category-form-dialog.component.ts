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
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Category, CategoryPayload } from '../../../../core/models/category.model';
import { ModalDialogComponent } from '../../../../shared/components/modal-dialog/modal-dialog.component';
import { ColorPickerComponent } from '../../../../shared/components/color-picker/color-picker.component';
import { IconPickerComponent } from '../../../../shared/components/icon-picker/icon-picker.component';
import { CategoryBadgeComponent } from '../../../../shared/components/category-badge/category-badge.component';
import { ACCENT_COLOR_PRESETS } from '../../../../shared/utils/color-presets';
import { CATEGORY_ICON_PRESETS } from '../../../../shared/utils/category-icons';

/** Dialog zum Anlegen und Bearbeiten einer Kategorie. */
@Component({
  selector: 'app-category-form-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ModalDialogComponent,
    ColorPickerComponent,
    IconPickerComponent,
    CategoryBadgeComponent,
  ],
  template: `
    <app-modal-dialog
      [title]="isEditMode() ? 'Kategorie bearbeiten' : 'Kategorie hinzufügen'"
      (closed)="cancel()"
    >
      <form
        [formGroup]="form"
        (ngSubmit)="submit()"
        id="categoryForm"
        class="d-flex flex-column gap-3"
      >
        <div>
          <label for="categoryName" class="form-label">Name</label>
          <input
            type="text"
            id="categoryName"
            formControlName="name"
            class="form-control"
            placeholder="z. B. Lebensmittel"
            autocomplete="off"
            maxlength="100"
            [class.is-invalid]="isInvalid()"
            [attr.aria-describedby]="isInvalid() ? 'categoryNameError' : null"
          />
          @if (isInvalid()) {
            <div id="categoryNameError" class="invalid-feedback d-block">
              Bitte gib einen Namen an.
            </div>
          }
        </div>

        <div class="preview d-flex align-items-center gap-2">
          <span class="text-muted small">Vorschau:</span>
          <app-category-badge
            [name]="previewName()"
            [color]="form.controls.color.value"
            [icon]="form.controls.icon.value"
          />
        </div>

        <app-color-picker
          [value]="form.controls.color.value"
          (valueChange)="form.controls.color.setValue($event)"
        />

        <app-icon-picker
          [value]="form.controls.icon.value"
          [accentColor]="form.controls.color.value"
          (valueChange)="form.controls.icon.setValue($event)"
        />
      </form>

      <div dialogFooter class="d-flex flex-wrap gap-2 justify-content-end w-100">
        <button type="button" class="btn btn-light" [disabled]="saving()" (click)="cancel()">
          Abbrechen
        </button>
        <button type="submit" form="categoryForm" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span
              class="spinner-border spinner-border-sm me-1"
              role="status"
              aria-hidden="true"
            ></span>
          }
          {{ isEditMode() ? 'Speichern' : 'Kategorie anlegen' }}
        </button>
      </div>
    </app-modal-dialog>
  `,
  styles: [
    `
      .preview {
        padding: 0.5rem 0.75rem;
        border-radius: 0.75rem;
        background-color: var(--bs-tertiary-bg);
      }
    `,
  ],
})
export class CategoryFormDialogComponent implements OnInit {
  /** `null` legt eine neue Kategorie an, sonst wird die übergebene bearbeitet. */
  readonly category = input<Category | null>(null);
  readonly saving = input(false);

  readonly save = output<CategoryPayload>();
  readonly cancelled = output<void>();

  protected readonly isEditMode = computed(() => this.category() !== null);

  private readonly fb = inject(FormBuilder);
  private readonly submitted = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    color: [ACCENT_COLOR_PRESETS[0].value],
    icon: [CATEGORY_ICON_PRESETS[0].value],
  });

  private readonly nameValue = toSignal(this.form.controls.name.valueChanges, { initialValue: '' });

  /** In der Vorschau steht ein Platzhalter, solange noch kein Name eingegeben ist. */
  protected readonly previewName = computed(() => this.nameValue().trim() || 'Neue Kategorie');

  ngOnInit(): void {
    const existing = this.category();
    if (!existing) return;

    this.form.setValue({
      name: existing.name,
      color: existing.color ?? ACCENT_COLOR_PRESETS[0].value,
      icon: existing.icon ?? CATEGORY_ICON_PRESETS[0].value,
    });
  }

  protected isInvalid(): boolean {
    const control = this.form.controls.name;
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

    const { name, color, icon } = this.form.getRawValue();

    this.save.emit({ name: name.trim(), color, icon });
  }
}
