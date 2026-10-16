import { ChangeDetectionStrategy, Component, computed, input, linkedSignal, output } from '@angular/core';
import { SHIFTS } from '../../../core/data/mock-data';
import { STATUS_STYLES } from '../../../core/data/status-styles';
import {
  endOf,
  formatPhone,
  formatTime,
  formatTimeFromMinutes,
  procedureById,
  toDateKey,
  toMinutes,
} from '../../../core/domain';
import { Appointment, Dentist } from '../../../core/models';
import { mediaQuery } from '../../../shared/browser/media-query';
import { cn } from '../../../shared/ui/class-names';

const DAY_START = SHIFTS[0].start; // 8:00
const DAY_END = SHIFTS[SHIFTS.length - 1].end; // 18:00
/** 30 min = 72px: enough for name + procedure without clipping. */
const PX_PER_MINUTE = 2.4;
/** Room so the first and last hour labels are not clipped. */
const MARGIN = 16;
const HEIGHT = (DAY_END - DAY_START) * PX_PER_MINUTE + MARGIN * 2;

function top(minutes: number): number {
  return (minutes - DAY_START) * PX_PER_MINUTE + MARGIN;
}

interface Block {
  appointment: Appointment;
  label: string;
  procedureName: string;
  range: string;
  phone: string;
  top: number;
  height: number;
  compact: boolean;
  tall: boolean;
  className: string;
}

/**
 * Day timeline with one column per dentist (prototype `DayAgenda`). Narrow screens show
 * one dentist at a time with tabs. Presentational: emits the clicked appointment.
 */
@Component({
  selector: 'app-day-agenda',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-3' },
  template: `
    @if (useTabs()) {
      <div role="group" aria-label="Odontólogo a mostrar" class="flex gap-2 overflow-x-auto pb-1">
        @for (d of dentists(); track d.id) {
          @let active = d.id === mobileDentistId();
          <button
            type="button"
            [attr.aria-pressed]="active"
            (click)="mobileDentistId.set(d.id)"
            [class]="
              cn(
                'flex min-h-12 shrink-0 items-center gap-2 rounded-full border px-4 text-base font-semibold transition-colors',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent'
              )
            "
          >
            <span
              [class]="
                cn(
                  'flex size-7 items-center justify-center rounded-full text-xs font-bold',
                  active ? 'bg-primary-foreground/20' : 'bg-accent text-accent-foreground'
                )
              "
              aria-hidden="true"
            >
              {{ d.initials }}
            </span>
            {{ d.name }}
          </button>
        }
      </div>
    }

    <div class="overflow-x-auto rounded-2xl border bg-card">
      <div class="grid" [style.grid-template-columns]="gridColumns()">
        <!-- Headers -->
        <div class="sticky top-0 z-10 border-b bg-card" aria-hidden="true"></div>
        @for (d of visibleDentists(); track d.id) {
          <div class="sticky top-0 z-10 flex min-w-0 items-center gap-3 border-b border-l bg-card px-3 py-3 sm:px-4">
            <span
              class="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
              aria-hidden="true"
            >
              {{ d.initials }}
            </span>
            <div class="flex min-w-0 flex-col leading-tight">
              <span class="truncate font-semibold">{{ d.name }}</span>
              <span class="truncate text-sm text-muted-foreground">{{ d.specialty }}</span>
            </div>
          </div>
        }

        <!-- Hour axis -->
        <div class="relative" [style.height.px]="height">
          @for (h of hours; track h) {
            <span
              class="absolute right-2 -translate-y-1/2 whitespace-nowrap text-sm font-medium text-muted-foreground"
              [style.top.px]="top(h)"
            >
              {{ formatTimeFromMinutes(h) }}
            </span>
          }
        </div>

        <!-- Columns -->
        @for (column of columns(); track column.dentist.id) {
          <div
            class="relative min-w-0 border-l"
            [style.height.px]="height"
            [attr.aria-label]="'Agenda de ' + column.dentist.name"
          >
            @for (h of hours; track h) {
              <div class="absolute inset-x-0 border-t border-border/70" [style.top.px]="top(h)" aria-hidden="true"></div>
            }
            @for (h of halfHours; track h) {
              <div
                class="absolute inset-x-0 border-t border-dashed border-border/50"
                [style.top.px]="top(h + 30)"
                aria-hidden="true"
              ></div>
            }
            <div
              class="absolute inset-x-0 flex items-center justify-center bg-[repeating-linear-gradient(135deg,transparent,transparent_8px,var(--color-muted)_8px,var(--color-muted)_16px)] text-sm font-medium text-muted-foreground"
              [style.top.px]="top(breakStart)"
              [style.height.px]="breakHeight"
              aria-hidden="true"
            >
              <span class="rounded-full bg-card px-3 py-1">Descanso</span>
            </div>
            @if (nowMinutes(); as minutes) {
              <div class="absolute inset-x-0 z-10 flex items-center" [style.top.px]="top(minutes)" aria-hidden="true">
                <span class="-ml-1.5 size-3 rounded-full bg-destructive"></span>
                <span class="h-0.5 flex-1 bg-destructive"></span>
              </div>
            }
            @for (b of column.blocks; track b.appointment.id) {
              <button
                type="button"
                (click)="selected.emit(b.appointment)"
                [attr.aria-label]="b.label"
                [class]="b.className"
                [style.top.px]="b.top + 2"
                [style.height.px]="b.height - 4"
              >
                @if (b.compact) {
                  <span class="flex items-center gap-2">
                    <span class="truncate text-sm font-bold">{{ b.appointment.patientName }}</span>
                    <span class="truncate text-xs">{{ b.procedureName }} · {{ b.range }}</span>
                    <span class="ml-auto shrink-0 text-xs font-semibold opacity-80">{{ b.appointment.status }}</span>
                  </span>
                } @else {
                  <span class="flex items-center justify-between gap-2">
                    <span class="truncate text-sm font-bold">{{ b.appointment.patientName }}</span>
                    <span class="hidden shrink-0 text-xs font-semibold opacity-80 sm:inline">{{
                      b.appointment.status
                    }}</span>
                  </span>
                  <span class="truncate text-sm">{{ b.procedureName }} · {{ b.range }}</span>
                  @if (b.tall) {
                    <span class="truncate text-xs opacity-80">{{ b.phone }}</span>
                  }
                }
              </button>
            }
          </div>
        }
      </div>
    </div>
  `,
})
export class DayAgenda {
  readonly dentists = input.required<readonly Dentist[]>();
  /** Appointments of the day (any dentist; each column keeps its own). */
  readonly appointments = input.required<readonly Appointment[]>();
  /** Day on display `yyyy-mm-dd`. */
  readonly dateKey = input.required<string>();
  /** Current instant, for the "now" line. */
  readonly now = input.required<Date>();
  readonly selected = output<Appointment>();

