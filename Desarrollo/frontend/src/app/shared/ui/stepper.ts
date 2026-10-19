import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideCheck } from '@lucide/angular';
import { cn } from './class-names';

/** Horizontal progress indicator; `current` is 1-based. */
@Component({
  selector: 'ol[appStepper]',
  imports: [LucideCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex items-start gap-2', 'aria-label': 'Progreso' },
  template: `
    @for (step of steps(); track step; let i = $index, last = $last) {
      @let number = i + 1;
      @let done = number < current();
      @let active = number === current();
      <li class="flex flex-1 flex-col items-center gap-2 text-center" [attr.aria-current]="active ? 'step' : null">
        <div class="flex w-full items-center">
          <span
            [class]="cn('h-1 flex-1 rounded-full', i === 0 ? 'bg-transparent' : done || active ? 'bg-primary' : 'bg-border')"
          ></span>
          <span
            [class]="
              cn(
                'flex size-10 shrink-0 items-center justify-center rounded-full border-2 text-base font-bold',
                done && 'border-primary bg-primary text-primary-foreground',
                active && 'border-primary bg-card text-primary',
                !done && !active && 'border-border bg-card text-muted-foreground'
              )
            "
            aria-hidden="true"
          >
            @if (done) {
              <svg lucideCheck class="size-5"></svg>
            } @else {
              {{ number }}
            }
          </span>
          <span
            [class]="cn('h-1 flex-1 rounded-full', last ? 'bg-transparent' : done ? 'bg-primary' : 'bg-border')"
          ></span>
        </div>
        <span
          [class]="
            cn(
              'text-sm font-semibold leading-tight text-balance',
              active ? 'text-primary' : done ? 'text-foreground' : 'text-muted-foreground'
            )
          "
        >
          <span class="sr-only">Paso {{ number }}: </span>
          <span [class]="active ? '' : 'hidden sm:inline'">{{ step }}</span>
        </span>
      </li>
    }
  `,
})
export class Stepper {
  readonly steps = input.required<readonly string[]>();
  readonly current = input.required<number>();

  protected readonly cn = cn;
}
