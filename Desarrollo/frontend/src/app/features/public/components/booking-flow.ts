import { ViewportScroller } from '@angular/common';
import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, Injector, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowRight, LucideCalendarX2, LucideCircleCheck, LucideMessageCircle } from '@lucide/angular';
import { formatPhone, normalizePhone, PatientData, PatientErrors, reminderInfo, validatePatient } from '../../../core/domain';
import { Appointment } from '../../../core/models';
import { AppStore } from '../../../core/services/app-store.service';
import { AppointmentSummary } from '../../../shared/ui/appointment-summary';
import { BigButton } from '../../../shared/ui/big-button';
import { Stepper } from '../../../shared/ui/stepper';
import { AlertMessage } from '../../../shared/ui/alert-message';
import { PatientForm } from '../../../shared/booking/patient-form';
import { SlotPicker, SlotSelection } from '../../../shared/booking/slot-picker';

const STEPS = ['Elige tu horario', 'Tus datos', 'Confirma tu cita'] as const;
const CONFLICT_MESSAGE = 'Este horario acaba de ser ocupado. Por favor elige otro.';
const INCOMPLETE_MESSAGE = 'Selecciona el odontólogo, el procedimiento, el día y la hora para continuar.';

type Step = 1 | 2 | 3;
type View = Step | 'blocked' | 'success';

const EMPTY_SELECTION: SlotSelection = { dentistId: '', procedureId: '', date: '', time: '' };

