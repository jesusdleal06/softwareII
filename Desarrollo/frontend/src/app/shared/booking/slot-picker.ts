import { ChangeDetectionStrategy, Component, computed, input, OnInit, output, signal } from '@angular/core';
import { LucideCheck, LucideChevronLeft, LucideChevronRight, LucideClock } from '@lucide/angular';
import { DENTISTS, PROCEDURES } from '../../core/data/mock-data';
import {
  addDays,
  availableSlots,
  dentistById,
  formatTime,
  fromDateKey,
  isMorning,
  isPastDate,
  mondayOf,
  monthName,
  procedureById,
  shortDayName,
  toDateKey,
  workWeek,
} from '../../core/domain';
import { Appointment } from '../../core/models';
import { cn } from '../ui/class-names';
import { SelectField, SelectOption } from '../ui/field';

export interface SlotSelection {
  dentistId: string;
  procedureId: string;
  date: string;
  time: string;
}

const CARD_FOCUS = 'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring';
const NAV_BUTTON =
  'flex size-12 items-center justify-center rounded-xl border bg-card hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring';
const EMPTY_HINT =
  'rounded-2xl border border-dashed bg-muted/40 px-4 py-6 text-center text-base text-muted-foreground text-pretty';

/**
 * Dentist, procedure, day and hour picker. Presentational: availability is computed
 * from the `appointments` and `now` inputs; every change is emitted through `valueChange`.
 */
