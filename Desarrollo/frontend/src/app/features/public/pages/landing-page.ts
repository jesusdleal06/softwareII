import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideCalendarCheck, LucideShieldCheck } from '@lucide/angular';
import {
  addDays,
  formatTimeFromMinutes,
  isWorkingDay,
  shortDayName,
  toDateKey,
} from '../../../core/domain';
import { shiftsForDate } from '../../../core/config/clinic';
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
  /** Opening windows of that day, already formatted: `8:00 AM - 12:00 PM`. */
  windows: string[];
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

/** How many working days the hero panel advertises. */
const PANEL_DAYS = 3;
/** Longest look-ahead when the nearest days have no free time. */
const PANEL_LOOKAHEAD_DAYS = 14;

/** Opening windows of a date as display text, in the same form as the footer. */
function openingWindows(dateKey: string): string[] {
  return shiftsForDate(dateKey).map(
    (shift) => `${formatTimeFromMinutes(shift.start)} - ${formatTimeFromMinutes(shift.end)}`,
  );
}

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
    <!-- The body already paints the canvas; each page shell re-asserts it so a card is a card here. -->
    <main class="canvas flex-1">
      <section class="public-container py-16 sm:py-20 lg:py-24">
        <div class="grid items-center gap-8 lg:grid-cols-5 lg:gap-12">
          <div class="flex flex-col items-start gap-6 lg:col-span-3">
            <!-- Taste's display step: the h1 clamp at the display weight, never bold. -->
            <h1
              class="reveal max-w-2xl text-5xl font-normal tracking-tight text-balance text-foreground"
            >
              Agenda tu cita en 2 minutos
            </h1>
            <p
              style="--reveal-delay: 70ms"
              class="reveal max-w-xl text-base leading-relaxed text-muted-foreground text-pretty sm:text-lg"
            >
              Sin llamadas ni esperas: escoge tu horario en Villadent, déjanos tu celular y te
              recordamos por WhatsApp.
            </p>
            <div
              style="--reveal-delay: 140ms"
              class="reveal flex w-full flex-col gap-3 sm:flex-row"
            >
              <!-- Full width on a phone, content width from 640 up: a button never stretches. -->
              <a appBigButton size="lg" [full]="true" class="sm:w-auto" routerLink="/agendar"
                >Agendar mi cita</a
              >
            </div>
          </div>

          <aside
            style="--reveal-delay: 210ms"
            class="reveal card flex flex-col gap-6 lg:col-span-2"
            aria-labelledby="proximos-horarios"
          >
            <div class="flex items-center gap-2">
              <svg lucideCalendarCheck class="size-4 shrink-0 text-primary" aria-hidden="true"></svg>
              <h2 id="proximos-horarios" class="card-title">Próximos horarios</h2>
            </div>

            @if (availabilityStatus() === 'loading') {
              <p role="status" class="text-sm leading-relaxed text-muted-foreground">
                Buscando los próximos horarios…
              </p>
            } @else if (availability().length > 0) {
              <ul class="flex flex-col gap-4">
                @for (day of availability(); track day.key) {
                  <li class="flex flex-col gap-2">
                    <span class="text-xs font-medium text-muted-foreground">{{ day.label }}</span>
                    <div class="flex flex-wrap gap-2">
                      @for (window of day.windows; track window) {
                        <span
                          class="rounded-md border border-border bg-muted px-3 py-1 text-sm font-medium tabular-nums text-foreground"
                        >
                          {{ window }}
                        </span>
                      }
                    </div>
                  </li>
                }
              </ul>
              <a appBigButton variant="secondary" size="md" [full]="true" routerLink="/agendar">
                Ver todos los horarios
              </a>
            } @else if (availabilityStatus() === 'error') {
              <p class="text-base leading-relaxed text-muted-foreground text-pretty">
                No pudimos cargar los horarios en este momento. Puedes agendar igual y elegir tu
                horario en el siguiente paso.
              </p>
              <p class="text-base"><ng-container [ngTemplateOutlet]="whatsappLink" /></p>
              <a appBigButton variant="secondary" size="md" [full]="true" routerLink="/agendar">
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
                class="rounded-sm font-medium text-foreground underline decoration-1 underline-offset-4 outline-none transition-[text-decoration-thickness] hover:decoration-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                >Escríbenos por WhatsApp</a
              >
            </ng-template>
          </aside>
        </div>
      </section>

      <!-- The section heading is the page's second display step and sits on the ground;
           the three steps are one group, so they share a single card instead of three. -->
      <section class="public-container pb-16 sm:pb-20" aria-labelledby="como-funciona">
        <h2
          id="como-funciona"
          class="text-4xl font-normal tracking-tight text-balance text-foreground"
        >
          ¿Cómo funciona?
        </h2>
        <div class="card mt-8 lg:mt-12">
          <ol class="grid gap-6 sm:grid-cols-3" role="list">
            @for (step of howItWorks; track step.title) {
              <li class="flex flex-col gap-2">
                <h3 class="text-base font-medium text-foreground">{{ step.title }}</h3>
                <p class="text-base leading-relaxed text-muted-foreground text-pretty">
                  {{ step.text }}
                </p>
              </li>
            }
          </ol>
        </div>
      </section>

      @if (dentists().length > 0) {
        <section class="public-container pb-16 sm:pb-20 lg:pb-24" aria-labelledby="equipo">
          <div class="flex flex-col gap-2">
            <h2 id="equipo" class="text-4xl font-normal tracking-tight text-balance text-foreground">
              Nuestro equipo
            </h2>
            <p class="text-lg text-muted-foreground text-pretty">
              Cada odontólogo tiene su propia agenda.
            </p>
          </div>
          <div class="card mt-8 lg:mt-12">
            <ul class="grid grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-4">
              @for (d of dentists(); track d.id) {
                <li class="flex items-center gap-3">
                  <!-- The ink plate, not the 6% accent tint: a tint of the card is invisible on the card. -->
                  <span
                    class="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
                    aria-hidden="true"
                  >
                    {{ d.initials }}
                  </span>
                  <div class="flex min-w-0 flex-col">
                    <span class="text-base font-medium leading-tight text-foreground">{{ d.name }}</span>
                    <span class="text-sm text-muted-foreground">{{ d.specialty }}</span>
                    @if (d.description !== d.specialty) {
                      <span class="text-sm text-muted-foreground text-pretty">{{ d.description }}</span>
                    }
                  </div>
                </li>
              }
            </ul>
            <div class="card-divider mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <svg lucideShieldCheck class="size-4 shrink-0 text-primary" aria-hidden="true"></svg>
              <span>Tus datos solo se usan para gestionar tu cita.</span>
            </div>
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
  protected readonly availability = signal<AvailabilityDay[]>([]);
  protected readonly availabilityStatus = signal<'loading' | 'loaded' | 'error'>('loading');

  ngOnInit(): void {
    void this.loadAvailability();
  }

  /**
   * Next working days with free time from the API, so the hero never "invents"
   * availability; each day then advertises its real opening windows instead of
   * a handful of single slots.
   */
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
        const hasFreeTime = successful.some((response) => response.value.length > 0);
        if (!hasFreeTime) continue;
        days.push({
          key,
          label: key === today ? 'Hoy' : shortDayName(date),
          windows: openingWindows(key),
        });
      }
      this.availability.set(days);
      this.availabilityStatus.set(receivedResponse ? 'loaded' : 'error');
    } catch {
      this.availabilityStatus.set('error');
    }
  }
}
