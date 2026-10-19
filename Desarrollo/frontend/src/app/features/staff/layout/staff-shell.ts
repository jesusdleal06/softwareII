import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideChartColumn, LucideCalendarDays, LucideClipboardList, LucideLogOut } from '@lucide/angular';
import { AppStore } from '../../../core/services/app-store.service';
import { cn } from '../../../shared/ui/class-names';
import { Logo } from '../../../shared/ui/logo';
import { ThemeToggle } from '../../../shared/ui/theme-toggle';
import { STAFF_SECTIONS } from '../staff-sections';

const DESKTOP_LINK =
  'flex min-h-12 items-center gap-2 rounded-xl px-4 text-base font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring';
const DESKTOP_ACTIVE = 'bg-accent text-accent-foreground';
const DESKTOP_INACTIVE = 'text-muted-foreground hover:bg-muted hover:text-foreground';
const MOBILE_ACTIVE = 'border-b-2 border-primary text-primary';
const MOBILE_LINK = 'flex min-h-12 flex-1 items-center justify-center gap-2 text-base font-semibold';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex min-h-dvh flex-col bg-muted/30' },
  template: `
    @if (session(); as user) {
      <a
        href="#contenido"
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-30 focus:rounded-xl focus:border focus:bg-background focus:px-4 focus:py-3 focus:text-base focus:font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >Saltar al contenido</a
      >
      <header class="sticky top-0 z-20 border-b bg-background">
        <div class="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <div class="flex items-center gap-6">
            <app-logo [href]="sections()[0]?.href ?? '/'" />
            <nav aria-label="Secciones del panel" class="hidden items-center gap-1 md:flex">
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
                  }
                  {{ s.label }}
                </a>
              }
            </nav>
          </div>
          <div class="flex items-center gap-3">
            <app-theme-toggle />
            <div class="hidden flex-col items-end leading-tight sm:flex">
              <span class="text-base font-semibold">{{ user.name }}</span>
              <span class="text-sm text-muted-foreground">{{ user.role }}</span>
            </div>
            <span
              class="flex size-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground sm:hidden"
              aria-hidden="true"
            >
              {{ initials() }}
            </span>
            <button
              type="button"
              (click)="logout()"
              class="flex min-h-12 items-center gap-2 rounded-xl border bg-card px-4 text-base font-semibold hover:bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <svg lucideLogOut class="size-5" aria-hidden="true"></svg>
              <span class="hidden sm:inline">Cerrar sesión</span>
              <span class="sr-only sm:hidden">Cerrar sesión</span>
            </button>
          </div>
        </div>
        <nav aria-label="Secciones del panel (móvil)" class="flex border-t md:hidden">
          @for (s of sections(); track s.href) {
            <a
              [routerLink]="s.href"
              routerLinkActive=""
              ariaCurrentWhenActive="page"
              #mobile="routerLinkActive"
              [class]="cn(mobileLink, mobile.isActive ? mobileActive : 'text-muted-foreground')"
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
