import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, output, signal } from '@angular/core';
import { LucideCheck, LucideChevronLeft, LucideChevronRight, LucideClock } from '@lucide/angular';
import {
  addDays,
  formatLongDate,
  formatTime,
  fromDateKey,
  isMorning,
  isPastDate,
  isWorkingDay,
  mondayOf,
  monthName,
  shortDayName,
  toDateKey,
  workWeek,
} from '../../core/domain';
import { Dentist, Procedure } from '../../core/models';
import { AppStore } from '../../core/services/app-store.service';
import { cn } from '../ui/class-names';
import { SelectField, SelectOption } from '../ui/field';

export interface SlotSelection {
  dentistId: string;
  procedureId: string;
  date: string;
  time: string;
}

const CARD_FOCUS =
  'transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';
/**
 * Every option the visitor can pick carries the `border-input` boundary at full
 * strength (the only one that reaches 3:1) and swaps it for `--primary` when it is
 * the chosen one; `border-border` is reserved for separators (deviation L4).
 */
const OPTION_IDLE = 'border-input hover:border-primary/40';
const OPTION_ACTIVE = 'border-primary bg-accent/60';
const NAV_BUTTON =
  'flex size-12 items-center justify-center rounded-md border border-input bg-card outline-none transition-colors hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';
const EMPTY_HINT =
  'rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground text-pretty';

/**
 * Dentist, procedure, day and hour picker. Catalogs arrive as inputs; free slots come
 * from the API whenever the selection changes. Every change is emitted through `valueChange`.
 */
