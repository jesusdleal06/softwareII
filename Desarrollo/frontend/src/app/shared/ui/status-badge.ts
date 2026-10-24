import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { LucideCheckCheck, LucideCircleX, LucideClock, LucideTriangleAlert } from '@lucide/angular';
import { STATUS_STYLES } from '../../core/data/status-styles';
import { AppointmentStatus, ReminderStatus } from '../../core/models';
import { cn } from './class-names';

/** Pill with the appointment status. Extra classes go in the host `class` attribute. */
@Component({
  selector: 'span[appStatusBadge]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[class]': 'classes()' },
  template: `{{ label() }}`,
})
export class StatusBadge {
  readonly status = input.required<AppointmentStatus>();

  /** Visible copy comes from the shared status map, never from the enum value directly. */
  protected readonly label = computed(() => STATUS_STYLES[this.status()].label);

  protected readonly classes = computed(() =>
    cn(
      'inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold whitespace-nowrap',
      STATUS_STYLES[this.status()].badge,
    ),
  );
}

const REMINDER: Record<ReminderStatus, { className: string; label: string }> = {
  Programado: { className: 'text-muted-foreground', label: 'Recordatorio programado' },
  Enviado: { className: 'text-success', label: 'Recordatorio enviado' },
  Falló: { className: 'text-destructive', label: 'Recordatorio falló' },
  Cancelado: { className: 'text-muted-foreground', label: 'Recordatorio cancelado' },
};

/** WhatsApp reminder status with icon and optional detail. */
@Component({
  selector: 'app-reminder-badge',
  imports: [LucideClock, LucideCheckCheck, LucideTriangleAlert, LucideCircleX],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="'inline-flex items-center gap-2 text-base font-medium ' + info().className">
      @switch (status()) {
        @case ('Programado') {
          <svg lucideClock class="size-5 shrink-0" aria-hidden="true"></svg>
        }
        @case ('Enviado') {
          <svg lucideCheckCheck class="size-5 shrink-0" aria-hidden="true"></svg>
        }
        @case ('Cancelado') {
          <svg lucideCircleX class="size-5" aria-hidden="true"></svg>
        }
        @case ('Falló') {
          <svg lucideTriangleAlert class="size-5 shrink-0" aria-hidden="true"></svg>
        }
      }
      <span>
        {{ info().label }}
        @if (detail()) {
          <span class="font-normal text-muted-foreground"> · {{ detail() }}</span>
        }
      </span>
    </span>
  `,
})
export class ReminderBadge {
  readonly status = input.required<ReminderStatus>();
  readonly detail = input<string>();

  protected readonly info = computed(() => REMINDER[this.status()]);
}
