import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Logo } from './logo';

@Component({
  selector: 'header[appPublicHeader]',
  imports: [Logo, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'border-b bg-background' },
  template: `
    <div class="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
      <app-logo />
      <!-- Hidden on /ingreso: the login page already states it in its h1 (one label per screen). -->
      <a
        routerLink="/ingreso"
        routerLinkActive
        #staffLink="routerLinkActive"
        [class.hidden]="staffLink.isActive"
        class="flex min-h-12 items-center rounded-xl px-3 text-base font-medium text-muted-foreground hover:bg-muted hover:text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Ingreso del personal
      </a>
    </div>
  `,
})
export class PublicHeader {}

@Component({
  selector: 'footer[appPublicFooter]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mt-auto border-t bg-muted/40' },
  template: `
    <div class="mx-auto flex max-w-5xl flex-col gap-1 px-4 py-6 text-sm text-muted-foreground sm:px-6">
      <p class="font-semibold text-foreground">Centro Odontológico Villadent</p>
      <p>Calle 45 # 27-18, Bucaramanga</p>
      <p>(607) 645 12 34 · WhatsApp +57 300 123 4567</p>
      <p>Lunes a sábado: 8:00 AM - 12:00 PM y 2:00 PM - 6:00 PM</p>
    </div>
  `,
})
export class PublicFooter {}
