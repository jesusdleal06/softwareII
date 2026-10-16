import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideCalendarDays, LucideClock, LucidePhone, LucideStethoscope, LucideUser } from '@lucide/angular';
import {
  dentistById,
  endOf,
  formatDate,
  formatLongDate,
  formatPhone,
  formatTime,
  formatTimeFromMinutes,
  procedureById,
} from '../../core/domain';
import { Appointment } from '../../core/models';
import { StatusBadge } from './status-badge';

/** Data needed by the summary: a saved appointment or a booking still being confirmed. */
export type AppointmentSummaryData = Pick<Appointment, 'dentistId' | 'procedureId' | 'date' | 'time'> &
  Partial<Pick<Appointment, 'patientName' | 'patientPhone' | 'status' | 'code'>>;

const ROW = 'flex items-start gap-4 px-5 py-4';
const ROW_ICON = 'flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground';

/** Appointment details as a description list (prototype `CitaSummary`). Extra classes go in `class`. */
@Component({
  selector: 'dl[appAppointmentSummary]',
  imports: [StatusBadge, LucideCalendarDays, LucideClock, LucideStethoscope, LucideUser, LucidePhone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col divide-y rounded-2xl border bg-card' },
  template: `
    @let a = appointment();
    @if (a.code || a.status) {
      <div class="flex items-center justify-between gap-3 px-5 py-4">
        @if (a.code) {
          <div>
            <dt class="text-sm text-muted-foreground">Código de la cita</dt>
            <dd class="font-mono text-lg font-bold tracking-wide">{{ a.code }}</dd>
          </div>
        }
        @if (a.status) {
          <span appStatusBadge [status]="a.status"></span>
        }
      </div>
    }
    <div class="${ROW}">
      <span class="${ROW_ICON}" aria-hidden="true"><svg lucideCalendarDays class="size-5"></svg></span>
      <div class="min-w-0 flex-1">
        <dt class="text-sm text-muted-foreground">Fecha</dt>
        <dd class="text-lg font-semibold leading-snug text-pretty">
          <span class="inline-block first-letter:uppercase">{{ formatLongDate(a.date) }}</span>
          <span class="block text-sm text-muted-foreground">{{ formatDate(a.date) }}</span>
        </dd>
      </div>
    </div>
    <div class="${ROW}">
      <span class="${ROW_ICON}" aria-hidden="true"><svg lucideClock class="size-5"></svg></span>
      <div class="min-w-0 flex-1">
        <dt class="text-sm text-muted-foreground">Hora</dt>
        <dd class="text-lg font-semibold leading-snug text-pretty">
          {{ formatTime(a.time) }}
          @if (end()) {
            <span class="text-muted-foreground"> a {{ end() }}</span>
          }
        </dd>
      </div>
    </div>
    <div class="${ROW}">
      <span class="${ROW_ICON}" aria-hidden="true"><svg lucideStethoscope class="size-5"></svg></span>
      <div class="min-w-0 flex-1">
        <dt class="text-sm text-muted-foreground">Procedimiento</dt>
        <dd class="text-lg font-semibold leading-snug text-pretty">
          {{ procedure()?.name }}
          @if (procedure(); as p) {
            <span class="text-muted-foreground"> · {{ p.durationMinutes }} min</span>
          }
        </dd>
      </div>
    </div>
    <div class="${ROW}">
      <span class="${ROW_ICON}" aria-hidden="true"><svg lucideUser class="size-5"></svg></span>
      <div class="min-w-0 flex-1">
        <dt class="text-sm text-muted-foreground">Odontólogo</dt>
        <dd class="text-lg font-semibold leading-snug text-pretty">
          {{ dentist()?.name }}
          <span class="block text-sm text-muted-foreground">{{ dentist()?.specialty }}</span>
        </dd>
      </div>
    </div>
    @if (showPatient() && a.patientName) {
      <div class="${ROW}">
        <span class="${ROW_ICON}" aria-hidden="true"><svg lucidePhone class="size-5"></svg></span>
        <div class="min-w-0 flex-1">
          <dt class="text-sm text-muted-foreground">Paciente</dt>
          <dd class="text-lg font-semibold leading-snug text-pretty">
            {{ a.patientName }}
            @if (a.patientPhone) {
              <span class="block text-sm text-muted-foreground">{{ formatPhone(a.patientPhone) }}</span>
            }
          </dd>
        </div>
      </div>
    }
  `,
})
export class AppointmentSummary {
  readonly appointment = input.required<AppointmentSummaryData>();
  readonly showPatient = input(true);

  protected readonly formatDate = formatDate;
  protected readonly formatLongDate = formatLongDate;
  protected readonly formatTime = formatTime;
  protected readonly formatPhone = formatPhone;
  protected readonly dentist = computed(() => dentistById(this.appointment().dentistId));
  protected readonly procedure = computed(() => procedureById(this.appointment().procedureId));
  protected readonly end = computed(() =>
    this.procedure() ? formatTimeFromMinutes(endOf(this.appointment())) : '',
  );
}
