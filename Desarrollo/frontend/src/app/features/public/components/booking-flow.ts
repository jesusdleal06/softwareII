import { ViewportScroller } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideArrowLeft, LucideArrowRight, LucideCalendarX2, LucideCircleCheck, LucideMessageCircle } from '@lucide/angular';
import { formatPhone, normalizePhone, PatientData, PatientErrors, reminderInfo, validatePatient } from '../../../core/domain';
import { ApiError } from '../../../core/api/api-error';
import { ClinicApi } from '../../../core/api/clinic-api';
import { CLINIC } from '../../../core/config/clinic';
import { Appointment } from '../../../core/models';
import { AppStore } from '../../../core/services/app-store.service';
import { AppointmentSummary } from '../../../shared/ui/appointment-summary';
import { BigButton } from '../../../shared/ui/big-button';
import { Stepper } from '../../../shared/ui/stepper';
import { AlertMessage } from '../../../shared/ui/alert-message';
import { TextField } from '../../../shared/ui/field';
import { PatientForm } from '../../../shared/booking/patient-form';
import { SlotPicker, SlotSelection } from '../../../shared/booking/slot-picker';
import { PUBLIC_WHATSAPP_NUMBER } from '../../../shared/ui/public-header';

const STEPS = ['Elige tu horario', 'Tus datos', 'Confirma tu cita'] as const;
const CONFLICT_MESSAGE = 'Este horario acaba de ser ocupado. Por favor elige otro.';
const INCOMPLETE_MESSAGE = 'Selecciona el odontólogo, el procedimiento, el día y la hora para continuar.';
const RESEND_SECONDS = 60;
const SEND_ERROR_MESSAGE = 'No pudimos enviar el código. Intenta de nuevo en unos minutos.';
const SAVE_ERROR_MESSAGE = 'No pudimos guardar tu cita. Revisa tu conexión e intenta de nuevo.';
const CODE_FORMAT_MESSAGE = 'Ingresa el código de 6 dígitos que te enviamos.';
const PHONE_HINT = '10 dígitos. A este número enviaremos un código de verificación y el recordatorio por WhatsApp.';
const PHONE_NOT_VERIFIED_MESSAGE = 'Verifica tu número de celular para confirmar la cita.';
const CODE_ERRORS: Record<string, string> = {
  INVALID_CODE: 'El código no es correcto.',
  CODE_EXPIRED: 'El código venció. Solicita uno nuevo.',
  TOO_MANY_ATTEMPTS: 'Superaste los intentos permitidos. Solicita un código nuevo.',
};
const REQUEST_ERRORS: Record<string, string> = {
  TOO_MANY_CODE_REQUESTS: 'Has solicitado demasiados códigos. Intenta de nuevo más tarde.',
};

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
    TextField,
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
          <div class="flex flex-col gap-6">
            <div class="card flex flex-col items-center gap-6 text-center">
              <span class="flex size-16 items-center justify-center rounded-xl bg-success/15 text-success dark:bg-success/20" aria-hidden="true">
                <svg lucideCircleCheck class="size-8"></svg>
              </span>
              <div class="flex flex-col gap-2">
                <h1 tabindex="-1" class="text-2xl font-normal tracking-tight text-balance text-foreground">¡Tu cita quedó agendada!</h1>
                <p class="page-subtitle">
                  Guarda este código: <span class="font-mono font-semibold text-foreground">{{ appointment.code }}</span>
                </p>
              </div>
            </div>
            <dl appAppointmentSummary [appointment]="appointment" class="w-full text-left"></dl>
            <div class="flex w-full items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-6 text-left dark:bg-success/20">
              <svg lucideMessageCircle class="mt-0.5 size-5 shrink-0 text-whatsapp" aria-hidden="true"></svg>
              <p class="text-base leading-relaxed text-pretty">
                Te enviaremos un recordatorio por WhatsApp al <strong>{{ formatPhone(appointment.patientPhone) }}</strong>
                {{ ' ' }}<strong>{{ reminderText(appointment) }}</strong>. Desde ese mensaje podrás confirmar, reprogramar o
                cancelar.
              </p>
            </div>
            <div class="flex w-full flex-col gap-3 sm:flex-row">
              <a appBigButton variant="secondary" size="lg" class="flex-1" routerLink="/">Volver al inicio</a>
            </div>
          </div>
        }
      }
      @case ('blocked') {
        <div class="card flex flex-col items-center gap-6 text-center">
          <span class="flex size-16 items-center justify-center rounded-xl bg-warning/20 text-warning-foreground" aria-hidden="true">
            <svg lucideCalendarX2 class="size-8"></svg>
          </span>
          <h1 tabindex="-1" class="text-2xl font-normal tracking-tight text-balance text-foreground">Ya tienes una cita programada</h1>
          <p class="max-w-xl text-base leading-relaxed text-muted-foreground text-pretty">
            Con el celular <strong class="text-foreground">{{ formatPhone(patient().phone) }}</strong> ya existe una cita
            activa. Para cuidar el tiempo de todos, cada paciente puede tener una sola cita pendiente a la vez. Usa el
            enlace personal de tu recordatorio para reprogramarla o cancelarla.
          </p>
          <button type="button" appBigButton variant="secondary" size="lg" (click)="goTo(1)">
            <svg lucideArrowLeft aria-hidden="true"></svg> Volver
          </button>
        </div>
      }
      @default {
        @let current = step();
        <div class="flex flex-col gap-6">
          <ol appStepper [steps]="steps" [current]="current"></ol>

          <header class="flex flex-col gap-2">
            <p role="status" class="sr-only">{{ stepAnnouncement() }}</p>
            <h1 tabindex="-1" class="text-2xl font-normal tracking-tight text-balance text-foreground">{{ steps[current - 1] }}</h1>
            @switch (current) {
              @case (1) {
                <p class="page-subtitle">Cada odontólogo tiene su propia agenda.</p>
              }
              @case (3) {
                <p class="page-subtitle">Revisa que todo esté correcto antes de confirmar.</p>
              }
            }
          </header>

          @let message = notice();
          @if (message && message !== incompleteMessage) {
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
                @if (message === incompleteMessage) {
                  <p id="booking-continue-hint" appAlertMessage>{{ message }}</p>
                } @else {
                  <p id="booking-continue-hint" class="text-sm text-muted-foreground">
                    Para continuar, elige odontólogo, procedimiento, día y hora.
                  </p>
                }
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
              <form class="card flex flex-col gap-6" novalidate (submit)="$event.preventDefault(); goToStep3()">
                <app-patient-form
                  [data]="patient()"
                  [errors]="errors()"
                  [phoneHint]="phoneHint"
                  (dataChange)="patient.set($event)"
                />
                <div class="card-divider flex flex-col gap-3 sm:flex-row-reverse">
                  <button type="submit" appBigButton size="xl" class="flex-1">Continuar <svg lucideArrowRight aria-hidden="true"></svg></button>
                  <button type="button" appBigButton variant="secondary" size="xl" class="sm:w-auto" (click)="goTo(1)">
                    <svg lucideArrowLeft aria-hidden="true"></svg> Atrás
                  </button>
                </div>
              </form>
            }
            @case (3) {
              <div class="flex flex-col gap-6">
                <dl appAppointmentSummary [appointment]="draft()"></dl>
                <p class="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-6 text-base leading-relaxed text-pretty dark:bg-success/20">
                  <svg lucideMessageCircle class="mt-0.5 size-5 shrink-0 text-whatsapp" aria-hidden="true"></svg>
                  <span>
                    Recibirás un recordatorio por WhatsApp <strong>{{ reminderText(selection()) }}</strong>.
                  </span>
                </p>
                @if (requestError(); as error) {
                  <p appAlertMessage>{{ error }}</p>
                }
                @if (!codeSent()) {
                  <div class="flex flex-col gap-3 sm:flex-row-reverse">
                    <button
                      type="button"
                      appBigButton
                      size="xl"
                      class="flex-1"
                      [disabled]="sendingCode()"
                      (click)="requestCode()"
                    >
                      {{ sendingCode() ? 'Enviando…' : 'Enviar código por WhatsApp' }}
                    </button>
                    <button type="button" appBigButton variant="secondary" size="xl" class="sm:w-auto" (click)="goTo(2)">
                      <svg lucideArrowLeft aria-hidden="true"></svg> Atrás
                    </button>
                  </div>
                } @else {
                  <form class="card flex flex-col gap-6" novalidate (submit)="$event.preventDefault(); confirm()">
                    <app-text-field
                      fieldId="booking-code"
                      label="Código de verificación"
                      hint="Ingresa el código de 6 dígitos que enviamos a tu WhatsApp."
                      placeholder="123456"
                      inputMode="numeric"
                      autocomplete="one-time-code"
                      [maxLength]="6"
                      [required]="true"
                      [sanitize]="sanitizeCode"
                      [value]="code()"
                      [error]="codeError() ?? undefined"
                      (valueChange)="code.set($event)"
                    />
                    <p role="status" aria-live="polite" class="text-sm text-muted-foreground">{{ resendHint() }}</p>
                    <div class="flex flex-col gap-3 sm:flex-row-reverse">
                      <button type="submit" appBigButton size="xl" class="flex-1" [disabled]="saving()">
                        {{ saving() ? 'Guardando…' : 'Confirmar cita' }}
                      </button>
                      <button type="button" appBigButton variant="secondary" size="xl" class="sm:w-auto" (click)="goTo(2)">
                        <svg lucideArrowLeft aria-hidden="true"></svg> Atrás
                      </button>
                    </div>
                    <button
                      type="button"
                      appBigButton
                      variant="ghost"
                      size="md"
                      [disabled]="!canResend() || sendingCode()"
                      (click)="requestCode()"
                    >
                      {{ sendingCode() ? 'Enviando…' : 'Reenviar código' }}
                    </button>
                  </form>
                }
                <p class="text-center text-sm text-muted-foreground">
                  ¿Necesitas ayuda? Escríbenos al WhatsApp {{ whatsappNumber }} o
                  <a
                    routerLink="/"
                    class="rounded-sm font-medium text-primary underline decoration-1 underline-offset-4 outline-none transition-[text-decoration-thickness] hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
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
export class BookingFlow implements OnInit, OnDestroy {
  protected readonly store = inject(AppStore);
  private readonly api = inject(ClinicApi);
  private readonly scroller = inject(ViewportScroller);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly injector = inject(Injector);

  protected readonly steps = STEPS;
  protected readonly clinic = CLINIC;
  protected readonly formatPhone = formatPhone;
  /** Fixed for the lifetime of the flow so the slot picker gets a stable input. */
  protected readonly now = this.store.now();

  protected readonly view = signal<View>(1);
  protected readonly selection = signal<SlotSelection>(EMPTY_SELECTION);
  protected readonly patient = signal<PatientData>({ name: '', phone: '' });
  protected readonly errors = signal<PatientErrors>({});
  protected readonly notice = signal<string | null>(null);
  protected readonly incompleteMessage = INCOMPLETE_MESSAGE;
  protected readonly whatsappNumber = PUBLIC_WHATSAPP_NUMBER;
  protected readonly phoneHint = PHONE_HINT;
  protected readonly created = signal<Appointment | null>(null);
  protected readonly saving = signal(false);

  // WhatsApp phone verification (S5): a code is requested on step 3 and exchanged for a token.
  protected readonly codeSent = signal(false);
  protected readonly code = signal('');
  protected readonly codeError = signal<string | null>(null);
  protected readonly requestError = signal<string | null>(null);
  protected readonly sendingCode = signal(false);
  protected readonly resendRemaining = signal(0);
  protected readonly canResend = computed(() => this.resendRemaining() === 0);
  protected readonly resendHint = computed(() =>
    this.resendRemaining() > 0
      ? `Podrás reenviar el código en ${this.resendRemaining()} s.`
      : 'Ya puedes solicitar un nuevo código.',
  );
  protected readonly sanitizeCode = (value: string): string => value.replace(/\D/g, '').slice(0, 6);
  private verificationToken: string | null = null;
  private verifiedPhone: string | null = null;
  private countdown: ReturnType<typeof setInterval> | null = null;

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

  ngOnDestroy(): void {
    this.clearCountdown();
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
    if (view < 3) this.resetVerification();
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

  /** Sends (or resends) the WhatsApp code and starts the 60-second resend countdown. */
  protected async requestCode(): Promise<void> {
    if (this.sendingCode()) return;
    this.requestError.set(null);
    this.codeError.set(null);
    this.sendingCode.set(true);
    const phone = normalizePhone(this.patient().phone);
    try {
      await this.api.requestPhoneCode(phone);
      this.verifiedPhone = phone;
      this.verificationToken = null;
      this.code.set('');
      this.codeSent.set(true);
      this.startCountdown();
    } catch (error) {
      this.requestError.set(this.errorMessage(error, REQUEST_ERRORS, SEND_ERROR_MESSAGE));
    } finally {
      this.sendingCode.set(false);
    }
  }

  protected async confirm(): Promise<void> {
    if (this.saving()) return;
    const phone = normalizePhone(this.patient().phone);
    if (this.verifiedPhone !== phone) {
      this.resetVerification();
      return;
    }
    const code = this.code().trim();
    if (!/^\d{6}$/.test(code)) {
      this.codeError.set(CODE_FORMAT_MESSAGE);
      return;
    }
    this.saving.set(true);
    this.codeError.set(null);
    try {
      const verificationToken = this.verificationToken ?? (await this.verify(phone, code));
      // The store owns the booking call and the conflict mapping; the flow adds the token.
      const result = await this.store.createAppointment({
        patientName: this.patient().name.trim(),
        patientPhone: phone,
        dentistId: this.selection().dentistId,
        procedureId: this.selection().procedureId,
        date: this.selection().date,
        time: this.selection().time,
        origin: 'Web',
        verificationToken,
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
    } catch (error) {
      this.handleBookingError(error);
    } finally {
      this.saving.set(false);
    }
    this.scrollToTop();
  }

  private async verify(phone: string, code: string): Promise<string> {
    const { verificationToken } = await this.api.verifyPhoneCode(phone, code);
    this.verificationToken = verificationToken;
    return verificationToken;
  }

  /** Keeps the phone-verification failures inline: the code field for S3/S4, the banner for sending. */
  private handleBookingError(error: unknown): void {
    if (error instanceof ApiError) {
      const codeMessage = error.code ? CODE_ERRORS[error.code] : undefined;
      if (codeMessage) {
        this.verificationToken = null;
        if (error.code !== 'INVALID_CODE') this.code.set('');
        this.codeError.set(codeMessage);
        return;
      }
      if (error.code === 'PHONE_NOT_VERIFIED') {
        this.verificationToken = null;
        this.code.set('');
        this.codeError.set(PHONE_NOT_VERIFIED_MESSAGE);
        return;
      }
    }
    this.codeError.set(SAVE_ERROR_MESSAGE);
  }

  private errorMessage(error: unknown, messages: Record<string, string>, fallback: string): string {
    return error instanceof ApiError && error.code && messages[error.code] ? messages[error.code] : fallback;
  }

  private startCountdown(): void {
    this.clearCountdown();
    this.resendRemaining.set(RESEND_SECONDS);
    this.countdown = setInterval(() => {
      const remaining = this.resendRemaining() - 1;
      this.resendRemaining.set(remaining > 0 ? remaining : 0);
      if (remaining <= 0) this.clearCountdown();
    }, 1000);
  }

  private clearCountdown(): void {
    if (this.countdown !== null) clearInterval(this.countdown);
    this.countdown = null;
  }

  /** Going back to the phone discards the code and the verification token (S5). */
  private resetVerification(): void {
    this.clearCountdown();
    this.resendRemaining.set(0);
    this.codeSent.set(false);
    this.code.set('');
    this.codeError.set(null);
    this.requestError.set(null);
    this.verifiedPhone = null;
    this.verificationToken = null;
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
