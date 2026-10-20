import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideCheckCheck } from '@lucide/angular';
import { CLINIC } from '../../core/data/mock-data';
import { dentistById, formatDate, formatTime, procedureById, reminderInfo } from '../../core/domain';
import { Appointment } from '../../core/models';

/** Preview of the WhatsApp reminder the patient receives. */
@Component({
  selector: 'figure[appWhatsappBubble]',
  imports: [LucideCheckCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'flex flex-col gap-3 rounded-2xl bg-success/10 p-4 dark:bg-success/20',
    'aria-label': 'Vista previa del mensaje de WhatsApp',
  },
  template: `
    <figcaption class="flex items-center gap-3">
      <span
        class="flex size-10 items-center justify-center rounded-full bg-whatsapp text-sm font-bold text-success-foreground"
        aria-hidden="true"
      >
        V
      </span>
      <span class="flex flex-col leading-tight">
        <span class="font-semibold">{{ clinic.shortName }}</span>
        <span class="text-xs text-muted-foreground">
          WhatsApp · {{ formatDate(reminder().date) }} {{ formatTime(reminder().time) }}
        </span>
      </span>
    </figcaption>
    <div class="relative ml-2 max-w-prose rounded-2xl rounded-tl-sm bg-card px-4 py-3 text-base leading-relaxed shadow-sm">
      <p>Hola {{ firstName() }}, te recordamos tu cita en {{ clinic.name }}:</p>
      <p class="mt-2">
        <strong>{{ formatDate(appointment().date) }}</strong> a las <strong>{{ formatTime(appointment().time) }}</strong>
        <br />
        {{ procedure()?.name }} con {{ dentist()?.name }}
      </p>
      <p class="mt-2">
        Por favor confirma tu asistencia o reprograma aquí:
        <br />
        <span class="break-all">villadent.co/cita/{{ appointment().code }}</span>
      </p>
      <p class="mt-2 text-muted-foreground">Si no puedes asistir, cancela con anticipación para liberar el turno. Gracias.</p>
      <span class="mt-1 flex items-center justify-end gap-1 text-xs text-muted-foreground">
        {{ formatTime(reminder().time) }}
        <svg lucideCheckCheck class="size-4 text-primary" aria-hidden="true"></svg>
      </span>
    </div>
  `,
})
export class WhatsappBubble {
  readonly appointment = input.required<Appointment>();

  protected readonly clinic = CLINIC;
  protected readonly formatDate = formatDate;
  protected readonly formatTime = formatTime;
  protected readonly dentist = computed(() => dentistById(this.appointment().dentistId));
  protected readonly procedure = computed(() => procedureById(this.appointment().procedureId));
  protected readonly reminder = computed(() => reminderInfo(this.appointment()));
  protected readonly firstName = computed(() => this.appointment().patientName.split(' ')[0]);
}
