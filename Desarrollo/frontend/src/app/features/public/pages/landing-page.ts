import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  LucideCalendarCheck,
  LucideClock,
  LucideDynamicIcon,
  LucideIcon,
  LucideMessageCircle,
  LucideShieldCheck,
} from '@lucide/angular';
import { DEMO_CODE, DENTISTS } from '../../../core/data/mock-data';
import { BigButton } from '../../../shared/ui/big-button';
import { PublicFooter, PublicHeader } from '../../../shared/ui/public-header';

interface HowItWorksStep {
  icon: LucideIcon;
  title: string;
  text: string;
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

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, PublicHeader, PublicFooter, BigButton, LucideDynamicIcon, LucideShieldCheck],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-1 flex-col' },
  template: `
    <header appPublicHeader></header>
    <main class="flex-1">
      <section class="mx-auto flex max-w-5xl flex-col items-center gap-8 px-4 py-14 text-center sm:px-6 sm:py-20">
        <span class="rounded-full bg-accent px-4 py-1.5 text-sm font-semibold text-accent-foreground">
          Centro Odontológico Villadent
        </span>
        <h1 class="max-w-3xl text-4xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
          Agenda tu cita en Villadent en menos de 2 minutos
        </h1>
        <p class="max-w-2xl text-xl leading-relaxed text-muted-foreground text-pretty">
          Sin llamadas ni esperas. Escoge tu horario, déjanos tu celular y te recordamos por WhatsApp.
        </p>
        <div class="flex w-full max-w-md flex-col gap-3">
          <a appBigButton size="xl" [full]="true" routerLink="/agendar">Agendar mi cita</a>
          <p class="text-base text-muted-foreground">
            ¿Ya tienes una cita?
            <a [routerLink]="['/cita', demoCode]" class="font-semibold text-primary underline-offset-4 hover:underline">
              Consúltala con el enlace de tu WhatsApp
            </a>
          </p>
        </div>
      </section>

      <section class="border-y bg-muted/40" aria-labelledby="como-funciona">
        <div class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-14 sm:px-6">
          <h2 id="como-funciona" class="text-center text-3xl font-bold tracking-tight">¿Cómo funciona?</h2>
          <ol class="grid gap-6 sm:grid-cols-3">
            @for (step of howItWorks; track step.title; let i = $index) {
              <li class="flex flex-col gap-4 rounded-2xl border bg-card p-6">
                <div class="flex items-center gap-3">
                  <span
                    class="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
                    aria-hidden="true"
                  >
                    <svg [lucideIcon]="step.icon" class="size-6"></svg>
                  </span>
                  <span class="text-sm font-semibold text-muted-foreground">Paso {{ i + 1 }}</span>
                </div>
                <h3 class="text-xl font-bold">{{ step.title }}</h3>
                <p class="text-base leading-relaxed text-muted-foreground text-pretty">{{ step.text }}</p>
              </li>
            }
          </ol>
        </div>
      </section>

      <section class="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-14 sm:px-6" aria-labelledby="equipo">
        <div class="flex flex-col gap-2 text-center">
          <h2 id="equipo" class="text-3xl font-bold tracking-tight">Nuestro equipo</h2>
          <p class="text-lg text-muted-foreground">Cada odontólogo tiene su propia agenda.</p>
        </div>
        <ul class="grid gap-4 sm:grid-cols-3">
          @for (d of dentists; track d.id) {
            <li class="flex items-center gap-4 rounded-2xl border bg-card p-5">
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
        <div class="flex items-center justify-center gap-2 text-base text-muted-foreground">
          <svg lucideShieldCheck class="size-5 text-primary" aria-hidden="true"></svg>
          <span>Tus datos solo se usan para gestionar tu cita.</span>
        </div>
      </section>
    </main>
    <footer appPublicFooter></footer>
  `,
})
export class LandingPage {
  protected readonly howItWorks = HOW_IT_WORKS;
  protected readonly dentists = DENTISTS;
  protected readonly demoCode = DEMO_CODE;
}