  protected readonly cn = cn;
  protected readonly top = top;
  protected readonly formatTimeFromMinutes = formatTimeFromMinutes;
  protected readonly height = HEIGHT;
  protected readonly hours = Array.from({ length: (DAY_END - DAY_START) / 60 + 1 }, (_, i) => DAY_START + i * 60);
  protected readonly halfHours = this.hours.slice(0, -1);
  protected readonly breakStart = SHIFTS[0].end;
  protected readonly breakHeight = (SHIFTS[1].start - SHIFTS[0].end) * PX_PER_MINUTE;

  /** Narrow screens cannot fit several columns: one dentist at a time with tabs. */
  private readonly narrow = mediaQuery('(max-width: 1023px)');

  /** Dentist shown on narrow screens; falls back to the first one when the list changes. */
  protected readonly mobileDentistId = linkedSignal<readonly Dentist[], string>({
    source: this.dentists,
    computation: (dentists, previous) =>
      previous && dentists.some((d) => d.id === previous.value) ? previous.value : (dentists[0]?.id ?? ''),
  });

  protected readonly useTabs = computed(() => this.narrow() && this.dentists().length > 1);

  protected readonly visibleDentists = computed(() =>
    this.useTabs() ? this.dentists().filter((d) => d.id === this.mobileDentistId()) : this.dentists(),
  );

  protected readonly gridColumns = computed(
    () => `5rem repeat(${this.visibleDentists().length}, minmax(0, 1fr))`,
  );

  /** Minutes of the current time when the day on display is today and within hours. */
  protected readonly nowMinutes = computed(() => {
    const now = this.now();
    const minutes = now.getHours() * 60 + now.getMinutes();
    return this.dateKey() === toDateKey(now) && minutes >= DAY_START && minutes <= DAY_END ? minutes : null;
  });

  protected readonly columns = computed(() =>
    this.visibleDentists().map((dentist) => ({
      dentist,
      blocks: this.appointments()
        .filter((a) => a.dentistId === dentist.id)
        .map((a) => toBlock(a)),
    })),
  );
}

function toBlock(appointment: Appointment): Block {
  const start = toMinutes(appointment.time);
  const end = endOf(appointment);
  const procedureName = procedureById(appointment.procedureId)?.name ?? '';
  const height = (end - start) * PX_PER_MINUTE;
  // 15-minute appointments: a single line.
  const compact = height < 60;
  return {
    appointment,
    label: `${appointment.patientName}, ${procedureName}, ${formatTime(appointment.time)}, ${appointment.status}`,
    procedureName,
    range: `${formatTime(appointment.time)}–${formatTimeFromMinutes(end)}`,
    phone: formatPhone(appointment.patientPhone),
    top: top(start),
    height,
    compact,
    tall: height >= 100,
    className: cn(
      'absolute inset-x-1.5 flex flex-col gap-0.5 overflow-hidden rounded-lg border-l-4 px-2.5 text-left leading-tight shadow-sm outline-none transition-shadow sm:px-3',
      compact ? 'justify-center py-0' : 'py-1.5',
      STATUS_STYLES[appointment.status].block,
      'hover:shadow-md focus-visible:ring-4 focus-visible:ring-ring/40',
    ),
  };
}
