import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PatientData, PatientErrors } from '../../core/domain';
import { TextField } from '../ui/field';

/** Keeps digits and spaces only, as the prototype phone input does. */
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^\d\s]/g, '');
}

/**
 * Controlled name + mobile fields. The parent validates (`validatePatient`) and passes
 * `errors`; every edit is emitted through `dataChange`.
 */
@Component({
  selector: 'app-patient-form',
  imports: [TextField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <app-text-field
      [fieldId]="idPrefix() + '-nombre'"
      [label]="labels()?.name ?? 'Nombre completo'"
      placeholder="Ej: María Fernanda López"
      autocomplete="name"
      [value]="data().name"
      [error]="errors().name"
      (valueChange)="dataChange.emit({ name: $event, phone: data().phone })"
    />
    <app-text-field
      [fieldId]="idPrefix() + '-telefono'"
      [label]="labels()?.phone ?? 'Número de celular'"
      hint="10 dígitos. A este número enviaremos el recordatorio por WhatsApp."
      placeholder="Ej: 300 123 4567"
      inputMode="numeric"
      autocomplete="tel-national"
      [maxLength]="12"
      [sanitize]="sanitizePhone"
      [value]="data().phone"
      [error]="errors().phone"
      (valueChange)="dataChange.emit({ name: data().name, phone: $event })"
    />
  `,
})
export class PatientForm {
  readonly data = input.required<PatientData>();
  readonly errors = input<PatientErrors>({});
  readonly idPrefix = input('pac');
  readonly labels = input<{ name?: string; phone?: string }>();
  readonly dataChange = output<PatientData>();

  protected readonly sanitizePhone = sanitizePhoneInput;
}
