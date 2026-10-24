import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideCalendarCheck,
  LucideClock,
  LucideDynamicIcon,
  LucideIcon,
  LucideMessageCircle,
  LucideShieldCheck,
} from '@lucide/angular';
import { addDays, formatTime, isWorkingDay, shortDayName, toDateKey } from '../../../core/domain';
import { AppStore } from '../../../core/services/app-store.service';
import { BigButton } from '../../../shared/ui/big-button';
import { PublicFooter, PublicHeader } from '../../../shared/ui/public-header';

interface HowItWorksStep {
  icon: LucideIcon;
  title: string;
  text: string;
}

interface AvailabilityDay {
  key: string;
  label: string;
  times: string[];
}

const HOW_IT_WORKS: readonly HowItWorksStep[] = [
  {
    icon: LucideCalendarCheck,
    title: 'Elige tu horario',
    text: 'Escoge el odontólogo, el procedimiento y el día que más te convenga.',
  },
  { icon: LucideClock, title: 'Déjanos tus datos', text: 'Solo necesitamos tu nombre y tu número de celular.' },
  {
    icon: LucideMessageCircle,
    title: 'Recibe tu recordatorio',
    text: 'Te escribimos por WhatsApp antes de tu cita para que no la olvides.',
  },
];

/** How many working days and how many times per day the hero panel advertises. */
const PANEL_DAYS = 3;
const PANEL_TIMES = 3;
/** Longest look-ahead when the nearest days have no free time. */
const PANEL_LOOKAHEAD_DAYS = 14;

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, PublicHeader, PublicFooter, BigButton, LucideDynamicIcon, LucideShieldCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <header appPublicHeader></header>
    <main class="flex-1">
      <section class="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
        <div class="grid items-center gap-10 lg:grid-cols-5">
          <div class="flex flex-col items-start gap-6 lg:col-span-3">
            <h1 class="max-w-2xl text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
              Agenda tu cita en Villadent en menos de 2 minutos
            </h1>
            <p class="max-w-xl text-xl leading-relaxed text-muted-foreground text-pretty">
              Sin llamadas ni esperas. Escoge tu horario, déjanos tu celular y te recordamos por WhatsApp.
            </p>
            <div class="flex w-full flex-col gap-3 sm:flex-row">
              <a appBigButton size="xl" [full]="true" routerLink="/agendar">Agendar mi cita</a>
            </div>
          </div>

          <aside
            class="flex flex-col gap-5 rounded-2xl border bg-card p-6 lg:col-span-2"
            aria-labelledby="proximos-horarios"
          >
            <div class="flex items-center gap-2">
              <svg lucideCalendarCheck class="size-5 text-primary" aria-hidden="true"></svg>
              <h2 id="proximos-horarios" class="text-lg font-bold">Próximos horarios</h2>
            </div>

            @if (loadingAvailability()) {
              <p role="status" class="text-base leading-relaxed text-muted-foreground">Buscando los próximos horarios…</p>
            } @else if (availability().length > 0) {
              <ul class="flex flex-col gap-4">
                @for (day of availability(); track day.key) {
                  <li class="flex flex-col gap-2">
                    <span class="text-sm font-semibold text-muted-foreground">{{ day.label }}</span>
                    <div class="flex flex-wrap gap-2">
                      @for (time of day.times; track time) {
                        <span class="rounded-lg border bg-background px-3 py-1.5 text-sm font-semibold text-foreground">
                          {{ formatTime(time) }}
                        </span>
                      }
                    </div>
                  </li>
                }
              </ul>
              <a appBigButton variant="outline" size="md" [full]="true" routerLink="/agendar">
                Ver todos los horarios
              </a>
            } @else {
              <p class="text-base leading-relaxed text-muted-foreground text-pretty">
                No hay cupos en los próximos días. Escríbenos por WhatsApp y te ayudamos a encontrar un horario.
              </p>
            }
          </aside>
        </div>
      </section>

      <section class="border-y bg-muted/40" aria-labelledby="como-funciona">
        <div class="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-14 sm:px-6">
          <h2 id="como-funciona" class="text-3xl font-bold tracking-tight">¿Cómo funciona?</h2>
          <ol class="flex flex-col divide-y">
            @for (step of howItWorks; track step.title) {
              <li class="flex items-start gap-5 py-6 first:pt-0 last:pb-0">
                <span
                  class="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                  aria-hidden="true"
                >
                  <svg [lucideIcon]="step.icon" class="size-6"></svg>
                </span>
                <div class="flex flex-col gap-1">
                  <h3 class="text-xl font-bold">{{ step.title }}</h3>
                  <p class="text-base leading-relaxed text-muted-foreground text-pretty">{{ step.text }}</p>
                </div>
              </li>
            }
          </ol>
        </div>
      </section>

      <section class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-14 sm:px-6" aria-labelledby="equipo">
        <div class="flex flex-col gap-2">
          <h2 id="equipo" class="text-3xl font-bold tracking-tight">Nuestro equipo</h2>
          <p class="text-lg text-muted-foreground">Cada odontólogo tiene su propia agenda.</p>
        </div>
        <ul class="grid gap-6 sm:grid-cols-3">
          @for (d of dentists(); track d.id) {
            <li class="flex items-center gap-4">
              <span
                class="flex size-14 shrink-0 items-center justify-center rounded-full bg-accent text-lg font-bold text-accent-foreground"
                aria-hidden="true"
              >
                {{ d.initials }}
              </span>
              <div class="flex flex-col">
                <span class="text-lg font-bold leading-tight">{{ d.name }}</span>
                <span class="text-base text-muted-foreground">{{ d.specialty }}</span>
                <span class="text-sm text-muted-foreground">{{ d.description }}</span>
              </div>
            </li>
          }
        </ul>
        <div class="flex items-center gap-2 text-base text-muted-foreground">
          <svg lucideShieldCheck class="size-5 text-primary" aria-hidden="true"></svg>
          <span>Tus datos solo se usan para gestionar tu cita.</span>
        </div>
      </section>
    </main>
    <footer appPublicFooter></footer>
  `,
})
export class LandingPage {
  private readonly store = inject(AppStore);

  protected readonly howItWorks = HOW_IT_WORKS;
  protected readonly dentists = this.store.dentists;
  protected readonly formatTime = formatTime;
  protected readonly availability = signal<AvailabilityDay[]>([]);
  protected readonly loadingAvailability = signal(true);

  ngOnInit(): void {
    void this.loadAvailability();
  }

  /** Next free times from the API, so the hero never "invents" availability. */
  private async loadAvailability(): Promise<void> {
    try {
      await this.store.ensureCatalogs();
      const dentists = this.store.dentists();
      const procedure = this.store.procedures()[0];
      if (dentists.length === 0 || !procedure) return;
      const start = this.store.now();
      const today = toDateKey(start);
      const days: AvailabilityDay[] = [];
      for (let offset = 0; offset < PANEL_LOOKAHEAD_DAYS && days.length < PANEL_DAYS; offset++) {
        const date = addDays(start, offset);
        const key = toDateKey(date);
        if (!isWorkingDay(key)) continue;
        const responses = await Promise.all(
          dentists.map((dentist) =>
            this.store.availability(dentist.id, procedure.id, key).catch(() => [] as string[]),
          ),
        );
        const times = [...new Set(responses.flat())].sort().slice(0, PANEL_TIMES);
        if (times.length === 0) continue;
        days.push({ key, label: key === today ? 'Hoy' : shortDayName(date), times });
      }
      this.availability.set(days);
    } finally {
      this.loadingAvailability.set(false);
    }
  }
}
