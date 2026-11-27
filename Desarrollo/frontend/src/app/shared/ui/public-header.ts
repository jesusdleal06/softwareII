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
    <div
      class="public-container flex flex-col gap-8 py-8 text-sm text-muted-foreground md:flex-row md:items-start md:justify-between md:gap-12"
    >
      <!-- Left: who the clinic is, then the invitation that closes the page. -->
      <div class="md:max-w-sm">
        <p class="text-base font-semibold text-foreground">{{ clinic.name }}</p>
        <p class="mt-2 leading-relaxed text-pretty">
          ¡No dejes pasar la oportunidad de cuidar tu sonrisa!
        </p>
      </div>

      <!-- Right: the two groups a visitor needs to reach the clinic or know when it opens. -->
      <div class="flex flex-col gap-8 sm:flex-row md:justify-end md:gap-16">
        <div>
          <p class="font-semibold text-foreground">Contacto</p>
          <ul class="mt-3 flex flex-col gap-2">
            <li>
              <a
                [href]="whatsappUrl"
                target="_blank"
                rel="noopener"
                class="rounded-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
              >
                WhatsApp {{ whatsappNumber }}
              </a>
            </li>
            <li>{{ clinic.address }}</li>
          </ul>
        </div>
        <div>
          <p class="font-semibold text-foreground">Horarios de atención</p>
          <ul class="mt-3 flex flex-col gap-2">
            <li>Lunes a viernes: 8:00 AM - 12:00 PM y 2:00 PM - 6:00 PM</li>
            <li>Domingo: 8:00 AM - 1:00 PM</li>
          </ul>
        </div>
      </div>
    </div>
  `,
})
export class PublicFooter {
  protected readonly clinic = CLINIC;
  protected readonly whatsappNumber = PUBLIC_WHATSAPP_NUMBER;
  protected readonly whatsappUrl = PUBLIC_WHATSAPP_URL;
}
