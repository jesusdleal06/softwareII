import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { LucideArrowLeft } from '@lucide/angular';
import { formatDate, formatTime } from '../../../core/domain';
import { Appointment, AppointmentStatus } from '../../../core/models';
import { AppStore } from '../../../core/services/app-store.service';
import { SlotPicker, SlotSelection } from '../../../shared/booking/slot-picker';
import { AlertMessage } from '../../../shared/ui/alert-message';
import { BigButton } from '../../../shared/ui/big-button';
import { Modal, scrollModalToTop } from '../../../shared/ui/modal';
import { AppointmentDetailBody } from './appointment-detail-body';

type Mode = 'detail' | 'reschedule' | 'cancel';

const CONFLICT_MESSAGE = 'Este horario acaba de ser ocupado, elige otro.';
const EMPTY_SELECTION: SlotSelection = { dentistId: '', procedureId: '', date: '', time: '' };

/**
 * Staff side panel for one appointment (prototype `CitaDetail`, container): confirm,
 * reschedule, cancel and mark attended / no-show through the store.
 */
@Component({
  selector: 'app-appointment-detail',
  host: { class: 'contents' },
  imports: [Modal, AppointmentDetailBody, SlotPicker, AlertMessage, BigButton, LucideArrowLeft],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (appointment(); as cita) {
      @switch (mode()) {
        @case ('reschedule') {
          <app-modal
            [open]="true"
            (closed)="close()"
            [title]="'Reprogramar cita ' + cita.code"
            [description]="cita.patientName + ' · actualmente ' + formatDate(cita.date) + ' ' + formatTime(cita.time)"
            layout="side"
          >
            <div class="flex flex-col gap-6">
              @if (notice(); as text) {
                <p appAlertMessage>{{ text }}</p>
              }
              <app-slot-picker
                [value]="selection()"
                [dentists]="store.dentists()"
                [procedures]="store.procedures()"
                [now]="now"
                [fixedDentist]="true"
                [fixedProcedure]="true"
                [compact]="true"
                (valueChange)="onSelectionChange($event)"
              />
              <div class="flex flex-col gap-3">
                <button
                  type="button"
                  appBigButton
                  size="lg"
                  [full]="true"
                  [disabled]="!selection().date || !selection().time"
                  (click)="confirmReschedule(cita)"
                >
                  Confirmar nuevo horario
                </button>
                <button type="button" appBigButton variant="outline" size="lg" [full]="true" (click)="mode.set('detail')">
                  <svg lucideArrowLeft></svg> Volver al detalle
                </button>
              </div>
            </div>
          </app-modal>
        }
        @case ('cancel') {
          <app-modal
            [open]="true"
            (closed)="close()"
            title="¿Cancelar esta cita?"
            [description]="
              'Se liberará el horario del ' +
              formatDate(cita.date) +
              ' a las ' +
              formatTime(cita.time) +
              ' para ' +
              cita.patientName +
              '.'
            "
            size="sm"
          >
            <div class="flex flex-col gap-3">
              <button
                type="button"
                appBigButton
                variant="danger"
                size="lg"
                [full]="true"
                (click)="mark(cita, 'Cancelada', 'La cita fue cancelada y el horario quedó liberado.')"
              >
                Sí, cancelar la cita
              </button>
              <button type="button" appBigButton variant="outline" size="lg" [full]="true" (click)="mode.set('detail')">
                No, volver
              </button>
            </div>
          </app-modal>
        }
        @default {
          <app-modal
            [open]="true"
            (closed)="close()"
            [title]="'Cita ' + cita.code"
            [description]="
              'Origen: ' +
              (cita.origin === 'Web'
                ? 'agendada por el paciente en la web'
                : 'registrada manualmente por el personal')
            "
            layout="side"
          >
            <app-appointment-detail-body
              [appointment]="cita"
              [readOnly]="readOnly()"
              [message]="message()"
              (confirm)="mark(cita, 'Confirmada', 'Asistencia confirmada.')"
              (reschedule)="startReschedule(cita)"
              (attended)="mark(cita, 'Atendida', 'La cita se marcó como atendida.')"
              (noShow)="mark(cita, 'No asistió', 'La cita se marcó como inasistencia.')"
              (cancel)="mode.set('cancel')"
            />
          </app-modal>
        }
      }
    }
  `,
})
export class AppointmentDetail {
  protected readonly store = inject(AppStore);

  /** Appointment to show; `null` renders nothing. */
  readonly appointmentId = input<string | null>(null);
  /** Dentist view: no actions. */
  readonly readOnly = input(false);
  readonly closed = output<void>();

  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;
  /** Fixed for the panel lifetime so the slot picker gets a stable input. */
  protected readonly now = this.store.now();

  constructor() {
    void this.store.ensureCatalogs();
  }

  protected readonly appointment = computed(() => {
    const id = this.appointmentId();
    return id ? (this.store.appointments().find((a) => a.id === id) ?? null) : null;
  });

  protected readonly mode = signal<Mode>('detail');
  protected readonly selection = signal<SlotSelection>(EMPTY_SELECTION);
  protected readonly notice = signal<string | null>(null);
  protected readonly message = signal<string | null>(null);
  protected readonly saving = signal(false);

  protected close(): void {
    this.mode.set('detail');
    this.notice.set(null);
    this.message.set(null);
    this.closed.emit();
  }

  protected startReschedule(cita: Appointment): void {
    this.selection.set({ dentistId: cita.dentistId, procedureId: cita.procedureId, date: '', time: '' });
    this.notice.set(null);
    this.mode.set('reschedule');
  }

  protected onSelectionChange(next: SlotSelection): void {
    this.selection.set(next);
    this.notice.set(null);
  }

  protected async confirmReschedule(cita: Appointment): Promise<void> {
    if (this.saving()) return;
    const { date, time } = this.selection();
    this.saving.set(true);
    try {
      const result = await this.store.rescheduleAppointment(cita.id, date, time);
      if (result.ok) {
        this.showMessage(`Cita reprogramada para el ${formatDate(date)} a las ${formatTime(time)}.`);
        this.mode.set('detail');
      } else {
        this.notice.set(CONFLICT_MESSAGE);
        this.selection.update((s) => ({ ...s, time: '' }));
        scrollModalToTop();
      }
    } catch {
      this.notice.set('No pudimos reprogramar la cita. Intenta de nuevo.');
      scrollModalToTop();
    } finally {
      this.saving.set(false);
    }
  }

  protected async mark(cita: Appointment, status: AppointmentStatus, text: string): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      await this.store.changeStatus(cita.id, status);
      this.showMessage(text);
      this.mode.set('detail');
    } catch {
      this.notice.set('No pudimos actualizar la cita. Intenta de nuevo.');
      scrollModalToTop();
    } finally {
      this.saving.set(false);
    }
  }

  private showMessage(text: string): void {
    this.message.set(text);
    scrollModalToTop();
  }
}
