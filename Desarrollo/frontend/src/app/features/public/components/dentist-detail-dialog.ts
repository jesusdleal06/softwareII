import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { Dentist } from '../../../core/models';
import { Modal } from '../../../shared/ui/modal';

/**
 * Read-only profile of one dentist, opened from a team card on the landing page.
 *
 * The native modal owns focus trapping, Esc and the close button; this component
 * only renders the photo (or initials), specialty, academic titles and bio.
 */
@Component({
  selector: 'app-dentist-detail-dialog',
  imports: [Modal],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal [open]="true" [title]="dentist().name" size="sm" (closed)="closed.emit()">
      <div class="flex flex-col gap-5">
        <div class="flex items-center gap-4">
          @if (dentist().photoUrl) {
            <img
              [src]="dentist().photoUrl"
              alt=""
              class="size-16 shrink-0 rounded-full object-cover"
            />
          } @else {
            <span
              class="flex size-16 shrink-0 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {{ dentist().initials }}
            </span>
          }
          <p class="text-sm text-muted-foreground">{{ dentist().specialty }}</p>
        </div>

        @if (academicTitles().length > 0) {
          <div class="flex flex-col gap-2">
            <h3 class="text-sm font-medium text-foreground">Títulos académicos</h3>
            <ul class="flex flex-col gap-1">
              @for (title of academicTitles(); track title) {
                <li class="text-sm text-muted-foreground">{{ title }}</li>
              }
            </ul>
          </div>
        }

        <p class="text-sm leading-relaxed text-muted-foreground text-pretty">
          {{ dentist().description }}
        </p>
      </div>
    </app-modal>
  `,
})
export class DentistDetailDialog {
  readonly dentist = input.required<Dentist>();
  readonly closed = output<void>();

  protected readonly academicTitles = computed(() => this.dentist().academicTitles ?? []);
}
