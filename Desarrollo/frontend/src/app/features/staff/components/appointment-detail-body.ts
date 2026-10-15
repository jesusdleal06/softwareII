import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideCalendarClock, LucideCircleCheck, LucideCircleX, LucideUserCheck, LucideUserX } from '@lucide/angular';
import { formatDate, formatTime, isActiveStatus, reminderInfo } from '../../../core/domain';
import { Appointment } from '../../../core/models';
import { AppointmentSummary } from '../../../shared/ui/appointment-summary';
import { BigButton } from '../../../shared/ui/big-button';
import { ReminderBadge } from '../../../shared/ui/status-badge';

/** Appointment detail: summary, reminder and staff actions (presentational). */
@Component({
  selector: 'app-appointment-detail-body',
  imports: [
    AppointmentSummary,
    ReminderBadge,
    BigButton,
    LucideCircleCheck,
    LucideCalendarClock,
    LucideUserCheck,
    LucideUserX,
    LucideCircleX,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    @let cita = appointment();
    @if (message(); as text) {
      <p
        role="status"
        class="flex items-start gap-3 rounded-2xl border border-success/40 bg-success/10 px-4 py-3 text-base font-medium text-success"
      >
        <svg lucideCircleCheck class="mt-0.5 size-5 shrink-0" aria-hidden="true"></svg>
        {{ text }}
      </p>
    }
    <dl appAppointmentSummary [appointment]="cita"></dl>
    <section class="flex flex-col gap-2 rounded-2xl border bg-muted/40 px-5 py-4" aria-labelledby="rec-title">
      <h3 id="rec-title" class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Recordatorio por WhatsApp
      </h3>
      <app-reminder-badge [status]="cita.reminder" />
      <p class="text-base text-muted-foreground text-pretty first-letter:uppercase">{{ reminderDetail() }}</p>
    </section>

    @if (!readOnly() && active()) {
      <section class="flex flex-col gap-3" aria-label="Acciones">
        <button
          type="button"
          appBigButton
          variant="primary"
          size="lg"
          [full]="true"
          [disabled]="cita.status === 'Confirmada'"
          (click)="confirm.emit()"
        >
          <svg lucideCircleCheck></svg> {{ cita.status === 'Confirmada' ? 'Asistencia ya confirmada' : 'Confirmar' }}
        </button>
        <button type="button" appBigButton variant="outline" size="lg" [full]="true" (click)="reschedule.emit()">
          <svg lucideCalendarClock></svg> Reprogramar
        </button>
        <div class="grid gap-3 sm:grid-cols-2">
          <button type="button" appBigButton variant="success" size="lg" (click)="attended.emit()">
            <svg lucideUserCheck></svg> Marcar como atendida
          </button>
          <button type="button" appBigButton variant="secondary" size="lg" (click)="noShow.emit()">
            <svg lucideUserX></svg> Marcar como no asistió
          </button>
        </div>
        <button
          type="button"
          appBigButton
          variant="outline"
          size="lg"
          [full]="true"
          class="text-destructive!"
          (click)="cancel.emit()"
        >
          <svg lucideCircleX></svg> Cancelar cita
        </button>
      </section>
    }

    @if (!readOnly() && !active()) {
      <p class="rounded-2xl border bg-muted/40 px-5 py-4 text-base text-muted-foreground text-pretty">
        Esta cita está en estado <strong class="text-foreground">{{ cita.status }}</strong> y no admite más acciones.
      </p>
    }
  `,
})
export class AppointmentDetailBody {
  readonly appointment = input.required<Appointment>();
  readonly readOnly = input(false);
  /** Success message of the last action. */
  readonly message = input<string | null>(null);
  readonly confirm = output<void>();
  readonly reschedule = output<void>();
  readonly attended = output<void>();
  readonly noShow = output<void>();
  readonly cancel = output<void>();

  protected readonly active = computed(() => isActiveStatus(this.appointment().status));

  protected readonly reminderDetail = computed(() => {
    const a = this.appointment();
    const info = reminderInfo(a);
    if (a.reminder === 'Programado') return `se enviará ${info.text}`;
    if (a.reminder === 'Enviado') return `enviado el ${formatDate(info.date)} a las ${formatTime(info.time)}`;
    return 'el número no recibió el mensaje. Llamar al paciente.';
  });
}
