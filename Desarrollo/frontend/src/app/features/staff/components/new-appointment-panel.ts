import { ChangeDetectionStrategy, Component, inject, input, isDevMode, OnInit, output, signal } from '@angular/core';
import { LucideCircleCheck, LucideTriangleAlert } from '@lucide/angular';
import {
  formatDate,
  formatPhone,
  formatTime,
  normalizePhone,
  PatientData,
  PatientErrors,
  validatePatient,
} from '../../../core/domain';
import { Appointment } from '../../../core/models';
import { AppStore } from '../../../core/services/app-store.service';
import { PatientForm } from '../../../shared/booking/patient-form';
import { SlotPicker, SlotSelection } from '../../../shared/booking/slot-picker';
import { AlertMessage } from '../../../shared/ui/alert-message';
import { AppointmentSummary } from '../../../shared/ui/appointment-summary';
import { BigButton } from '../../../shared/ui/big-button';
import { Modal, scrollModalToTop } from '../../../shared/ui/modal';

const CONFLICT_MESSAGE = 'Este horario acaba de ser ocupado, elige otro.';

/**
 * Manual booking for requests received by phone or WhatsApp (prototype `NuevaCitaPanel`,
 * container). Same rules as the web: free slot and one active appointment per phone.
 */
@Component({
  selector: 'app-new-appointment-panel',
  host: { class: 'contents' },
  imports: [
    Modal,
    SlotPicker,
    PatientForm,
    AppointmentSummary,
    AlertMessage,
    BigButton,
    LucideCircleCheck,
    LucideTriangleAlert,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal
      [open]="open()"
      (closed)="close()"
      title="Nueva cita manual"
      description="Para solicitudes recibidas por llamada o WhatsApp. Aplica las mismas reglas que la web."
      layout="side"
    >
      @if (created(); as cita) {
        <div class="flex flex-col gap-6">
          <p
            role="status"
            class="flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-base font-medium text-emerald-800 dark:text-emerald-200"
          >
            <svg lucideCircleCheck class="mt-0.5 size-5 shrink-0" aria-hidden="true"></svg>
            Cita {{ cita.code }} registrada. El recordatorio por WhatsApp quedó programado.
          </p>
          <dl appAppointmentSummary [appointment]="cita"></dl>
          <div class="flex flex-col gap-3">
            <button type="button" appBigButton size="lg" [full]="true" (click)="close()">Listo</button>
            <button type="button" appBigButton variant="outline" size="lg" [full]="true" (click)="reset()">
              Registrar otra cita
            </button>
          </div>
        </div>
      } @else {
        <form class="flex flex-col gap-8" novalidate (submit)="save($event)">
          @if (notice(); as text) {
            <p appAlertMessage>{{ text }}</p>
          }

          @if (activeAppointment(); as active) {
            <div role="alert" class="flex flex-col gap-3 rounded-2xl border border-warning/50 bg-warning/15 p-4">
              <p class="flex items-start gap-3 text-base font-medium">
                <svg lucideTriangleAlert class="mt-0.5 size-5 shrink-0 text-warning-foreground" aria-hidden="true"></svg>
                El paciente con celular {{ formatPhone(patient().phone) }} ya tiene una cita activa:
                {{ active.code }} el {{ formatDate(active.date) }} a las {{ formatTime(active.time) }}. Solo se permite
                una cita activa por paciente. Reprograma o cancela esa cita desde la agenda antes de crear una nueva.
              </p>
            </div>
          }

          <app-slot-picker
            [value]="selection()"
            [appointments]="store.appointments()"
            [now]="now"
            [compact]="true"
            (valueChange)="onSelectionChange($event)"
          />

          <section class="flex flex-col gap-4" aria-labelledby="nc-paciente">
            <h3 id="nc-paciente" class="text-lg font-bold">Datos del paciente</h3>
            <app-patient-form
              [data]="patient()"
              [errors]="errors()"
              idPrefix="nc"
              [labels]="labels"
              (dataChange)="onPatientChange($event)"
            />
          </section>

          @if (showDemoTools()) {
            <label
              class="flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground"
            >
              <input
                type="checkbox"
                class="size-5 accent-primary"
                [checked]="simulateConflict()"
                (change)="onSimulateChange($event)"
              />
              <span>
                <strong class="text-foreground">Solo demo:</strong> simular que otro usuario tomó el horario al guardar.
              </span>
            </label>
          }

          <div class="flex flex-col gap-3">
            <button type="submit" appBigButton size="lg" [full]="true">Guardar cita</button>
            <button type="button" appBigButton variant="outline" size="lg" [full]="true" (click)="close()">
              Cancelar
            </button>
          </div>
        </form>
      }
    </app-modal>
  `,
})
export class NewAppointmentPanel implements OnInit {
  protected readonly store = inject(AppStore);

  readonly open = input.required<boolean>();
  /** Day preselected when the form starts or restarts (the agenda's day). */
  readonly initialDate = input.required<string>();
  readonly closed = output<void>();

  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;
  protected readonly formatPhone = formatPhone;
  protected readonly labels = { name: 'Nombre completo del paciente', phone: 'Celular del paciente' };
  /** Fixed for the panel lifetime so the slot picker gets a stable input. */
  protected readonly now = this.store.now();

  protected readonly selection = signal<SlotSelection>({ dentistId: '', procedureId: '', date: '', time: '' });
  protected readonly patient = signal<PatientData>({ name: '', phone: '' });
  protected readonly errors = signal<PatientErrors>({});
  protected readonly notice = signal<string | null>(null);
  protected readonly activeAppointment = signal<Appointment | null>(null);
  protected readonly created = signal<Appointment | null>(null);
  protected readonly simulateConflict = signal(false);
  /** Demo helper, rendered only in dev builds so it never ships in the production DOM. */
  protected readonly showDemoTools = signal(isDevMode());

  ngOnInit(): void {
    this.reset();
  }

  protected reset(): void {
    this.selection.set({ dentistId: '', procedureId: '', date: this.initialDate(), time: '' });
    this.patient.set({ name: '', phone: '' });
    this.errors.set({});
    this.notice.set(null);
    this.activeAppointment.set(null);
    this.created.set(null);
    this.simulateConflict.set(false);
  }

  protected close(): void {
    this.reset();
    this.closed.emit();
  }

  protected onSelectionChange(next: SlotSelection): void {
    this.selection.set(next);
    this.notice.set(null);
  }

  protected onSimulateChange(event: Event): void {
    this.simulateConflict.set((event.target as HTMLInputElement).checked);
  }

  protected onPatientChange(next: PatientData): void {
    this.patient.set(next);
    this.activeAppointment.set(null);
  }

  protected save(event: Event): void {
    event.preventDefault();
    this.notice.set(null);
    this.activeAppointment.set(null);

    const patient = this.patient();
    const errors = validatePatient(patient);
    this.errors.set(errors);
    const { dentistId, procedureId, date, time } = this.selection();
    if (!dentistId || !procedureId || !date || !time) {
      this.warn('Completa odontólogo, procedimiento, día y hora.');
      return;
    }
    if (Object.keys(errors).length > 0) return;

    const active = this.store.activeAppointmentFor(patient.phone);
    if (active) {
      this.showActive(active);
      return;
    }

    if (this.simulateConflict()) {
      this.conflict();
      this.simulateConflict.set(false);
      return;
    }

    const result = this.store.createAppointment({
      ...this.selection(),
      patientName: patient.name.trim(),
      patientPhone: normalizePhone(patient.phone),
      origin: 'Manual',
    });
    if (result.ok) {
      this.created.set(result.appointment);
      scrollModalToTop();
    } else if (result.reason === 'conflicto') {
      this.conflict();
    } else {
      this.showActive(result.activeAppointment);
    }
  }

  private conflict(): void {
    this.warn(CONFLICT_MESSAGE);
    this.selection.update((s) => ({ ...s, time: '' }));
  }

  private warn(text: string): void {
    this.notice.set(text);
    scrollModalToTop();
  }

  private showActive(active: Appointment): void {
    this.activeAppointment.set(active);
    scrollModalToTop();
  }
}