@Component({
  selector: 'app-slot-picker',
  imports: [SelectField, LucideCheck, LucideClock, LucideChevronLeft, LucideChevronRight],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <!-- Dentist -->
    <section class="flex flex-col gap-3" aria-labelledby="sp-dentista">
      <h2 id="sp-dentista" class="card-title">
        {{ fixedDentist() || compact() ? 'Odontólogo' : '1. ¿Con quién deseas tu cita?' }}
      </h2>
      @if (fixedDentist() && dentist(); as d) {
        <div class="flex items-center gap-3 rounded-md border border-border bg-muted px-4 py-3 dark:bg-secondary">
          <span
            class="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
            aria-hidden="true"
          >
            {{ d.initials }}
          </span>
          <span class="flex min-w-0 flex-col">
            <span class="text-sm font-medium leading-tight">{{ d.name }}</span>
            <span class="text-xs text-muted-foreground">{{ d.specialty }}</span>
          </span>
        </div>
      } @else if (compact()) {
        <app-select-field
          fieldId="sp-dentista-select"
          label="Odontólogo"
          [labelHidden]="true"
          placeholder="Selecciona un odontólogo"
          [options]="dentistOptions()"
          [value]="value().dentistId"
          (valueChange)="patch({ dentistId: $event })"
        />
      } @else {
        <div role="radiogroup" aria-label="Odontólogo" class="grid gap-3 sm:grid-cols-3" (keydown)="onGroupKeydown($event)">
          @for (d of capableDentists(); track d.id) {
            @let active = value().dentistId === d.id;
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="active"
              [tabindex]="radioTabindex(value().dentistId, d.id, capableDentists()[0].id)"
              [class.col-span-full]="capableDentists().length === 1"
              (click)="patch({ dentistId: d.id })"
              [class]="
                cn(
                  'flex min-h-14 items-center gap-3 rounded-md border bg-card p-4 text-left ' + cardFocus,
                  active ? optionActive : optionIdle
                )
              "
            >
              @if (d.photoUrl) {
                <img [src]="d.photoUrl" alt="" class="size-11 shrink-0 rounded-full object-cover" />
              } @else {
                <span
                  [class]="
                    cn(
                      'flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'
                    )
                  "
                  aria-hidden="true"
                >
                  {{ d.initials }}
                </span>
              }
              <span class="flex min-w-0 flex-1 flex-col gap-0.5">
                <span class="text-sm font-medium leading-tight">{{ d.name }}</span>
                <span class="text-xs text-muted-foreground">{{ d.specialty }}</span>
                @if (d.academicTitles?.length) {
                  <span class="text-xs font-medium text-foreground/80">
                    {{ d.academicTitles?.join(' · ') }}
                  </span>
                }
                @if (d.description) {
                  <span class="text-xs text-pretty text-muted-foreground">{{ d.description }}</span>
                }
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
      <h2 id="sp-proc" class="card-title">
        {{ fixedProcedure() || compact() ? 'Procedimiento' : '2. ¿Qué procedimiento necesitas?' }}
      </h2>
      @if (fixedProcedure() && procedure(); as p) {
        <div class="flex items-center justify-between rounded-md border border-border bg-muted px-4 py-3 dark:bg-secondary">
          <span class="text-sm font-medium">{{ p.name }}</span>
          <span class="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
            <svg lucideClock class="size-4" aria-hidden="true"></svg> {{ p.durationMinutes }} min
          </span>
        </div>
      } @else if (compact()) {
        <app-select-field
          fieldId="sp-proc-select"
          label="Procedimiento"
          [labelHidden]="true"
          placeholder="Selecciona un procedimiento"
          [options]="procedureOptions()"
          [value]="value().procedureId"
          (valueChange)="patch({ procedureId: $event })"
        />
      } @else {
        <div role="radiogroup" aria-label="Procedimiento" class="grid gap-3 sm:grid-cols-2" (keydown)="onGroupKeydown($event)">
          @for (p of procedures(); track p.id) {
            @let active = value().procedureId === p.id;
            <button
              type="button"
              role="radio"
              [attr.aria-checked]="active"
              [tabindex]="radioTabindex(value().procedureId, p.id, procedures()[0].id)"
              [class.col-span-full]="procedures().length === 1"
              (click)="patch({ procedureId: p.id })"
              [class]="
                cn(
                  'flex min-h-14 items-center justify-between gap-3 rounded-md border bg-card px-4 py-3 text-left ' +
                    cardFocus,
                  active ? optionActive : optionIdle
                )
              "
            >
              <span class="text-sm font-medium">{{ p.name }}</span>
              <span class="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                <svg lucideClock class="size-4" aria-hidden="true"></svg> {{ p.durationMinutes }} min
              </span>
            </button>
          }
        </div>
      }
    </section>

    <!-- Day -->
    <section class="flex flex-col gap-3" aria-labelledby="sp-fecha">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <h2 id="sp-fecha" class="card-title">
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
          <span class="min-w-0 flex-1 text-center text-sm font-medium tabular-nums text-muted-foreground sm:min-w-44 sm:flex-none">{{ weekRange() }}</span>
          <button type="button" (click)="shiftWeek(7)" aria-label="Semana siguiente" [class]="navButton">
            <svg lucideChevronRight class="size-6"></svg>
          </button>
        </div>
      </div>
      <div role="radiogroup" aria-label="Día" class="grid grid-cols-3 gap-2 sm:grid-cols-7" (keydown)="onGroupKeydown($event)">
        @for (day of days(); track day.key) {
          @let active = value().date === day.key;
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="active"
            [attr.aria-label]="day.closedLabel"
            [tabindex]="!day.past && !day.closed && day.key === dayTabStop() ? 0 : -1"
            [disabled]="day.past || day.closed"
            (click)="patch({ date: day.key })"
            [class]="
              cn(
                'flex min-h-20 flex-col items-center justify-center gap-0.5 rounded-md border bg-card ' +
                  cardFocus +
                  ' disabled:cursor-not-allowed disabled:opacity-40',
                active ? 'border-primary bg-primary text-primary-foreground' : optionIdle
              )
            "
          >
            <span [class]="cn('text-xs font-medium', active ? 'text-primary-foreground/80' : 'text-muted-foreground')">
              {{ day.shortName }}
            </span>
            <span class="text-xl font-semibold leading-none tabular-nums">{{ day.dayOfMonth }}</span>
            @if (day.closed) {
              <span class="text-xs font-semibold text-muted-foreground">Cerrado</span>
            } @else if (day.today) {
              <span [class]="cn('text-xs font-semibold', active ? 'text-primary-foreground/80' : 'text-primary')">Hoy</span>
            }
          </button>
        }
      </div>
    </section>

    <!-- Hours -->
    <section class="flex flex-col gap-3" aria-labelledby="sp-hora" aria-live="polite">
      <h2 id="sp-hora" class="card-title">
        {{ fixedProcedure() || compact() ? 'Hora disponible' : '4. Elige la hora' }}
      </h2>
      @if (!value().dentistId || !value().procedureId || !value().date) {
        <p [class]="emptyHint">
          Selecciona el odontólogo, el procedimiento y el día para ver los horarios disponibles.
        </p>
      } @else if (closedDay()) {
        <p [class]="emptyHint">La clínica no abre los sábados. Elige otro día.</p>
      } @else if (loadingSlots()) {
        <p role="status" [class]="emptyHint">Buscando horarios disponibles…</p>
      } @else if (slotsError()) {
        <p role="alert" [class]="emptyHint">No pudimos cargar los horarios. Intenta de nuevo.</p>
      } @else if (slots().length === 0) {
        <p [class]="emptyHint">No hay horarios disponibles este día. Prueba con otro día.</p>
      } @else {
        <div class="flex flex-col gap-4">
          @for (group of slotGroups(); track group.title) {
            <div class="flex flex-col gap-2">
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">{{ group.title }}</p>
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
                    [tabindex]="slot === timeTabStop(group.slots) ? 0 : -1"
                    (click)="selectTime(slot)"
                    [class]="
                      cn(
                        'min-h-10 rounded-md border bg-card px-2 text-sm font-medium tabular-nums ' + cardFocus,
                        active ? 'border-primary bg-primary text-primary-foreground' : optionIdle
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
            <p class="text-xs text-muted-foreground">
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
  readonly dentists = input.required<readonly Dentist[]>();
  readonly procedures = input.required<readonly Procedure[]>();
  /** Current instant (today and past days). */
  readonly now = input.required<Date>();
  /** Dentist cannot be changed (rescheduling). */
  readonly fixedDentist = input(false);
  /** Procedure cannot be changed (rescheduling). */
  readonly fixedProcedure = input(false);
  /** Compact selects instead of cards (staff panel). */
  readonly compact = input(false);
  readonly valueChange = output<SlotSelection>();

  protected readonly cn = cn;
  protected readonly cardFocus = CARD_FOCUS;
  protected readonly navButton = NAV_BUTTON;
  protected readonly optionIdle = OPTION_IDLE;
  protected readonly optionActive = OPTION_ACTIVE;
  protected readonly emptyHint = EMPTY_HINT;
  protected readonly formatTime = formatTime;
  private readonly store = inject(AppStore);
  protected readonly dentistOptions = computed<SelectOption[]>(() =>
    this.capableDentists().map((d) => ({ value: d.id, label: `${d.name} · ${d.specialty}` })),
  );
  protected readonly procedureOptions = computed<SelectOption[]>(() =>
    this.procedures().map((p) => ({ value: p.id, label: `${p.name} · ${p.durationMinutes} min` })),
  );
  protected readonly loadingSlots = signal(false);
  protected readonly slotsError = signal(false);
  private readonly slotsState = signal<string[]>([]);
  private lastKey = '';
  private requestSeq = 0;

  /** Monday of the week on display; set from the initial value (or today) on init. */
  private readonly weekStart = signal<Date | null>(null);

  protected readonly dentist = computed(() =>
    this.capableDentists().find((d) => d.id === this.value().dentistId),
  );
  protected readonly procedure = computed(() =>
    this.procedures().find((p) => p.id === this.value().procedureId),
  );

  /**
   * Dentists who perform the chosen procedure. A catalog entry without an explicit
   * assignment keeps every dentist available, so legacy entries stay bookable.
   */
  protected readonly capableDentists = computed<readonly Dentist[]>(() => {
    const dentistIds = this.procedure()?.dentistIds ?? [];
    const dentists = this.dentists();
    return dentistIds.length === 0
      ? dentists
      : dentists.filter((d) => dentistIds.includes(d.id));
  });

  private readonly week = computed(() => workWeek(this.weekStart() ?? mondayOf(this.now())));

  protected readonly days = computed(() => {
    const now = this.now();
    const today = toDateKey(now);
    return this.week().map((d) => {
      const key = toDateKey(d);
      const closed = !isWorkingDay(key);
      return {
        key,
        shortName: shortDayName(d),
        dayOfMonth: d.getDate(),
        past: isPastDate(key, now),
        today: key === today,
        closed,
        /** Closed days say why they cannot be picked; open days keep their visible text as the name. */
        closedLabel: closed ? `${formatLongDate(key)}: la clínica no abre` : null,
      };
    });
  });

  /** The chosen day is closed (Saturday): no hours are offered, not even from the API. */
  protected readonly closedDay = computed(() => {
    const date = this.value().date;
    return !!date && !isWorkingDay(date);
  });

  protected readonly isCurrentWeek = computed(
    () => toDateKey(this.week()[0]) === toDateKey(mondayOf(this.now())),
  );

  protected readonly weekRange = computed(() => {
    const week = this.week();
    const first = week[0];
    const last = week[week.length - 1];
    return `${first.getDate()} - ${last.getDate()} de ${monthName(last)} de ${last.getFullYear()}`;
  });

  protected readonly slots = this.slotsState.asReadonly();

  protected readonly slotGroups = computed(() => {
    const slots = this.slots();
    return [
      { title: 'Mañana', slots: slots.filter(isMorning) },
      { title: 'Tarde', slots: slots.filter((s) => !isMorning(s)) },
    ].filter((g) => g.slots.length > 0);
  });

  constructor() {
    effect(() => {
      const { dentistId, procedureId, date } = this.value();
      const key = dentistId && procedureId && date ? `${dentistId}|${procedureId}|${date}` : '';
      if (!key) {
        this.lastKey = '';
        this.slotsState.set([]);
        this.loadingSlots.set(false);
        this.slotsError.set(false);
        return;
      }
      if (key === this.lastKey) return;
      this.lastKey = key;
      // A closed day has no windows: asking the API would invent hours the clinic never opens.
      if (!isWorkingDay(date)) {
        this.slotsState.set([]);
        this.loadingSlots.set(false);
        this.slotsError.set(false);
        return;
      }
      const seq = ++this.requestSeq;
      this.loadingSlots.set(true);
      this.slotsError.set(false);
      this.slotsState.set([]);
      this.store
        .availability(dentistId, procedureId, date)
        .then((slots) => {
          if (seq !== this.requestSeq) return;
          this.slotsState.set(slots);
          this.loadingSlots.set(false);
        })
        .catch(() => {
          if (seq !== this.requestSeq) return;
          this.slotsState.set([]);
          this.loadingSlots.set(false);
          this.slotsError.set(true);
        });
    });

    // Choosing a procedure that the selected dentist does not perform clears the dentist.
    effect(() => {
      if (this.fixedDentist()) return;
      const selected = this.value().dentistId;
      if (!selected) return;
      if (this.capableDentists().some((d) => d.id === selected)) return;
      this.valueChange.emit({ ...this.value(), dentistId: '', time: '' });
    });
  }

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

  /** A selection on another week must not remove the displayed week's tab stop. */
  protected readonly dayTabStop = computed(() => {
    const enabled = this.days().filter((day) => !day.past && !day.closed);
    return enabled.find((day) => day.key === this.value().date)?.key ?? enabled[0]?.key;
  });

  /** Morning and afternoon are separate keyboard groups, but share one selection. */
  protected timeTabStop(slots: readonly string[]): string | undefined {
    const selected = this.value().time;
    return slots.includes(selected) ? selected : slots[0];
  }

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
