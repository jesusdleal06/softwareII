import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucidePlus } from '@lucide/angular';
import { DENTISTS } from '../../../core/data/mock-data';
import { STATUS_STYLES } from '../../../core/data/status-styles';
import { toDateKey } from '../../../core/domain';
import { AppointmentStatus } from '../../../core/models';
import { AppStore } from '../../../core/services/app-store.service';
import { BigButton } from '../../../shared/ui/big-button';
import { cn } from '../../../shared/ui/class-names';
import { SelectField, SelectOption } from '../../../shared/ui/field';
import { AppointmentDetail } from '../components/appointment-detail';
import { DateNav } from '../components/date-nav';
import { DayAgenda } from '../components/day-agenda';
import { NewAppointmentPanel } from '../components/new-appointment-panel';

const LEGEND: readonly AppointmentStatus[] = [
  'Pendiente',
  'Confirmada',
  'Reprogramada',
  'Atendida',
  'No asistió',
  'Cancelada',
];

/** Full day agenda for the administrative assistant (prototype `AgendaView`, container). */
@Component({
  selector: 'app-agenda-page',
  imports: [BigButton, SelectField, DateNav, DayAgenda, AppointmentDetail, NewAppointmentPanel, LucidePlus],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div class="flex flex-col gap-1">
        <h1 class="text-2xl font-bold tracking-tight">Agenda del día</h1>
        <p class="text-base text-muted-foreground">{{ countText() }}</p>
      </div>
      <button type="button" appBigButton size="lg" (click)="newOpen.set(true)">
        <svg lucidePlus></svg> Nueva cita manual
      </button>
    </div>

    <div class="flex flex-col gap-4 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
      <app-date-nav [date]="date()" [today]="today" (dateChange)="date.set($event)" />
      <div class="w-full lg:w-72">
        <app-select-field
          fieldId="filtro-dentista"
          label="Odontólogo"
          placeholder="Todos los odontólogos"
          [options]="dentistOptions"
          [value]="dentistId()"
          inputClass="min-h-12 text-base"
          (valueChange)="dentistId.set($event)"
        />
      </div>
    </div>

    <ul class="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Leyenda de estados">
      @for (item of legend; track item.status) {
        <li class="flex items-center gap-2">
          <span [class]="item.swatch" aria-hidden="true"></span>
          {{ item.status }}
        </li>
      }
    </ul>

    <app-day-agenda
      [dentists]="dentists()"
      [appointments]="dayAppointments()"
      [dateKey]="date()"
      [now]="now"
      (selected)="selectedId.set($event.id)"
    />

    <app-appointment-detail [appointmentId]="selectedId()" (closed)="selectedId.set(null)" />
    <app-new-appointment-panel [open]="newOpen()" [initialDate]="date()" (closed)="newOpen.set(false)" />
  `,
})
export class AgendaPage {
  private readonly store = inject(AppStore);

  protected readonly now = this.store.now();
  protected readonly today = toDateKey(this.now);
  protected readonly dentistOptions: SelectOption[] = DENTISTS.map((d) => ({ value: d.id, label: d.name }));
  protected readonly legend = LEGEND.map((status) => ({
    status,
    swatch: cn('h-4 w-6 rounded-sm border-l-4', STATUS_STYLES[status].block.replace('line-through', '')),
  }));

  protected readonly date = signal(this.today);
  protected readonly dentistId = signal('');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly newOpen = signal(false);

  protected readonly dentists = computed(() => {
    const id = this.dentistId();
    return id ? DENTISTS.filter((d) => d.id === id) : DENTISTS;
  });

  protected readonly dayAppointments = computed(() =>
    this.store.appointments().filter((a) => a.date === this.date()),
  );

  protected readonly countText = computed(() => {
    const n = this.dayAppointments().length;
    if (n === 0) return 'Sin citas registradas.';
    return `${n} cita${n === 1 ? '' : 's'} registrada${n === 1 ? '' : 's'}.`;
  });
}