@Component({
  selector: 'app-slot-picker',
  imports: [SelectField, LucideCheck, LucideClock, LucideChevronLeft, LucideChevronRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-8' },
  template: `
    <!-- Dentist -->
    <section class="flex flex-col gap-3" aria-labelledby="sp-dentista">
      <h2 id="sp-dentista" class="text-lg font-bold">
        {{ fixedDentist() || compact() ? 'Odontólogo' : '1. ¿Con quién deseas tu cita?' }}
      </h2>
      @if (fixedDentist() && dentist(); as d) {
        <div class="flex items-center gap-3 rounded-2xl border bg-muted/50 px-4 py-3">
          <span
            class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-base font-bold text-primary-foreground"
            aria-hidden="true"
          >
            {{ d.initials }}
          </span>
          <span class="flex flex-col">
            <span class="font-semibold leading-tight">{{ d.name }}</span>
            <span class="text-sm text-muted-foreground">{{ d.specialty }}</span>
          </span>
        </div>
      } @else if (compact()) {
        <app-select-field
          fieldId="sp-dentista-select"
          label="Odontólogo"
          [labelHidden]="true"
          placeholder="Selecciona un odontólogo"
          [options]="dentistOptions"
          [value]="value().dentistId"
          (valueChange)="patch({ dentistId: $event })"
        />
      } @else {
        <div role="radiogroup" aria-label="Odontólogo" class="grid gap-3 sm:grid-cols-3" (keydown)="onGroupKeydown($event)">
          @for (d of dentists; track d.id) {
            @let active = value().dentistId === d.id;
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="active"
              [tabindex]="radioTabindex(value().dentistId, d.id, dentists[0].id)"
              (click)="patch({ dentistId: d.id })"
              [class]="
                cn(
                  'flex min-h-14 items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left ' + cardFocus,
                  active ? 'border-primary bg-accent/60' : 'border-border hover:border-primary/50'
                )
              "
            >
              <span
                [class]="
                  cn(
                    'flex size-12 shrink-0 items-center justify-center rounded-full text-base font-bold',
                    active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                  )
                "
                aria-hidden="true"
              >
                {{ d.initials }}
              </span>
              <span class="flex min-w-0 flex-1 flex-col">
                <span class="font-semibold leading-tight">{{ d.name }}</span>
                <span class="text-sm text-muted-foreground">{{ d.specialty }}</span>
              </span>
              @if (active) {
                <svg lucideCheck class="size-6 shrink-0 text-primary" aria-hidden="true"></svg>
              }
            </button>
          }
        </div>
      }
    </section>

    <!-- Procedure -->
    <section class="flex flex-col gap-3" aria-labelledby="sp-proc">
      <h2 id="sp-proc" class="text-lg font-bold">
        {{ fixedProcedure() || compact() ? 'Procedimiento' : '2. ¿Qué procedimiento necesitas?' }}
      </h2>
      @if (fixedProcedure() && procedure(); as p) {
        <div class="flex items-center justify-between rounded-2xl border bg-muted/50 px-4 py-3">
          <span class="font-semibold">{{ p.name }}</span>
          <span class="flex items-center gap-1 text-base text-muted-foreground">
            <svg lucideClock class="size-5" aria-hidden="true"></svg> {{ p.durationMinutes }} min
          </span>
        </div>
      } @else if (compact()) {
        <app-select-field
          fieldId="sp-proc-select"
          label="Procedimiento"
          [labelHidden]="true"
          placeholder="Selecciona un procedimiento"
          [options]="procedureOptions"
          [value]="value().procedureId"
          (valueChange)="patch({ procedureId: $event })"
        />
      } @else {
        <div role="radiogroup" aria-label="Procedimiento" class="grid gap-3 sm:grid-cols-2" (keydown)="onGroupKeydown($event)">
          @for (p of procedures; track p.id) {
            @let active = value().procedureId === p.id;
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="active"
              [tabindex]="radioTabindex(value().procedureId, p.id, procedures[0].id)"
              (click)="patch({ procedureId: p.id })"
              [class]="
                cn(
                  'flex min-h-14 items-center justify-between gap-3 rounded-2xl border-2 bg-card px-4 py-3 text-left ' +
                    cardFocus,
                  active ? 'border-primary bg-accent/60' : 'border-border hover:border-primary/50'
                )
              "
            >
              <span class="font-semibold">{{ p.name }}</span>
              <span class="flex items-center gap-1 text-base text-muted-foreground">
                <svg lucideClock class="size-5" aria-hidden="true"></svg> {{ p.durationMinutes }} min
              </span>
            </button>
          }
        </div>
      }
    </section>

    <!-- Day -->
    <section class="flex flex-col gap-3" aria-labelledby="sp-fecha">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sp-fecha" class="text-lg font-bold">
          {{ fixedProcedure() || compact() ? 'Día' : '3. Elige el día' }}
        </h2>
        <div class="flex w-full items-center gap-2 sm:w-auto">
          <button
            type="button"
            (click)="shiftWeek(-7)"
            [disabled]="isCurrentWeek()"
            aria-label="Semana anterior"
            [class]="cn(navButton, 'disabled:opacity-40')"
          >
            <svg lucideChevronLeft class="size-6"></svg>
          </button>
          <span class="min-w-0 flex-1 text-center text-base font-medium tabular-nums text-muted-foreground sm:min-w-44 sm:flex-none">{{ weekRange() }}</span>
          <button type="button" (click)="shiftWeek(7)" aria-label="Semana siguiente" [class]="navButton">
            <svg lucideChevronRight class="size-6"></svg>
          </button>
        </div>
      </div>
      <div role="radiogroup" aria-label="Día" class="grid grid-cols-3 gap-2 sm:grid-cols-6" (keydown)="onGroupKeydown($event)">
        @for (day of days(); track day.key) {
          @let active = value().date === day.key;
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="active"
            [tabindex]="radioTabindex(value().date, day.key, firstEnabledDay())"
            [disabled]="day.past"
            (click)="patch({ date: day.key })"
            [class]="
              cn(
                'flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-2xl border-2 bg-card ' +
                  cardFocus +
                  ' disabled:cursor-not-allowed disabled:opacity-40',
                active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'
              )
            "
          >
            <span [class]="cn('text-sm font-medium', active ? 'text-primary-foreground/80' : 'text-muted-foreground')">
              {{ day.shortName }}
            </span>
            <span class="text-2xl font-bold leading-none">{{ day.dayOfMonth }}</span>
            @if (day.today) {
              <span [class]="cn('text-xs font-semibold', active ? 'text-primary-foreground/80' : 'text-primary')">Hoy</span>
            }
          </button>
        }
      </div>
    </section>

    <!-- Hours -->
    <section class="flex flex-col gap-3" aria-labelledby="sp-hora" aria-live="polite">
      <h2 id="sp-hora" class="text-lg font-bold">
        {{ fixedProcedure() || compact() ? 'Hora disponible' : '4. Elige la hora' }}
      </h2>
      @if (!value().dentistId || !value().procedureId || !value().date) {
        <p [class]="emptyHint">
          Selecciona el odontólogo, el procedimiento y el día para ver los horarios disponibles.
        </p>
      } @else if (slots().length === 0) {
        <p [class]="emptyHint">No hay horarios disponibles este día. Prueba con otro día.</p>
      } @else {
        <div class="flex flex-col gap-4">
          @for (group of slotGroups(); track group.title) {
            <div class="flex flex-col gap-2">
              <p class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{{ group.title }}</p>
              <div
                role="radiogroup"
                [attr.aria-label]="'Horarios de la ' + group.title.toLowerCase()"
                class="grid grid-cols-3 gap-2 sm:grid-cols-4"
                (keydown)="onGroupKeydown($event)"
              >
                @for (slot of group.slots; track slot) {
                  @let active = value().time === slot;
                  <button
                    type="button"
                    role="radio"
                    [attr.aria-checked]="active"
                    [tabindex]="radioTabindex(value().time, slot, group.slots[0])"
                    (click)="selectTime(slot)"
                    [class]="
                      cn(
                        'min-h-12 rounded-xl border-2 bg-card px-2 text-base font-semibold ' + cardFocus,
                        active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:border-primary/50'
                      )
                    "
                  >
                    {{ formatTime(slot) }}
                  </button>
                }
              </div>
            </div>
          }
          @if (procedure(); as p) {
            <p class="text-sm text-muted-foreground">
              Solo se muestran horarios donde caben los {{ p.durationMinutes }} minutos del procedimiento dentro de la
              jornada.
            </p>
          }
        </div>
      }
    </section>
  `,
})
export class SlotPicker implements OnInit {
  readonly value = input.required<SlotSelection>();
  /** All appointments, used to compute free slots. */
  readonly appointments = input.required<readonly Appointment[]>();
  /** Current instant (today, past days and already-started times). */
  readonly now = input.required<Date>();
  /** Dentist cannot be changed (rescheduling). */
  readonly fixedDentist = input(false);
  /** Procedure cannot be changed (rescheduling). */
  readonly fixedProcedure = input(false);
  /** Appointment being rescheduled: its own slot does not count as busy. */
  readonly excludeAppointmentId = input<string>();
  /** Compact selects instead of cards (staff panel). */
  readonly compact = input(false);
  readonly valueChange = output<SlotSelection>();

  protected readonly cn = cn;
  protected readonly cardFocus = CARD_FOCUS;
  protected readonly navButton = NAV_BUTTON;
  protected readonly emptyHint = EMPTY_HINT;
  protected readonly formatTime = formatTime;
  protected readonly dentists = DENTISTS;
  protected readonly procedures = PROCEDURES;
  protected readonly dentistOptions: SelectOption[] = DENTISTS.map((d) => ({
    value: d.id,
    label: `${d.name} · ${d.specialty}`,
  }));
  protected readonly procedureOptions: SelectOption[] = PROCEDURES.map((p) => ({
    value: p.id,
    label: `${p.name} · ${p.durationMinutes} min`,
  }));

  /** Monday of the week on display; set from the initial value (or today) on init. */
  private readonly weekStart = signal<Date | null>(null);

  protected readonly dentist = computed(() => dentistById(this.value().dentistId));
  protected readonly procedure = computed(() => procedureById(this.value().procedureId));

  private readonly week = computed(() => workWeek(this.weekStart() ?? mondayOf(this.now())));

  protected readonly days = computed(() => {
    const now = this.now();
    const today = toDateKey(now);
    return this.week().map((d) => {
      const key = toDateKey(d);
      return {
        key,
        shortName: shortDayName(d),
        dayOfMonth: d.getDate(),
        past: isPastDate(key, now),
        today: key === today,
      };
    });
  });

  protected readonly isCurrentWeek = computed(
    () => toDateKey(this.week()[0]) === toDateKey(mondayOf(this.now())),
  );

  protected readonly weekRange = computed(() => {
    const [first, , , , , last] = this.week();
    return `${first.getDate()} - ${last.getDate()} de ${monthName(last)} de ${last.getFullYear()}`;
  });

  protected readonly slots = computed(() => {
    const { dentistId, date } = this.value();
    const procedure = this.procedure();
    if (!dentistId || !procedure || !date) return [];
    return availableSlots({
      dentistId,
      date,
      durationMinutes: procedure.durationMinutes,
      appointments: this.appointments(),
      now: this.now(),
      excludeAppointmentId: this.excludeAppointmentId(),
    });
  });

  protected readonly slotGroups = computed(() => {
    const slots = this.slots();
    return [
      { title: 'Mañana', slots: slots.filter(isMorning) },
      { title: 'Tarde', slots: slots.filter((s) => !isMorning(s)) },
    ].filter((g) => g.slots.length > 0);
  });

  ngOnInit(): void {
    const date = this.value().date;
    this.weekStart.set(mondayOf(date ? fromDateKey(date) : this.now()));
  }

  protected shiftWeek(days: number): void {
    this.weekStart.update((start) => addDays(start ?? mondayOf(this.now()), days));
  }

  /** Changing dentist, procedure or day clears the chosen hour. */
  protected patch(change: Partial<Omit<SlotSelection, 'time'>>): void {
    this.valueChange.emit({ ...this.value(), time: '', ...change });
  }

  protected selectTime(time: string): void {
    this.valueChange.emit({ ...this.value(), time });
  }

  /** First selectable day key (past days are disabled and skipped by keyboard). */
  protected readonly firstEnabledDay = computed(() => this.days().find((d) => !d.past)?.key ?? '');

  /**
   * Roving tabindex for radiogroups: the checked option — or the first
   * enabled one when nothing is checked — is the single tab stop.
   */
  protected radioTabindex(activeId: string, id: string, firstEnabledId: string): number {
    if (id === activeId) return 0;
    if (activeId) return -1;
    return id === firstEnabledId ? 0 : -1;
  }

  /** Arrow-key navigation with automatic selection (WAI-APG radio group pattern). */
  protected onGroupKeydown(event: KeyboardEvent): void {
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const group = event.currentTarget as HTMLElement | null;
    const buttons = group ? Array.from(group.querySelectorAll<HTMLButtonElement>('button:not([disabled])')) : [];
    if (buttons.length === 0) return;
    event.preventDefault();
    let index = buttons.findIndex((b) => b === document.activeElement);
    if (event.key === 'Home') index = 0;
    else if (event.key === 'End') index = buttons.length - 1;
    else if (index === -1) index = 0;
    else {
      const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
      index = (index + delta + buttons.length) % buttons.length;
    }
    buttons[index].focus();
    buttons[index].click();
  }
}
