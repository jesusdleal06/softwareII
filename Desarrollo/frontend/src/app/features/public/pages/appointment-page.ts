import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PublicFooter, PublicHeader } from '../../../shared/ui/public-header';
import { AppointmentActions } from '../components/appointment-actions';

/** `/cita/:token?accion=reprogramar` — route params are bound to inputs (withComponentInputBinding). */
@Component({
  selector: 'app-appointment-page',
  imports: [PublicHeader, PublicFooter, AppointmentActions],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <header appPublicHeader></header>
    <main class="flex-1">
      <div class="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <app-appointment-actions [token]="token()" [initialAction]="accion()" />
      </div>
    </main>
    <footer appPublicFooter></footer>
  `,
})
export class AppointmentPage {
  /** Route param `:token` (already URL-decoded by the router). */
  readonly token = input.required<string>();
  /** Query param `accion`. */
  readonly accion = input<string>();
}
