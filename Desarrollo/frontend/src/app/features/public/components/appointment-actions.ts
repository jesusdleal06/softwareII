import { ViewportScroller } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, linkedSignal, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideArrowLeft,
  LucideCalendarClock,
  LucideCircleCheck,
  LucideCircleX,
  LucideSearchX,
} from '@lucide/angular';
import { formatDate, formatTime, isActiveStatus, reminderInfo } from '../../../core/domain';
import { AppStore } from '../../../core/services/app-store.service';
import { AppointmentSummary } from '../../../shared/ui/appointment-summary';
import { BigButton } from '../../../shared/ui/big-button';
import { Modal } from '../../../shared/ui/modal';
import { WhatsappBubble } from '../../../shared/ui/whatsapp-bubble';
import { AlertMessage } from '../../../shared/ui/alert-message';
import { ResultPanel } from './result-panel';
import { SlotPicker, SlotSelection } from '../../../shared/booking/slot-picker';

type View = 'summary' | 'reschedule' | 'confirmed' | 'cancelled' | 'rescheduled';

const CONFLICT_MESSAGE = 'Este horario acaba de ser ocupado. Por favor elige otro.';

/** Patient page for one appointment: confirm, reschedule or cancel (container). */
@Component({
  selector: 'app-appointment-actions',
  imports: [
    RouterLink,
    AppointmentSummary,
    WhatsappBubble,
    SlotPicker,
    BigButton,
    Modal,
    AlertMessage,
    ResultPanel,
    LucideArrowLeft,
    LucideCalendarClock,
    LucideCircleCheck,
    LucideCircleX,
    LucideSearchX,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <p role="status" class="sr-only">{{ viewAnnouncement() }}</p>
    @if (appointment(); as cita) {
      @switch (view()) {
        @case ('confirmed') {
          <app-result-panel
            tone="success"
            heading="¡Gracias por confirmar!"
            [text]="
              'Te esperamos el ' +
              formatDate(cita.date) +
              ' a las ' +
              formatTime(cita.time) +
              '. Si algo cambia, puedes reprogramar o cancelar desde este mismo enlace.'
            "
          >
            <svg icon lucideCircleCheck class="size-12" aria-hidden="true"></svg>
            <dl appAppointmentSummary [appointment]="cita" [showPatient]="false"></dl>
            <a appBigButton variant="outline" size="lg" [full]="true" routerLink="/">Volver al inicio</a>
          </app-result-panel>
        }
        @case ('cancelled') {
          <app-result-panel tone="muted" heading="Tu cita fue cancelada" text="Gracias por avisarnos con tiempo.">
            <svg icon lucideCircleX class="size-12" aria-hidden="true"></svg>
            @if (releasedSlot(); as slot) {
              <p class="rounded-2xl border bg-muted/50 px-5 py-4 text-base leading-relaxed text-pretty">
                El horario del <strong>{{ formatDate(slot.date) }}</strong> a las
                <strong>{{ formatTime(slot.time) }}</strong> quedó liberado para otro paciente.
              </p>
            }
            <a appBigButton size="lg" [full]="true" routerLink="/agendar">Agendar una cita nueva</a>
            <a appBigButton variant="outline" size="lg" [full]="true" routerLink="/">Volver al inicio</a>
          </app-result-panel>
        }
        @case ('rescheduled') {
          <app-result-panel
            tone="success"
            heading="¡Tu cita fue reprogramada!"
            [text]="'Te enviaremos un nuevo recordatorio por WhatsApp ' + reminderText(cita) + '.'"
          >
            <svg icon lucideCalendarClock class="size-12" aria-hidden="true"></svg>
            <dl appAppointmentSummary [appointment]="cita" [showPatient]="false"></dl>
            <a appBigButton variant="outline" size="lg" [full]="true" routerLink="/">Volver al inicio</a>
          </app-result-panel>
        }
        @case ('reschedule') {
          <div class="flex flex-col gap-8">
            <header class="flex flex-col gap-1">
              <p class="text-sm font-semibold uppercase tracking-wide text-primary">Reprogramar cita {{ cita.code }}</p>
              <h1 class="text-3xl font-bold tracking-tight text-balance">Elige tu nuevo horario</h1>
              <p class="text-lg text-muted-foreground text-pretty">
                Tu cita actual es el {{ formatDate(cita.date) }} a las {{ formatTime(cita.time) }}. La nueva cita será con
                el mismo odontólogo.
              </p>
            </header>
            @if (notice(); as message) {
              <p appAlertMessage>{{ message }}</p>
            }
            <app-slot-picker
              [value]="selection()"
              [appointments]="store.appointments()"
              [now]="now"
              [fixedDentist]="true"
              [fixedProcedure]="true"
              [excludeAppointmentId]="cita.id"
              (valueChange)="onSelectionChange($event)"
            />
            <div class="flex flex-col gap-3 sm:flex-row-reverse">
              <button
                type="button"
                appBigButton
                size="xl"
                class="flex-1"
                [disabled]="!selection().date || !selection().time"
                (click)="reschedule()"
              >
                Confirmar nuevo horario
              </button>
              <button type="button" appBigButton variant="outline" size="xl" class="sm:w-auto" (click)="view.set('summary')">
                <svg lucideArrowLeft aria-hidden="true"></svg> Volver
              </button>
            </div>
          </div>
        }
        @default {
          @let active = isActive();
          <div class="flex flex-col gap-8">
            <header class="flex flex-col gap-1">
              <p class="text-sm font-semibold uppercase tracking-wide text-primary">Tu cita en Villadent</p>
              <h1 class="text-3xl font-bold tracking-tight text-balance">Hola, {{ firstName() }}</h1>
              <p class="text-lg text-muted-foreground text-pretty">
                {{ active ? 'Estos son los detalles de tu cita. ¿Qué deseas hacer?' : 'Estos son los detalles de tu cita.' }}
              </p>
            </header>

            <dl appAppointmentSummary [appointment]="cita"></dl>

            @if (active) {
              <div class="flex flex-col gap-3">
                <button
                  type="button"
                  appBigButton
                  variant="success"
                  size="xl"
                  [full]="true"
                  [disabled]="cita.status === 'Confirmada'"
                  (click)="confirmAttendance()"
                >
                  <svg lucideCircleCheck aria-hidden="true"></svg>
                  {{ cita.status === 'Confirmada' ? 'Asistencia confirmada' : 'Confirmar asistencia' }}
                </button>
                <button type="button" appBigButton variant="outline" size="xl" [full]="true" (click)="view.set('reschedule')">
                  <svg lucideCalendarClock aria-hidden="true"></svg> Reprogramar
                </button>
                <button
                  type="button"
                  appBigButton
                  variant="outline"
                  size="xl"
                  [full]="true"
                  class="text-destructive!"
                  (click)="confirmCancel.set(true)"
                >
                  <svg lucideCircleX aria-hidden="true"></svg> Cancelar cita
                </button>
              </div>
            } @else {
              <div class="flex flex-col gap-3 rounded-2xl border bg-muted/50 px-5 py-4">
                <p class="text-base text-pretty">
                  Esta cita ya no admite cambios (estado: <strong>{{ cita.status }}</strong>).
                </p>
                <a appBigButton size="lg" routerLink="/agendar">Agendar una cita nueva</a>
              </div>
            }

            <section class="flex flex-col gap-3" aria-labelledby="whatsapp-preview">
              <h2 id="whatsapp-preview" class="text-lg font-bold">Así se ve el recordatorio que recibes</h2>
              <figure appWhatsappBubble [appointment]="cita"></figure>
            </section>

            <app-modal
              [open]="confirmCancel()"
              (closed)="confirmCancel.set(false)"
              title="¿Seguro que deseas cancelar?"
              [description]="
                'Tu cita del ' +
                formatDate(cita.date) +
                ' a las ' +
                formatTime(cita.time) +
                ' se cancelará y el turno quedará libre para otro paciente.'
              "
              size="sm"
            >
              <div class="flex flex-col gap-3">
                <button type="button" appBigButton variant="danger" size="lg" [full]="true" (click)="cancel()">
                  Sí, cancelar mi cita
                </button>
                <button type="button" appBigButton variant="outline" size="lg" [full]="true" (click)="confirmCancel.set(false)">
                  No, conservar mi cita
                </button>
              </div>
            </app-modal>
          </div>
        }
      }
    } @else {
      <div class="flex flex-col items-center gap-6 text-center">
        <span class="flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
          <svg lucideSearchX class="size-12" aria-hidden="true"></svg>
        </span>
        <h1 class="text-3xl font-bold tracking-tight">No encontramos esta cita</h1>
        <p class="max-w-md text-lg text-muted-foreground text-pretty">
          El código <span class="font-mono font-bold text-foreground">{{ code() }}</span> no corresponde a ninguna cita.
          Revisa el enlace de tu WhatsApp.
        </p>
        <a appBigButton size="lg" routerLink="/agendar">Agendar una cita nueva</a>
      </div>
    }
  `,
})
export class AppointmentActions implements OnInit {
  protected readonly store = inject(AppStore);
  private readonly scroller = inject(ViewportScroller);
  private readonly host = inject(ElementRef<HTMLElement>);

  /** Public appointment code from the URL. */
  readonly code = input.required<string>();
  /** `reprogramar` opens the reschedule view directly (`?accion=reprogramar`). */
  readonly initialAction = input<string>();

  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;
  /** Fixed for the lifetime of the page so the slot picker gets a stable input. */
  protected readonly now = this.store.now();

  protected readonly appointment = computed(() => this.store.appointmentByCode(this.code()));
  protected readonly isActive = computed(() => {
    const a = this.appointment();
    return !!a && isActiveStatus(a.status);
  });
  protected readonly firstName = computed(() => this.appointment()?.patientName.split(' ')[0] ?? '');

  protected readonly view = signal<View>('summary');
  /** Screen-reader announcement for the current view (voiced via the role=status region). */
  protected readonly viewAnnouncement = computed(() => {
    switch (this.view()) {
      case 'reschedule':
        return 'Elige tu nuevo horario.';
      case 'confirmed':
        return 'Asistencia confirmada. Te esperamos.';
      case 'cancelled':
        return 'Tu cita fue cancelada.';
      case 'rescheduled':
        return 'Tu cita fue reprogramada.';
      default:
        return 'Detalles de tu cita.';
    }
  });
  protected readonly confirmCancel = signal(false);
  protected readonly notice = signal<string | null>(null);
  protected readonly releasedSlot = signal<{ date: string; time: string } | null>(null);
  /** New slot for rescheduling: same dentist and procedure, day and hour to choose. */
  protected readonly selection = linkedSignal<string | undefined, SlotSelection>({
    source: () => this.appointment()?.id,
    computation: () => ({
      dentistId: this.appointment()?.dentistId ?? '',
      procedureId: this.appointment()?.procedureId ?? '',
      date: '',
      time: '',
    }),
  });

  ngOnInit(): void {
    if (this.initialAction() === 'reprogramar') this.view.set('reschedule');
  }

  protected reminderText(appointment: { date: string; time: string }): string {
    return reminderInfo(appointment).text;
  }

  protected onSelectionChange(next: SlotSelection): void {
    this.selection.set(next);
    if (this.notice()) this.notice.set(null);
  }

  protected confirmAttendance(): void {
    const a = this.appointment();
    if (!a) return;
    this.store.confirm(a.id);
    this.view.set('confirmed');
    this.scrollToTop();
  }

  protected cancel(): void {
    const a = this.appointment();
    if (!a) return;
    this.releasedSlot.set({ date: a.date, time: a.time });
    this.store.cancel(a.id);
    this.confirmCancel.set(false);
    this.view.set('cancelled');
    this.scrollToTop();
  }

  protected reschedule(): void {
    const a = this.appointment();
    if (!a) return;
    const { date, time } = this.selection();
    const result = this.store.rescheduleAppointment(a.id, date, time);
    if (result.ok) {
      this.view.set('rescheduled');
    } else {
      this.notice.set(CONFLICT_MESSAGE);
      this.selection.update((s) => ({ ...s, time: '' }));
    }
    this.scrollToTop();
  }

  private scrollToTop(): void {
    this.scroller.scrollToPosition([0, 0]);
    // Defer so the new view renders before moving screen-reader and keyboard focus.
    queueMicrotask(() => {
      const heading = this.host.nativeElement.querySelector('h1');
      if (!heading) return;
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    });
  }
}
