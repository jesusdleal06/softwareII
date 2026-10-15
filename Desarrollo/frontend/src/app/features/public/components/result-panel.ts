import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Outcome screen with a round icon, title and text (prototype `Resultado`). Icon via `[icon]` slot. */
@Component({
  selector: 'app-result-panel',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <div class="flex flex-col items-center gap-4 text-center">
      <span
        [class]="
          tone() === 'success'
            ? 'flex size-20 items-center justify-center rounded-full bg-success/15 text-success'
            : 'flex size-20 items-center justify-center rounded-full bg-muted text-muted-foreground'
        "
        aria-hidden="true"
      >
        <ng-content select="[icon]" />
      </span>
      <h1 class="text-3xl font-bold tracking-tight text-balance">{{ heading() }}</h1>
      <p class="max-w-xl text-lg leading-relaxed text-muted-foreground text-pretty">{{ text() }}</p>
    </div>
    <ng-content />
  `,
})
export class ResultPanel {
  readonly tone = input.required<'success' | 'muted'>();
  readonly heading = input.required<string>();
  readonly text = input.required<string>();
}
