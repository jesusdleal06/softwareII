import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideCalendarCheck, LucideShieldCheck } from '@lucide/angular';
import { addDays, formatTime, isWorkingDay, shortDayName, toDateKey } from '../../../core/domain';
import { AppStore } from '../../../core/services/app-store.service';
import { BigButton } from '../../../shared/ui/big-button';
import { PUBLIC_WHATSAPP_URL, PublicFooter, PublicHeader } from '../../../shared/ui/public-header';

interface HowItWorksStep {
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
    title: 'Elige tu horario',
    text: 'Escoge el odontólogo, el procedimiento y el día que más te convenga.',
  },
  { title: 'Déjanos tus datos', text: 'Solo necesitamos tu nombre y tu número de celular.' },
  {
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
  imports: [
    NgTemplateOutlet,
    RouterLink,
    PublicHeader,
    PublicFooter,
    BigButton,
    LucideCalendarCheck,
    LucideShieldCheck,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <header appPublicHeader></header>
    <main class="flex-1">
      <section class="public-container py-20 lg:py-28">
        <div class="grid items-center gap-10 lg:grid-cols-5">
          <div class="flex flex-col items-start gap-6 lg:col-span-3">
            <h1
              class="reveal max-w-2xl text-5xl font-bold leading-[1.02] tracking-tight text-balance lg:text-6xl"
            >
              Agenda tu cita en 2 minutos
            </h1>
            <p
              style="--reveal-delay: 70ms"
              class="reveal max-w-xl text-lg leading-relaxed text-foreground text-pretty sm:text-xl"
            >
              Sin llamadas ni esperas: escoge tu horario en Villadent, déjanos tu celular y te
              recordamos por WhatsApp.
            </p>
            <div
              style="--reveal-delay: 140ms"
              class="reveal flex w-full flex-col gap-3 sm:flex-row"
            >
              <a appBigButton size="lg" [full]="true" routerLink="/agendar">Agendar mi cita</a>
            </div>
          </div>

          <aside
            style="--reveal-delay: 210ms"
            class="reveal flex flex-col gap-5 rounded-2xl bg-muted p-6 lg:col-span-2"
            aria-labelledby="proximos-horarios"
          >
            <div class="flex items-center gap-2">
              <svg lucideCalendarCheck class="size-5 text-primary" aria-hidden="true"></svg>
              <h2 id="proximos-horarios" class="text-lg font-bold">Próximos horarios</h2>
            </div>

            @if (availabilityStatus() === 'loading') {
              <p role="status" class="text-base leading-relaxed text-muted-foreground">
                Buscando los próximos horarios…
              </p>
            } @else if (availability().length > 0) {
              <ul class="flex flex-col gap-4">
                @for (day of availability(); track day.key) {
                  <li class="flex flex-col gap-2">
                    <span class="text-sm font-semibold text-muted-foreground">{{ day.label }}</span>
                    <div class="flex flex-wrap gap-2">
                      @for (time of day.times; track time) {
                        <span
                          class="rounded-lg bg-background px-3 py-1.5 text-sm font-semibold text-foreground"
                        >
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
            } @else if (availabilityStatus() === 'error') {
              <p class="text-base leading-relaxed text-muted-foreground text-pretty">
                No pudimos cargar los horarios en este momento. Puedes agendar igual y elegir tu
                horario en el siguiente paso.
              </p>
              <p><ng-container [ngTemplateOutlet]="whatsappLink" /></p>
              <a appBigButton variant="outline" size="md" [full]="true" routerLink="/agendar">
                Ver todos los horarios
              </a>
            } @else {
              <p class="text-base leading-relaxed text-muted-foreground text-pretty">
                No hay cupos en los próximos días.
                <ng-container [ngTemplateOutlet]="whatsappLink" /> y te ayudamos a encontrar un
                horario.
              </p>
            }
            <ng-template #whatsappLink>
              <a
                [href]="whatsappUrl"
                target="_blank"
                rel="noopener"
                class="rounded-sm font-semibold text-foreground underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring"
                >Escríbenos por WhatsApp</a
              >
            </ng-template>
          </aside>
        </div>
      </section>

      <section class="bg-muted/40" aria-labelledby="como-funciona">
        <div class="public-container flex flex-col gap-8 py-20 lg:py-28">
          <h2 id="como-funciona" class="reveal text-3xl font-bold tracking-tight">
            ¿Cómo funciona?
          </h2>
          <ol style="--reveal-delay: 70ms" class="reveal grid gap-8 lg:grid-cols-3" role="list">
            @for (step of howItWorks; track step.title) {
              <li class="flex flex-col gap-2">
                <h3 class="text-2xl font-bold">{{ step.title }}</h3>
                <p class="text-base leading-relaxed text-foreground text-pretty">{{ step.text }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      @if (dentists().length > 0) {
        <section
          class="public-container flex flex-col gap-8 py-20 lg:py-28"
          aria-labelledby="equipo"
        >
          <div class="reveal flex flex-col gap-2">
            <h2 id="equipo" class="text-3xl font-bold tracking-tight">Nuestro equipo</h2>
            <p class="text-lg text-muted-foreground">Cada odontólogo tiene su propia agenda.</p>
          </div>
          <ul
            style="--reveal-delay: 70ms"
            class="reveal grid grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] gap-6"
          >
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
                  @if (d.description !== d.specialty) {
                    <span class="text-sm text-muted-foreground">{{ d.description }}</span>
                  }
                </div>
              </li>
            }
          </ul>
          <div
            style="--reveal-delay: 140ms"
            class="reveal flex items-center gap-2 text-base text-muted-foreground"
          >
            <svg lucideShieldCheck class="size-5 text-primary" aria-hidden="true"></svg>
            <span>Tus datos solo se usan para gestionar tu cita.</span>
          </div>
        </section>
      }
    </main>
    <footer appPublicFooter></footer>
  `,
})
export class LandingPage implements OnInit {
  private readonly store = inject(AppStore);

  protected readonly howItWorks = HOW_IT_WORKS;
  protected readonly dentists = this.store.dentists;
  protected readonly whatsappUrl = PUBLIC_WHATSAPP_URL;
  protected readonly formatTime = formatTime;
  protected readonly availability = signal<AvailabilityDay[]>([]);
  protected readonly availabilityStatus = signal<'loading' | 'loaded' | 'error'>('loading');

  ngOnInit(): void {
    void this.loadAvailability();
  }

  /** Next free times from the API, so the hero never "invents" availability. */
  private async loadAvailability(): Promise<void> {
    try {
      await this.store.ensureCatalogs();
      const dentists = this.store.dentists();
      const procedure = this.store.procedures()[0];
      if (dentists.length === 0 || !procedure) {
        this.availabilityStatus.set('loaded');
        return;
      }
      const start = this.store.now();
      const today = toDateKey(start);
      const days: AvailabilityDay[] = [];
      let receivedResponse = false;
      for (let offset = 0; offset < PANEL_LOOKAHEAD_DAYS && days.length < PANEL_DAYS; offset++) {
        const date = addDays(start, offset);
        const key = toDateKey(date);
        if (!isWorkingDay(key)) continue;
        const responses = await Promise.allSettled(
          dentists.map((dentist) => this.store.availability(dentist.id, procedure.id, key)),
        );
        const successful = responses.filter((response) => response.status === 'fulfilled');
        receivedResponse ||= successful.length > 0;
        const times = [...new Set(successful.flatMap((response) => response.value))]
          .sort()
          .slice(0, PANEL_TIMES);
        if (times.length === 0) continue;
        days.push({ key, label: key === today ? 'Hoy' : shortDayName(date), times });
      }
      this.availability.set(days);
      this.availabilityStatus.set(receivedResponse ? 'loaded' : 'error');
    } catch {
      this.availabilityStatus.set('error');
    }
  }
}
