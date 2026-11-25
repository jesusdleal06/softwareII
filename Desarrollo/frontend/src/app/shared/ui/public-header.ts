import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { LucideLockKeyhole } from '@lucide/angular';
import { Logo } from './logo';
import { ThemeToggle } from './theme-toggle';

export const PUBLIC_WHATSAPP_NUMBER = '+57 300 123 4567';
export const PUBLIC_WHATSAPP_URL = 'https://wa.me/' + PUBLIC_WHATSAPP_NUMBER.replace(/\D/g, '');

@Component({
  selector: 'header[appPublicHeader]',
  imports: [Logo, LucideLockKeyhole, RouterLink, RouterLinkActive, ThemeToggle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bg-background' },
  template: `
    <div class="public-container flex items-center justify-between gap-2 py-3 sm:gap-4">
      <app-logo class="shrink-0" />
      <div class="flex min-w-0 items-center gap-1">
        <app-theme-toggle />
        <!-- Hidden on /ingreso: the login page already states it in its h1 (one label per screen). -->
        <a
          routerLink="/ingreso"
          routerLinkActive
          #staffLink="routerLinkActive"
          [class.hidden]="staffLink.isActive"
          class="flex min-h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl border px-3 text-sm font-semibold text-foreground hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-12 sm:border-transparent sm:text-base sm:font-medium sm:text-muted-foreground sm:hover:text-foreground"
        >
          <!-- Phones get a real button with a short label; wider screens keep the full text link. -->
          <svg lucideLockKeyhole class="size-4 shrink-0 sm:hidden" aria-hidden="true"></svg>
          <span class="sm:hidden">Personal</span>
          <span class="hidden sm:inline">Ingreso del personal</span>
        </a>
      </div>
    </div>
  `,
})
export class PublicHeader {}

@Component({
  selector: 'footer[appPublicFooter]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mt-auto bg-muted' },
  template: `
    <div class="public-container flex flex-col gap-1 py-6 text-sm text-muted-foreground">
      <p class="font-semibold text-foreground">Centro Odontológico Villadent</p>
      <p>Calle 45 # 27-18, Bucaramanga</p>
      <p>
        (607) 645 12 34 ·
        <a
          [href]="whatsappUrl"
          target="_blank"
          rel="noopener"
          class="rounded-sm underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
        >
          WhatsApp {{ whatsappNumber }}
        </a>
      </p>
      <p>Lunes a sábado: 8:00 AM - 12:00 PM y 2:00 PM - 6:00 PM</p>
    </div>
  `,
})
export class PublicFooter {
  protected readonly whatsappNumber = PUBLIC_WHATSAPP_NUMBER;
  protected readonly whatsappUrl = PUBLIC_WHATSAPP_URL;
}
