import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { LucideEye } from '@lucide/angular';
import { formatPhone, formatTime, isActiveStatus, toDateKey } from '../../../core/domain';
import { AppStore } from '../../../core/services/app-store.service';
import { StatusBadge } from '../../../shared/ui/status-badge';
import { AppointmentDetail } from '../components/appointment-detail';
import { DateNav } from '../components/date-nav';
import { DayAgenda, SINGLETON_FRAME_CONTENT_WIDTH } from '../components/day-agenda';

/** Read-only agenda of the logged-in dentist (prototype `MiAgendaView`, container). */
@Component({
  selector: 'app-my-agenda-page',
  imports: [DateNav, DayAgenda, AppointmentDetail, StatusBadge, LucideEye],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="page-header">
      <h1 class="page-title">Mi agenda</h1>
      <p class="page-subtitle flex items-center gap-2 text-pretty">
        <svg lucideEye class="size-4 shrink-0" aria-hidden="true"></svg>
        Vista de solo lectura. Para cambios, comunícate con la auxiliar administrativa.
      </p>
    </div>

    <div class="card">
      <app-date-nav [date]="date()" [today]="today" (dateChange)="date.set($event)" />
    </div>

    <div
      class="grid gap-4 lg:items-start lg:grid-cols-[minmax(0,var(--timeline-track,1fr))_22rem]"
      [style.--timeline-track]="own().length ? singletonTrackWidth : null"
    >
      <app-day-agenda
        [dentists]="dentists()"
        [appointments]="own()"
        [dateKey]="date()"
        [now]="now"
        emptyHint="Cambia de fecha."
        (selected)="selectedId.set($event.id)"
      />

      <aside class="card flex flex-col gap-3 self-start" aria-labelledby="lista-pacientes">
        <h2 id="lista-pacientes" class="card-title">
          Pacientes del día
          <span class="card-subtitle font-normal tabular-nums">({{ pendingCount() }} por atender)</span>
        </h2>
        @if (sorted().length === 0) {
          <p class="py-6 text-center text-xs text-muted-foreground">
            No tienes citas este día.
          </p>
        } @else {
          <ul class="flex flex-col">
            @for (c of sorted(); track c.id) {
              <li class="row">
                <button
                  type="button"
                  (click)="selectedId.set(c.id)"
                  class="flex w-full items-start justify-between gap-3 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >
                  <span class="flex min-w-0 flex-col">
                    <span class="truncate text-sm font-medium text-foreground tabular-nums">
                      {{ formatTime(c.time) }} · {{ c.patientName }}
                    </span>
                    <span class="truncate text-xs text-muted-foreground tabular-nums">
                      {{ c.procedureName }} · {{ formatPhone(c.patientPhone) }}
                    </span>
                  </span>
                  <span appStatusBadge [status]="c.status" class="mt-0.5 shrink-0"></span>
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
  // The shared content-box cap excludes the two 1px borders on the frame.
  protected readonly singletonTrackWidth = `calc(${SINGLETON_FRAME_CONTENT_WIDTH} + 2px)`;

  protected readonly date = signal(this.today);
  protected readonly selectedId = signal<string | null>(null);

  /** The session's dentist (the prototype falls back to the first dentist). */
  private readonly dentist = computed(() => {
    const id = this.store.session()?.dentistId;
    return this.store.dentists().find((d) => d.id === id) ?? this.store.dentists()[0];
  });
  protected readonly dentists = computed(() => {
    const dentist = this.dentist();
    return dentist ? [dentist] : [];
  });

  constructor() {
    effect(() => {
      const date = this.date();
      const dentist = this.dentist();
      if (!dentist) return;
      void this.store
        .ensureCatalogs()
        .then(() => this.store.loadAgenda(date, dentist.id))
        .catch(() => undefined);
    });
  }

  protected readonly own = computed(() =>
    this.store.appointments().filter((a) => a.dentistId === this.dentist()?.id && a.date === this.date()),
  );
  protected readonly sorted = computed(() => [...this.own()].sort((a, b) => a.time.localeCompare(b.time)));
  protected readonly pendingCount = computed(() => this.sorted().filter((a) => isActiveStatus(a.status)).length);

  protected procedureName(name: string): string {
    return name;
  }
}
