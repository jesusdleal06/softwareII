import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideShieldAlert } from '@lucide/angular';
import { landingPathFor } from '../../../core/guards/staff-access';
import { AppStore } from '../../../core/services/app-store.service';
import { BigButton } from '../../../shared/ui/big-button';
import { PublicFooter, PublicHeader } from '../../../shared/ui/public-header';

@Component({
  selector: 'app-access-denied-page',
  imports: [RouterLink, PublicHeader, PublicFooter, BigButton, LucideShieldAlert],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <header appPublicHeader></header>
    <main class="flex flex-1 items-center">
      <div class="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div class="mx-auto flex w-full max-w-md flex-col items-center gap-4 text-center">
          <span
            class="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            aria-hidden="true"
          >
            <svg lucideShieldAlert class="size-7"></svg>
          </span>
          <h1 class="page-title">Acceso denegado</h1>
          <p class="text-sm leading-relaxed text-muted-foreground text-pretty">
            Tu rol no tiene permiso para ver esta sección@if (ruta()) {
              (<span class="font-mono text-foreground">{{ ruta() }}</span>)}. Si crees que es un error, comunícate con
            la administración.
          </p>
          <div class="flex w-full flex-col gap-2.5">
            <a appBigButton size="md" [full]="true" [routerLink]="destination()">{{ actionLabel() }}</a>
            <a appBigButton variant="secondary" size="md" [full]="true" routerLink="/">Volver al inicio</a>
          </div>
        </div>
      </div>
    </main>
    <footer appPublicFooter></footer>
  `,
})
export class AccessDeniedPage {
  private readonly store = inject(AppStore);

  /** Denied path, from `?ruta=` (bound by the router). */
  readonly ruta = input<string>();

  protected readonly destination = computed(() => landingPathFor(this.store.session()));
  protected readonly actionLabel = computed(() => {
    const session = this.store.session();
    if (!session) return 'Ir al ingreso del personal';
    return session.role === 'Odontóloga' ? 'Ir a mi agenda' : 'Ir a la agenda';
  });
}
