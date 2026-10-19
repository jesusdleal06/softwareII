import { ChangeDetectionStrategy, Component, inject, isDevMode, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideEye, LucideEyeOff, LucideLockKeyhole, LucideTriangleAlert } from '@lucide/angular';
import { USERS } from '../../../core/data/mock-data';
import { landingPathFor } from '../../../core/guards/staff-access';
import { AppStore } from '../../../core/services/app-store.service';
import { BigButton } from '../../../shared/ui/big-button';
import { TextField } from '../../../shared/ui/field';

/** Staff login (container): validates, logs in through the store and goes to the role screen. */
@Component({
  selector: 'app-login-form',
  imports: [TextField, BigButton, LucideLockKeyhole, LucideTriangleAlert, LucideEye, LucideEyeOff],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-8 rounded-3xl border bg-card p-6 sm:p-8' },
  template: `
    <header class="flex flex-col items-center gap-3 text-center">
      <span
        class="flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground"
        aria-hidden="true"
      >
        <svg lucideLockKeyhole class="size-7"></svg>
      </span>
      <h1 class="text-2xl font-bold tracking-tight">Ingreso del personal</h1>
      <p class="text-base text-muted-foreground text-pretty">Acceso exclusivo para el equipo de Villadent.</p>
    </header>

    <form class="flex flex-col gap-6" novalidate [attr.aria-busy]="loading() ? 'true' : null" (submit)="submit($event)">
      @if (error(); as message) {
        <p
          role="alert"
          class="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-base font-medium text-destructive"
        >
          <svg lucideTriangleAlert class="mt-0.5 size-5 shrink-0" aria-hidden="true"></svg>
          {{ message }}
        </p>
      }
      <app-text-field
        fieldId="login-email"
        label="Correo electrónico"
        type="email"
        autocomplete="username"
        placeholder="nombre@villadent.co"
        [required]="true"
        [value]="email()"
        (valueChange)="email.set($event)"
      />
      <div class="relative">
        <app-text-field
          fieldId="login-password"
          label="Contraseña"
          [type]="showPassword() ? 'text' : 'password'"
          autocomplete="current-password"
          inputClass="pr-14"
          [required]="true"
          [value]="password()"
          (valueChange)="password.set($event)"
        />
        <button
          type="button"
          (click)="showPassword.set(!showPassword())"
          [attr.aria-label]="showPassword() ? 'Ocultar contraseña' : 'Mostrar contraseña'"
          [attr.aria-pressed]="showPassword()"
          class="absolute right-1 top-9 flex size-12 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          @if (showPassword()) {
            <svg lucideEyeOff class="size-5"></svg>
          } @else {
            <svg lucideEye class="size-5"></svg>
          }
        </button>
      </div>
      <button type="submit" appBigButton size="lg" [full]="true" [disabled]="loading()">
        {{ loading() ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>

    @if (showDemoUsers()) {
      <details class="rounded-2xl bg-muted/60 px-4 py-3 text-sm text-muted-foreground">
        <summary class="cursor-pointer font-semibold text-foreground">Usuarios de prueba del prototipo</summary>
        <ul class="mt-3 flex flex-col gap-2">
          @for (u of users; track u.email) {
            <li class="flex flex-col">
              <span class="font-mono text-foreground">{{ u.email }}</span>
              <span>
                {{ u.role }} · contraseña: <span class="font-mono">{{ u.password }}</span>
              </span>
            </li>
          }
        </ul>
      </details>
    }
  `,
})
export class LoginForm {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);

  protected readonly users = USERS;
  /** Demo credentials, rendered only in dev builds so they never ship in the production DOM. */
  protected readonly showDemoUsers = signal(isDevMode());
  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  protected submit(event: Event): void {
    event.preventDefault();
    this.error.set(null);
    if (!this.email().trim() || !this.password()) {
      this.error.set('Escribe tu correo y tu contraseña.');
      return;
    }
    this.loading.set(true);
    const session = this.store.login(this.email(), this.password());
    if (!session) {
      this.loading.set(false);
      this.error.set('Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.');
      return;
    }
    void this.router.navigateByUrl(landingPathFor(session));
  }
}
