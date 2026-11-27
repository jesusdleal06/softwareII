import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideLockKeyhole } from '@lucide/angular';
import { CLINIC } from '../../core/config/clinic';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';

export const PUBLIC_WHATSAPP_NUMBER = CLINIC.whatsapp;
export const PUBLIC_WHATSAPP_URL = 'https://wa.me/' + CLINIC.whatsapp.replace(/\D/g, '');

@Component({
  selector: 'header[appPublicHeader]',
  imports: [Logo, LucideLockKeyhole, RouterLink, RouterLinkActive, ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  // A band of card on the canvas, divided by the same hairline every other block uses.
  host: { class: 'border-b border-border bg-card' },
  template: `
    <div class="public-container flex items-center justify-between gap-2 py-2.5 sm:gap-4">
      <app-logo class="shrink-0" />
      <div class="flex min-w-0 items-center gap-1">
        <app-theme-toggle />
        <!-- Hidden on /ingreso: the login page already states it in its h1 (one label per screen). -->
        <a
          routerLink="/ingreso"
          routerLinkActive
          #staffLink="routerLinkActive"
          [class.hidden]="staffLink.isActive"
          class="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md border border-transparent bg-secondary px-3 text-sm font-medium text-secondary-foreground outline-none hover:bg-secondary/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:bg-transparent sm:text-muted-foreground sm:hover:bg-secondary sm:hover:text-foreground"
        >
          <!-- One label at every width: the copy is the client's, not a mobile shorthand. -->
          <svg lucideLockKeyhole class="size-4 shrink-0 sm:hidden" aria-hidden="true"></svg>
          <span>Ingreso del personal</span>
        </a>
      </div>
    </div>
  `,
})
export class PublicHeader {}

@Component({
  selector: 'footer[appPublicFooter]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // The same card band as the header, so canvas, content and footer read as one page.
  host: { class: 'mt-auto border-t border-border bg-card' },
  template: `
    <div class="public-container flex flex-col gap-1 py-6 text-sm text-muted-foreground">
      <p class="font-semibold text-foreground">{{ clinic.name }}</p>
      <p>{{ clinic.address }}</p>
      <p>
        {{ clinic.phone }} ·
        <a
          [href]="whatsappUrl"
          target="_blank"
          rel="noopener"
          class="rounded-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >
          WhatsApp {{ whatsappNumber }}
        </a>
      </p>
      <p>Lunes a sábado: 8:00 AM - 12:00 PM y 2:00 PM - 6:00 PM</p>
    </div>
  `,
})
export class PublicFooter {
  protected readonly clinic = CLINIC;
  protected readonly whatsappNumber = PUBLIC_WHATSAPP_NUMBER;
  protected readonly whatsappUrl = PUBLIC_WHATSAPP_URL;
}
