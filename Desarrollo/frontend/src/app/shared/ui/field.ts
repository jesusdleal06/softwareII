import { ChangeDetectionStrategy, Component, computed, Directive, input, output } from '@angular/core';
import { LucideCircleAlert } from '@lucide/angular';
import { cn, mergeClasses } from './class-names';

const CONTROL_BASE =
  'w-full min-h-14 rounded-xl border bg-background px-4 text-lg text-foreground placeholder:text-placeholder-foreground outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-primary';

/**
 * Chevron used as a select mask.
 *
 * A background image cannot inherit a design token, which is why the previous arrow
 * hard-coded a grey and ignored every theme. The same SVG is drawn as a `mask-image`
 * over `var(--color-muted-foreground)`, so only the shape's alpha matters and the
 * `currentColor` stroke inside the mask is not a palette colour.
 */
const ARROW_SVG = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>`;
const ARROW_URL = `url("${ARROW_SVG}")`;

/** Label, hint and error shared by the form fields. */
@Directive()
abstract class FieldBase {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly labelHidden = input(false);
  /** When true the control exposes `required`/`aria-required`. */
  readonly required = input(false);
  /** Extra classes for the control (prototype `className`); they override conflicting defaults. */
  readonly inputClass = input<string>();

  protected readonly describedBy = computed(() => {
    if (this.error()) return `${this.fieldId()}-error`;
    if (this.hint()) return `${this.fieldId()}-hint`;
    return null;
  });

  protected readonly labelClass = computed(() =>
    cn('text-base font-semibold text-foreground', this.labelHidden() && 'sr-only'),
  );
}

const MESSAGES = `
  @if (error()) {
    <p [id]="fieldId() + '-error'" role="alert" class="flex items-start gap-2 text-base font-medium text-destructive">
      <svg lucideCircleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true"></svg>
      <span>{{ error() }}</span>
    </p>
  } @else if (hint()) {
    <p [id]="fieldId() + '-hint'" class="text-sm text-muted-foreground">{{ hint() }}</p>
  }
`;

/**
 * Large text input with label, hint and error (prototype `TextField`).
 * `sanitize` rewrites the typed text (and the input) before `valueChange` emits.
 */
@Component({
  selector: 'app-text-field',
  imports: [LucideCircleAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2' },
  template: `
    <label [for]="fieldId()" [class]="labelClass()">{{ label() }}</label>
    <input
      [id]="fieldId()"
      [type]="type()"
      [value]="value()"
      [attr.required]="required() || null"
      [attr.aria-required]="required() ? 'true' : null"
      [attr.placeholder]="placeholder() ?? null"
      [attr.autocomplete]="autocomplete() ?? null"
      [attr.inputmode]="inputMode() ?? null"
      [attr.maxlength]="maxLength() ?? null"
      [attr.aria-invalid]="!!error()"
      [attr.aria-describedby]="describedBy()"
      [class]="controlClass()"
      (input)="onInput($event)"
    />
    ${MESSAGES}
  `,
})
export class TextField extends FieldBase {
  readonly value = input('');
  readonly type = input('text');
  readonly placeholder = input<string>();
  readonly autocomplete = input<string>();
  readonly inputMode = input<string>();
  readonly maxLength = input<number>();
  readonly sanitize = input<(value: string) => string>();
  readonly valueChange = output<string>();

  protected readonly controlClass = computed(() =>
    mergeClasses(cn(CONTROL_BASE, this.error() ? 'border-destructive' : 'border-input'), this.inputClass()),
  );

  protected onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const sanitize = this.sanitize();
    const next = sanitize ? sanitize(el.value) : el.value;
    if (next !== el.value) el.value = next;
    this.valueChange.emit(next);
  }
}

export interface SelectOption {
  value: string;
  label: string;
}

/** Large native select with label, hint and error (prototype `SelectField`). */
@Component({
  selector: 'app-select-field',
  imports: [LucideCircleAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-2' },
  styles: [
    `
      .select-arrow {
        background-color: var(--color-muted-foreground);
        -webkit-mask-image: ${ARROW_URL};
        -webkit-mask-repeat: no-repeat;
        -webkit-mask-position: center;
        -webkit-mask-size: contain;
        mask-image: ${ARROW_URL};
        mask-repeat: no-repeat;
        mask-position: center;
        mask-size: contain;
      }
    `,
  ],
  template: `
    <label [for]="fieldId()" [class]="labelClass()">{{ label() }}</label>
    <div class="relative">
      <select
        [id]="fieldId()"
        [attr.required]="required() || null"
        [attr.aria-required]="required() ? 'true' : null"
        [attr.aria-invalid]="!!error()"
        [attr.aria-describedby]="describedBy()"
        [class]="controlClass()"
        (change)="onChange($event)"
      >
        @if (placeholder()) {
          <option value="" [selected]="value() === ''">{{ placeholder() }}</option>
        }
        @for (option of options(); track option.value) {
          <option [value]="option.value" [selected]="option.value === value()">{{ option.label }}</option>
        }
      </select>
      <span class="select-arrow pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2" aria-hidden="true"></span>
    </div>
    ${MESSAGES}
  `,
})
export class SelectField extends FieldBase {
  readonly value = input('');
  readonly options = input.required<readonly SelectOption[]>();
  /** Label of the empty first option, if any. */
  readonly placeholder = input<string>();
  readonly valueChange = output<string>();

  protected readonly controlClass = computed(() =>
    mergeClasses(
      cn(
        CONTROL_BASE,
        'appearance-none pr-12',
        this.error() ? 'border-destructive' : 'border-input',
      ),
      this.inputClass(),
    ),
  );

  protected onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }
}
