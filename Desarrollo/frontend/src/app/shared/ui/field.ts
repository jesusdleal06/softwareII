import { ChangeDetectionStrategy, Component, computed, Directive, input, output } from '@angular/core';
import { LucideCircleAlert } from '@lucide/angular';
import { cn } from './class-names';

const CONTROL_BASE =
  'w-full min-h-14 rounded-xl border bg-background px-4 text-lg text-foreground placeholder:text-muted-foreground/70 outline-none transition-colors focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:border-primary';

const SELECT_ARROW =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23455' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")";

/** Label, hint and error shared by the form fields. */
@Directive()
abstract class FieldBase {
  readonly fieldId = input.required<string>();
  readonly label = input.required<string>();
  readonly hint = input<string>();
  readonly error = input<string>();
  readonly labelHidden = input(false);

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
    cn(CONTROL_BASE, this.error() ? 'border-destructive' : 'border-input'),
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
  template: `
    <label [for]="fieldId()" [class]="labelClass()">{{ label() }}</label>
    <select
      [id]="fieldId()"
      [attr.aria-invalid]="!!error()"
      [attr.aria-describedby]="describedBy()"
      [class]="controlClass()"
      [style.background-image]="arrow"
      (change)="onChange($event)"
    >
      @if (placeholder()) {
        <option value="" [selected]="value() === ''">{{ placeholder() }}</option>
      }
      @for (option of options(); track option.value) {
        <option [value]="option.value" [selected]="option.value === value()">{{ option.label }}</option>
      }
    </select>
    ${MESSAGES}
  `,
})
export class SelectField extends FieldBase {
  readonly value = input('');
  readonly options = input.required<readonly SelectOption[]>();
  /** Label of the empty first option, if any. */
  readonly placeholder = input<string>();
  readonly valueChange = output<string>();

  protected readonly arrow = SELECT_ARROW;
  protected readonly controlClass = computed(() =>
    cn(
      CONTROL_BASE,
      'appearance-none bg-[length:1.25rem] bg-[position:right_1rem_center] bg-no-repeat pr-12',
      this.error() ? 'border-destructive' : 'border-input',
    ),
  );

  protected onChange(event: Event): void {
    this.valueChange.emit((event.target as HTMLSelectElement).value);
  }
}
