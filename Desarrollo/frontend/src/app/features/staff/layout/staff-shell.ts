import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideChartColumn, LucideCalendarDays, LucideClipboardList, LucideLogOut, LucideUserRound } from '@lucide/angular';
import { AppStore } from '../../../core/services/app-store.service';
import { cn } from '../../../shared/ui/class-names';
import { Logo } from '../../../shared/ui/logo';
import { ThemeToggle } from '../../../shared/ui/theme-toggle';
import { STAFF_SECTIONS } from '../staff-sections';

/**
 * The section switcher is taste's software tab: the current section is the ink pill
 * with the ground as its label (the accent is the ink), and a quiet item answers the
 * pointer with a fill step and the press with taste's 1px step down.
 */
const DESKTOP_LINK =
  'flex min-h-11 items-center gap-2 rounded-md px-3 text-sm font-medium outline-none transition-colors select-none active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';
const DESKTOP_ACTIVE = 'bg-primary text-primary-foreground';
const DESKTOP_INACTIVE = 'text-muted-foreground hover:bg-secondary hover:text-foreground';
const MOBILE_ACTIVE = 'bg-primary text-primary-foreground';
const MOBILE_LINK =
  'flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md text-sm font-medium outline-none transition-colors select-none active:translate-y-px focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card';

/** Staff panel layout (container): header with role-based navigation, user and logout. */
@Component({
  selector: 'app-staff-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    Logo,
    ThemeToggle,
    LucideCalendarDays,
    LucideClipboardList,
    LucideChartColumn,
    LucideLogOut,
    LucideUserRound,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col' },
  template: `
    @if (session(); as user) {
      <a
        href="#contenido"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-md focus:border focus:border-border focus:bg-card focus:px-4 focus:py-2.5 focus:text-sm focus:font-medium focus:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
        >Saltar al contenido</a
      >
      <!-- S3: the current header stays; it adopts the card band so the panel chrome
           sits on the canvas like the reference's top chrome. -->
      <header class="sticky top-0 z-20 border-b border-border bg-card">
        <div class="mx-auto flex max-w-[1600px] items-center justify-between gap-2 px-3 py-2 sm:gap-4 sm:px-6">
          <div class="flex min-w-0 items-center gap-6">
            <app-logo [href]="sections()[0]?.href ?? '/'" />
            <nav aria-label="Secciones del panel" class="hidden items-center gap-1 lg:flex">
              @for (s of sections(); track s.href) {
                <a
                  [routerLink]="s.href"
                  routerLinkActive=""
                  ariaCurrentWhenActive="page"
                  #desktop="routerLinkActive"
                  [class]="cn(desktopLink, desktop.isActive ? desktopActive : desktopInactive)"
                >
                  @switch (s.id) {
                    @case ('agenda') {
                      <svg lucideCalendarDays class="size-5" aria-hidden="true"></svg>
                    }
                    @case ('mi-agenda') {
                      <svg lucideClipboardList class="size-5" aria-hidden="true"></svg>
                    }
                    @case ('reportes') {
                      <svg lucideChartColumn class="size-5" aria-hidden="true"></svg>
                    }
                    @case ('mi-perfil') {
                      <svg lucideUserRound class="size-5" aria-hidden="true"></svg>
                    }
                  }
                  {{ s.label }}
                </a>
              }
            </nav>
          </div>
          <div class="flex shrink-0 items-center gap-2 sm:gap-3">
            <app-theme-toggle />
            <div class="hidden flex-col items-end leading-tight sm:flex">
              <span class="text-sm font-semibold">{{ user.name }}</span>
              <span class="text-xs font-medium text-muted-foreground">{{ user.role }}</span>
            </div>
            <span
              class="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground sm:hidden"
              aria-hidden="true"
            >
              {{ initials() }}
            </span>
            <button
              type="button"
              (click)="logout()"
              class="btn-quiet min-h-11 px-3 sm:px-4"
            >
              <svg lucideLogOut class="size-4" aria-hidden="true"></svg>
              <span class="hidden sm:inline">Cerrar sesión</span>
              <span class="sr-only sm:hidden">Cerrar sesión</span>
            </button>
          </div>
        </div>
        <nav aria-label="Secciones del panel (móvil)" class="flex gap-1 border-t border-border p-1 lg:hidden">
          @for (s of sections(); track s.href) {
            <a
              [routerLink]="s.href"
              routerLinkActive=""
              ariaCurrentWhenActive="page"
              #mobile="routerLinkActive"
              [class]="cn(mobileLink, mobile.isActive ? mobileActive : 'text-muted-foreground hover:bg-secondary hover:text-foreground')"
            >
              @switch (s.id) {
                @case ('agenda') {
                  <svg lucideCalendarDays class="size-5" aria-hidden="true"></svg>
                }
                @case ('mi-agenda') {
                  <svg lucideClipboardList class="size-5" aria-hidden="true"></svg>
                }
                @case ('reportes') {
                  <svg lucideChartColumn class="size-5" aria-hidden="true"></svg>
                }
                @case ('mi-perfil') {
                  <svg lucideUserRound class="size-5" aria-hidden="true"></svg>
                }
              }
              {{ s.label }}
            </a>
          }
        </nav>
      </header>
      <main id="contenido" class="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
        <router-outlet />
      </main>
    }
  `,
})
export class StaffShell {
  private readonly store = inject(AppStore);
  private readonly router = inject(Router);

  protected readonly cn = cn;
  protected readonly desktopLink = DESKTOP_LINK;
  protected readonly desktopActive = DESKTOP_ACTIVE;
  protected readonly desktopInactive = DESKTOP_INACTIVE;
  protected readonly mobileLink = MOBILE_LINK;
  protected readonly mobileActive = MOBILE_ACTIVE;
  protected readonly session = this.store.session;

  /** Sections the current role may open. */
  protected readonly sections = computed(() => {
    const role = this.session()?.role;
    return STAFF_SECTIONS.filter((s) => !!role && s.roles.includes(role));
  });

  /** Mobile avatar: first letters of the first two names, without the `Dr./Dra.` title. */
  protected readonly initials = computed(() =>
    (this.session()?.name ?? '')
      .replace(/^Dra?\.\s*/, '')
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join(''),
  );

  protected logout(): void {
    this.store.logout();
    void this.router.navigateByUrl('/ingreso');
  }
}
