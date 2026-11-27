import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { LucideCalendarDays, LucideClock, LucidePhone, LucideStethoscope, LucideUser } from '@lucide/angular';
import {
  endOf,
  formatDate,
  formatLongDate,
  formatPhone,
  formatTime,
  formatTimeFromMinutes,
} from '../../core/domain';
import { Appointment } from '../../core/models';
import { AppStore } from '../../core/services/app-store.service';
import { StatusBadge } from './status-badge';

/** Data needed by the summary: a saved appointment or a booking still being confirmed. */
export type AppointmentSummaryData = Pick<
  Appointment,
  'dentistId' | 'procedureId' | 'dentistName' | 'procedureName' | 'durationMinutes' | 'date' | 'time'
> &
  Partial<Pick<Appointment, 'patientName' | 'patientPhone' | 'status' | 'code'>>;

const ROW =
  'relative col-span-2 min-h-19 min-w-0 border-b border-border py-3 pl-20 pr-5 last:border-0 hover:bg-muted/60';
const ROW_ICON =
  'absolute left-5 top-3 flex size-10 items-center justify-center rounded-md bg-accent text-accent-foreground';

/** Appointment details as a description list (prototype `CitaSummary`). Extra classes go in `class`. */
@Component({
  selector: 'dl[appAppointmentSummary]',
  imports: [StatusBadge, LucideCalendarDays, LucideClock, LucideStethoscope, LucideUser, LucidePhone],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'grid grid-cols-[minmax(0,1fr)_auto] rounded-xl border border-border bg-card' },
  template: `
    @let a = appointment();
    @if (a.code) {
      <div class="min-w-0 border-b border-border py-4 pl-5" [class.col-span-2]="!a.status" [class.pr-5]="!a.status">
        <dt class="text-xs font-medium text-muted-foreground">Código de la cita</dt>
        <dd class="font-mono text-sm font-semibold tracking-wide break-words">{{ a.code }}</dd>
      </div>
    }
    @if (a.status) {
      <div
        class="flex items-center border-b border-border py-4 pr-5"
        [class.col-span-2]="!a.code"
        [class.pl-3]="a.code"
        [class.pl-5]="!a.code"
      >
        <dt class="sr-only">Estado</dt>
        <dd><span appStatusBadge [status]="a.status"></span></dd>
      </div>
    }
    <div class="${ROW}">
      <dt class="text-xs font-medium text-muted-foreground">
        <span class="${ROW_ICON}" aria-hidden="true"><svg lucideCalendarDays class="size-5"></svg></span>
        Fecha
      </dt>
      <dd class="text-sm font-medium leading-snug text-pretty">
        <span class="inline-block first-letter:uppercase">{{ formatLongDate(a.date) }}</span>
        <span class="block text-xs text-muted-foreground">{{ formatDate(a.date) }}</span>
      </dd>
    </div>
    <div class="${ROW}">
      <dt class="text-xs font-medium text-muted-foreground">
        <span class="${ROW_ICON}" aria-hidden="true"><svg lucideClock class="size-5"></svg></span>
        Hora
      </dt>
      <dd class="text-sm font-medium leading-snug text-pretty tabular-nums">
        {{ formatTime(a.time) }}
        @if (end()) {
          <span class="text-muted-foreground"> a {{ end() }}</span>
        }
      </dd>
    </div>
    <div class="${ROW}">
      <dt class="text-xs font-medium text-muted-foreground">
        <span class="${ROW_ICON}" aria-hidden="true"><svg lucideStethoscope class="size-5"></svg></span>
        Procedimiento
      </dt>
      <dd class="text-sm font-medium leading-snug text-pretty">
        {{ a.procedureName }}
        <span class="text-muted-foreground"> · {{ a.durationMinutes }} min</span>
      </dd>
    </div>
    <div class="${ROW}">
      <dt class="text-xs font-medium text-muted-foreground">
        <span class="${ROW_ICON}" aria-hidden="true"><svg lucideUser class="size-5"></svg></span>
        Odontólogo
      </dt>
      <dd class="text-sm font-medium leading-snug text-pretty">
        {{ a.dentistName }}
        @if (specialty(); as specialty) {
          <span class="block text-xs text-muted-foreground">{{ specialty }}</span>
        }
      </dd>
    </div>
    @if (showPatient() && a.patientName) {
      <div class="${ROW}">
        <dt class="text-xs font-medium text-muted-foreground">
          <span class="${ROW_ICON}" aria-hidden="true"><svg lucidePhone class="size-5"></svg></span>
          Paciente
        </dt>
        <dd class="text-sm font-medium leading-snug text-pretty">
          {{ a.patientName }}
          @if (a.patientPhone) {
            <span class="block text-xs text-muted-foreground">{{ formatPhone(a.patientPhone) }}</span>
          }
        </dd>
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
  protected readonly end = computed(() => formatTimeFromMinutes(endOf(this.appointment())));
  // The appointment carries the dentist's name only; the specialty comes from the loaded catalog.
  private readonly store = inject(AppStore);
  protected readonly specialty = computed(() => this.store.dentistById(this.appointment().dentistId)?.specialty);
}
