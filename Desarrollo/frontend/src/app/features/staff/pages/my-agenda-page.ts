import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { LucideEye } from '@lucide/angular';
import { DENTISTS } from '../../../core/data/mock-data';
import { formatPhone, formatTime, isActiveStatus, procedureById, toDateKey } from '../../../core/domain';
import { AppStore } from '../../../core/services/app-store.service';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { AppointmentDetail } from '../components/appointment-detail';
import { DateNav } from '../components/date-nav';
import { DayAgenda } from '../components/day-agenda';

/** Read-only agenda of the logged-in dentist (prototype `MiAgendaView`, container). */
@Component({
  selector: 'app-my-agenda-page',
  imports: [DateNav, DayAgenda, AppointmentDetail, StatusBadge, LucideEye],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-4' },
  template: `
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold tracking-tight">Mi agenda</h1>
      <p class="flex items-center gap-2 text-base text-muted-foreground">
        <svg lucideEye class="size-5" aria-hidden="true"></svg>
        Vista de solo lectura. Para cambios, comunícate con la auxiliar administrativa.
      </p>
    </div>

    <div class="rounded-2xl border bg-card p-4">
      <app-date-nav [date]="date()" [today]="today" (dateChange)="date.set($event)" />
    </div>

    <div class="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <app-day-agenda
        [dentists]="dentists()"
        [appointments]="own()"
        [dateKey]="date()"
        [now]="now"
        (selected)="selectedId.set($event.id)"
      />

      <aside class="flex flex-col gap-3 rounded-2xl border bg-card p-4" aria-labelledby="lista-pacientes">
        <h2 id="lista-pacientes" class="text-lg font-bold">
          Pacientes del día
          <span class="text-base font-medium text-muted-foreground">({{ pendingCount() }} por atender)</span>
        </h2>
        @if (sorted().length === 0) {
          <p class="rounded-xl border border-dashed bg-muted/40 px-4 py-6 text-center text-base text-muted-foreground">
            No tienes citas este día.
          </p>
        } @else {
          <ul class="flex flex-col divide-y">
            @for (c of sorted(); track c.id) {
              <li>
                <button
                  type="button"
                  (click)="selectedId.set(c.id)"
                  class="flex w-full min-h-14 items-start justify-between gap-3 py-3 text-left hover:bg-muted/60 rounded-lg px-2 -mx-2 outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
                >
                  <span class="flex flex-col">
                    <span class="font-semibold">{{ formatTime(c.time) }} · {{ c.patientName }}</span>
                    <span class="text-sm text-muted-foreground">
                      {{ procedureName(c.procedureId) }} · {{ formatPhone(c.patientPhone) }}
                    </span>
                  </span>
                  <span appStatusBadge [status]="c.status" class="mt-0.5"></span>
                </button>
              </li>
            }
          </ul>
        }
      </aside>
    </div>

    <app-appointment-detail [appointmentId]="selectedId()" [readOnly]="true" (closed)="selectedId.set(null)" />
  `,
})
export class MyAgendaPage {
  private readonly store = inject(AppStore);

  protected readonly formatTime = formatTime;
  protected readonly formatPhone = formatPhone;
  protected readonly now = this.store.now();
  protected readonly today = toDateKey(this.now);

  protected readonly date = signal(this.today);
  protected readonly selectedId = signal<string | null>(null);

  /** The session's dentist (the prototype falls back to the first dentist). */
  private readonly dentist = computed(
    () => DENTISTS.find((d) => d.id === this.store.session()?.dentistId) ?? DENTISTS[0],
  );
  protected readonly dentists = computed(() => [this.dentist()]);

  protected readonly own = computed(() =>
    this.store.appointments().filter((a) => a.dentistId === this.dentist().id && a.date === this.date()),
  );
  protected readonly sorted = computed(() => [...this.own()].sort((a, b) => a.time.localeCompare(b.time)));
  protected readonly pendingCount = computed(() => this.sorted().filter((a) => isActiveStatus(a.status)).length);

  protected procedureName(id: string): string {
    return procedureById(id)?.name ?? '';
  }
}
