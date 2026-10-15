import { ChangeDetectionStrategy, Component } from '@angular/core';
import { LucideTriangleAlert } from '@lucide/angular';

/** Warning banner (`role="alert"`) used by the booking and reschedule flows. */
@Component({
  selector: 'p[appAlertMessage]',
  imports: [LucideTriangleAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'alert',
    class: 'flex items-start gap-3 rounded-2xl border border-warning/50 bg-warning/15 px-4 py-3 text-base font-medium',
  },
  template: `
    <svg lucideTriangleAlert class="mt-0.5 size-5 shrink-0 text-warning-foreground" aria-hidden="true"></svg>
    <ng-content />
  `,
})
export class AlertMessage {}
