import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideEye, LucideEyeOff, LucideLockKeyhole, LucideTriangleAlert } from '@lucide/angular';
import { landingPathFor } from '../../../core/guards/staff-access';
import { AppStore } from '../../../core/services/app-store.service';
import { BigButton } from '../../../shared/ui/big-button';
import { TextField } from '../../../shared/ui/field';

/** Staff login (container): validates, logs in through the store and goes to the role screen. */
@Component({
  selector: 'app-login-form',
  imports: [TextField, BigButton, LucideLockKeyhole, LucideTriangleAlert, LucideEye, LucideEyeOff],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'card flex flex-col gap-6' },
  template: `
    <header class="flex flex-col items-center gap-2.5 text-center">
      <span
        class="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground"
        aria-hidden="true"
      >
        <svg lucideLockKeyhole class="size-5"></svg>
      </span>
      <h1 class="page-title">Ingreso del personal</h1>
      <p class="text-sm text-muted-foreground text-pretty">Acceso exclusivo para el equipo de Villadent.</p>
    </header>

    <form class="flex flex-col gap-4" novalidate [attr.aria-busy]="loading() ? 'true' : null" (submit)="submit($event)">
      @if (error(); as message) {
        <p
          role="alert"
          class="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive"
        >
          <svg lucideTriangleAlert class="mt-0.5 size-4 shrink-0" aria-hidden="true"></svg>
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
          class="absolute right-0 bottom-0 flex size-10 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors select-none hover:bg-secondary hover:text-foreground active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          @if (showPassword()) {
            <svg lucideEyeOff class="size-4"></svg>
          } @else {
            <svg lucideEye class="size-4"></svg>
          }
        </button>
      </div>
      <button
        type="submit"
        appBigButton
        size="md"
        [full]="true"
        [attr.aria-disabled]="loading() ? 'true' : null"
        class="aria-disabled:not-focus-visible:opacity-50 aria-disabled:hover:bg-primary"
      >
        {{ loading() ? 'Ingresando…' : 'Ingresar' }}
      </button>
    </form>
  `,
})
export class LoginForm {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);

  protected readonly email = signal('');
  protected readonly password = signal('');
  protected readonly showPassword = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly loading = signal(false);

  protected async submit(event: Event): Promise<void> {
    event.preventDefault();
    if (this.loading()) return;
    this.error.set(null);
    if (!this.email().trim() || !this.password()) {
      this.error.set('Escribe tu correo y tu contraseña.');
      return;
    }
    this.loading.set(true);
    try {
      const session = await this.store.login(this.email(), this.password());
      if (!session) {
        this.error.set('Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.');
        return;
      }
      await this.router.navigateByUrl(landingPathFor(session));
    } catch {
      this.error.set('No pudimos conectar con el servidor. Intenta de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }
}