/** Public three-step booking flow (container: talks to the store). */
@Component({
  selector: 'app-booking-flow',
  imports: [
    RouterLink,
    Stepper,
    SlotPicker,
    PatientForm,
    AppointmentSummary,
    BigButton,
    AlertMessage,
    LucideArrowLeft,
    LucideArrowRight,
    LucideCalendarX2,
    LucideCircleCheck,
    LucideMessageCircle,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @switch (view()) {
      @case ('success') {
        @if (created(); as appointment) {
          <div class="flex flex-col items-center gap-8 text-center">
            <span class="flex size-20 items-center justify-center rounded-full bg-success/15 text-success" aria-hidden="true">
              <svg lucideCircleCheck class="size-12"></svg>
            </span>
            <div class="flex flex-col gap-2">
              <h1 tabindex="-1" class="text-3xl font-bold tracking-tight text-balance sm:text-4xl">¡Tu cita quedó agendada!</h1>
              <p class="text-lg text-muted-foreground text-pretty">
                Guarda este código: <span class="font-mono font-bold text-foreground">{{ appointment.code }}</span>
              </p>
            </div>
            <dl appAppointmentSummary [appointment]="appointment" class="w-full text-left"></dl>
            <div class="flex w-full items-start gap-3 rounded-2xl bg-success/10 p-5 text-left dark:bg-success/20">
              <svg lucideMessageCircle class="mt-0.5 size-6 shrink-0 text-whatsapp" aria-hidden="true"></svg>
              <p class="text-base leading-relaxed text-pretty">
                Te enviaremos un recordatorio por WhatsApp al <strong>{{ formatPhone(appointment.patientPhone) }}</strong>
                {{ ' ' }}<strong>{{ reminderText(appointment) }}</strong>. Desde ese mensaje podrás confirmar, reprogramar o
                cancelar.
              </p>
            </div>
            <div class="flex w-full flex-col gap-3 sm:flex-row">
              <a appBigButton variant="outline" size="lg" class="flex-1" routerLink="/">Volver al inicio</a>
            </div>
          </div>
        }
      }
      @case ('blocked') {
        <div class="flex flex-col items-center gap-6 text-center">
          <span class="flex size-20 items-center justify-center rounded-full bg-warning/20 text-warning-foreground" aria-hidden="true">
            <svg lucideCalendarX2 class="size-12"></svg>
          </span>
          <h1 tabindex="-1" class="text-3xl font-bold tracking-tight text-balance">Ya tienes una cita programada</h1>
          <p class="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">
            Con el celular <strong class="text-foreground">{{ formatPhone(patient().phone) }}</strong> ya existe una cita
            activa. Para cuidar el tiempo de todos, cada paciente puede tener una sola cita pendiente a la vez. Usa el
            enlace personal de tu recordatorio para reprogramarla o cancelarla.
          </p>
          <button type="button" appBigButton variant="outline" size="lg" (click)="goTo(1)">
            <svg lucideArrowLeft aria-hidden="true"></svg> Volver
          </button>
        </div>
      }
      @default {
        @let current = step();
        <div class="flex flex-col gap-8">
          <ol appStepper [steps]="steps" [current]="current"></ol>

          <header class="flex flex-col gap-1">
            <p role="status" class="sr-only">{{ stepAnnouncement() }}</p>
            <h1 tabindex="-1" class="text-3xl font-bold tracking-tight text-balance">{{ steps[current - 1] }}</h1>
            @switch (current) {
              @case (1) {
                <p class="text-lg text-muted-foreground">Cada odontólogo tiene su propia agenda.</p>
              }
              @case (2) {
                <p class="text-lg text-muted-foreground">Solo necesitamos dos datos para reservar tu turno.</p>
              }
              @case (3) {
                <p class="text-lg text-muted-foreground">Revisa que todo esté correcto antes de confirmar.</p>
              }
            }
          </header>

          @if (notice(); as message) {
            <p appAlertMessage>{{ message }}</p>
          }

          @switch (current) {
            @case (1) {
              <app-slot-picker
                [value]="selection()"
                [dentists]="store.dentists()"
                [procedures]="store.procedures()"
                [now]="now"
                (valueChange)="onSelectionChange($event)"
              />
              @if (!selectionComplete()) {
                <p id="booking-continue-hint" class="text-sm text-muted-foreground">
                  Para continuar, elige odontólogo, procedimiento, día y hora.
                </p>
              }
              <button
                type="button"
                appBigButton
                size="xl"
                [full]="true"
                class="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                [attr.aria-disabled]="!selectionComplete() || null"
                [attr.aria-describedby]="selectionComplete() ? null : 'booking-continue-hint'"
                (click)="goToStep2()"
              >
                Continuar <svg lucideArrowRight aria-hidden="true"></svg>
              </button>
            }
            @case (2) {
              <form class="flex flex-col gap-8" novalidate (submit)="$event.preventDefault(); goToStep3()">
                <app-patient-form [data]="patient()" [errors]="errors()" (dataChange)="patient.set($event)" />
                <div class="flex flex-col gap-3 sm:flex-row-reverse">
                  <button type="submit" appBigButton size="xl" class="flex-1">Continuar <svg lucideArrowRight aria-hidden="true"></svg></button>
                  <button type="button" appBigButton variant="outline" size="xl" class="sm:w-auto" (click)="goTo(1)">
                    <svg lucideArrowLeft aria-hidden="true"></svg> Atrás
                  </button>
                </div>
              </form>
            }
            @case (3) {
              <div class="flex flex-col gap-8">
                <dl appAppointmentSummary [appointment]="draft()"></dl>
                <p class="flex items-start gap-3 rounded-2xl bg-success/10 p-4 text-base leading-relaxed text-pretty dark:bg-success/20">
                  <svg lucideMessageCircle class="mt-0.5 size-6 shrink-0 text-whatsapp" aria-hidden="true"></svg>
                  <span>
                    Recibirás un recordatorio por WhatsApp <strong>{{ reminderText(selection()) }}</strong>.
                  </span>
                </p>
                <div class="flex flex-col gap-3 sm:flex-row-reverse">
                  <button type="button" appBigButton size="xl" class="flex-1" [disabled]="saving()" (click)="confirm()">
                    {{ saving() ? 'Guardando…' : 'Confirmar cita' }}
                  </button>
                  <button type="button" appBigButton variant="outline" size="xl" class="sm:w-auto" (click)="goTo(2)">
                    <svg lucideArrowLeft aria-hidden="true"></svg> Atrás
                  </button>
                </div>
                <p class="text-center text-sm text-muted-foreground">
                  ¿Necesitas ayuda? Escríbenos al WhatsApp +57 300 123 4567 o
                  <a
                    routerLink="/"
                    class="rounded-md font-semibold text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                    >vuelve al inicio</a
                  >.
                </p>
              </div>
            }
          }
        </div>
      }
    }
  `,
})
export class BookingFlow implements OnInit {
  protected readonly store = inject(AppStore);
  private readonly scroller = inject(ViewportScroller);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  protected readonly steps = STEPS;
  protected readonly formatPhone = formatPhone;
  /** Fixed for the lifetime of the flow so the slot picker gets a stable input. */
  protected readonly now = this.store.now();

  protected readonly view = signal<View>(1);
  protected readonly selection = signal<SlotSelection>(EMPTY_SELECTION);
  protected readonly patient = signal<PatientData>({ name: '', phone: '' });
  protected readonly errors = signal<PatientErrors>({});
  protected readonly notice = signal<string | null>(null);
  protected readonly created = signal<Appointment | null>(null);
  protected readonly saving = signal(false);

  protected readonly step = computed<Step>(() => {
    const view = this.view();
    return typeof view === 'number' ? view : 1;
  });

  /** Natural-language step name for the live region (never a bare "Paso N" label). */
  protected readonly stepAnnouncement = computed(() => `Estás en: ${this.steps[this.step() - 1]}.`);

  protected readonly selectionComplete = computed(() => {
    const s = this.selection();
    return Boolean(s.dentistId && s.procedureId && s.date && s.time);
  });

  protected readonly draft = computed(() => {
    const selection = this.selection();
    const procedure = this.store.procedureById(selection.procedureId);
    return {
      ...selection,
      durationMinutes: procedure?.durationMinutes ?? 30,
      dentistName: this.store.dentistById(selection.dentistId)?.name ?? '',
      procedureName: procedure?.name ?? '',
      patientName: this.patient().name.trim(),
      patientPhone: this.patient().phone,
    };
  });

  ngOnInit(): void {
    void this.store.ensureCatalogs();
  }

  protected reminderText(appointment: Pick<Appointment, 'date' | 'time'>): string {
    return reminderInfo(appointment).text;
  }

  protected onSelectionChange(next: SlotSelection): void {
    this.selection.set(next);
    if (this.notice()) this.notice.set(null);
  }

  protected goToStep2(): void {
    if (!this.selectionComplete()) {
      this.notice.set(INCOMPLETE_MESSAGE);
      return;
    }
    this.notice.set(null);
    this.goTo(2);
  }

  protected goToStep3(): void {
    const errors = validatePatient(this.patient());
    this.errors.set(errors);
    if (Object.keys(errors).length > 0) {
      this.focusFirstInvalidField();
      return;
    }
    this.view.set(3);
    this.scrollToTop();
  }

  /** Moves to another step and re-anchors focus (used by every "Atrás" and "Volver"). */
  protected goTo(view: Step): void {
    this.view.set(view);
    this.scrollToTop();
  }

  /** Puts the caret on the first rejected field so keyboard users land on the error. */
  private focusFirstInvalidField(): void {
    afterNextRender(() => {
      const field = this.host.nativeElement.querySelector('input[aria-invalid="true"]') as HTMLInputElement | null;
      field?.focus({ preventScroll: true });
    }, { injector: this.injector });
  }

  protected async confirm(): Promise<void> {
    if (this.saving()) return;
    this.saving.set(true);
    try {
      const result = await this.store.createAppointment({
        ...this.selection(),
        patientName: this.patient().name.trim(),
        patientPhone: normalizePhone(this.patient().phone),
        origin: 'Web',
      });
      if (result.ok) {
        this.created.set(result.appointment);
        this.view.set('success');
      } else if (result.reason === 'cita-activa') {
        this.view.set('blocked');
      } else {
        this.notice.set(CONFLICT_MESSAGE);
        this.selection.update((s) => ({ ...s, time: '' }));
        this.view.set(1);
      }
    } catch {
      this.notice.set('No pudimos guardar tu cita. Revisa tu conexión e intenta de nuevo.');
    } finally {
      this.saving.set(false);
    }
    this.scrollToTop();
  }

  private scrollToTop(): void {
    this.scroller.scrollToPosition([0, 0]);
    // Wait for the next render: after an API call the new view is not in the DOM yet.
    afterNextRender(() => {
      const heading = this.host.nativeElement.querySelector('h1');
      if (!heading) return;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }, { injector: this.injector });
  }
}
