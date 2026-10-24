import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { STATUS_STYLES } from '../../core/data/status-styles';
import { makeAppointment } from '../../core/testing/appointment.fixture';
import { settle, text } from '../testing/dom';
import { createFakeStore, provideFakeStore } from '../testing/fake-store';
import { AppointmentSummary } from './appointment-summary';
import { Logo } from './logo';
import { PublicFooter, PublicHeader } from './public-header';
import { ReminderBadge, StatusBadge } from './status-badge';
import { WhatsappBubble } from './whatsapp-bubble';

@Component({
  imports: [Logo, PublicHeader, PublicFooter, WhatsappBubble, AppointmentSummary, StatusBadge, ReminderBadge],
  template: `
    <header appPublicHeader></header>
    <app-logo id="compact-logo" href="/panel" [compact]="true" />
    <figure appWhatsappBubble [appointment]="appointment"></figure>
    <dl appAppointmentSummary [appointment]="appointment" class="w-full"></dl>
    <span id="badge" appStatusBadge status="Cancelada"></span>
    <app-reminder-badge status="Falló" detail="sin WhatsApp" />
    <footer appPublicFooter></footer>
  `,
})
class Host {
  readonly appointment = makeAppointment({
    code: 'VD-1049',
    patientName: 'Rosa Elvira Jaimes',
    patientPhone: '3135556677',
    procedureId: 'p4',
    procedureName: 'Exodoncia',
    durationMinutes: 60,
    date: '2026-10-14',
    time: '14:00',
  });
}

describe('shared ui markup', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideFakeStore(createFakeStore())] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the public header with logo and staff link', () => {
    const header = render().querySelector('header') as HTMLElement;
    expect(header.querySelector('a[aria-label="Villadent, ir al inicio"]')?.getAttribute('href')).toBe('/');
    expect(header.querySelector('a[aria-label="Villadent, ir al inicio"] img')?.getAttribute('src')).toBe('brand/villadent-logo.png');
    expect(text(header)).toContain('AgendaPro');
    const staff = Array.from(header.querySelectorAll('a')).find((a) => text(a) === 'Ingreso del personal');
    expect(staff?.getAttribute('href')).toBe('/ingreso');
  });

  it('hides the staff link once the visitor is already on /ingreso', async () => {
    // The login page states "Ingreso del personal" in its h1; the header must not repeat it there.
    TestBed.configureTestingModule({ providers: [provideRouter([{ path: 'ingreso', component: Host }])] });
    const fixture = TestBed.createComponent(Host);
    await TestBed.inject(Router).navigateByUrl('/ingreso');
    await fixture.whenStable();
    await settle();
    fixture.detectChanges();

    const header = (fixture.nativeElement as HTMLElement).querySelector('header') as HTMLElement;
    const staff = Array.from(header.querySelectorAll('a')).find((a) => text(a) === 'Ingreso del personal');
    expect(staff, 'staff link still rendered on /ingreso').toBeDefined();
    expect(staff?.classList.contains('hidden')).toBe(true);
  });

  it('renders the compact logo without the brand text', () => {
    const logo = render().querySelector('#compact-logo') as HTMLElement;
    expect(logo.querySelector('a')?.getAttribute('href')).toBe('/panel');
    expect(text(logo)).toBe('');
  });

  it('renders the WhatsApp reminder preview', () => {
    const bubble = render().querySelector('figure') as HTMLElement;
    expect(bubble.getAttribute('aria-label')).toBe('Vista previa del mensaje de WhatsApp');
    const content = text(bubble);
    expect(content).toContain('Hola Rosa, te recordamos tu cita en Centro Odontológico Villadent:');
    expect(content).toContain('14/10/2026 a las 2:00 PM');
    expect(content).toContain('Exodoncia con Dra. Laura Villamizar');
    expect(content).toContain('villadent.co/cita/enlace-personal');
    expect(content).toContain('WhatsApp · 14/10/2026 8:00 AM');
  });

  it('renders the appointment summary rows', () => {
    const dl = render().querySelector('dl') as HTMLElement;
    expect(dl.className).toContain('w-full');
    expect(dl.className).toContain('rounded-2xl');
    const content = text(dl);
    expect(content).toContain('VD-1049');
    expect(content).toContain('miércoles 14 de octubre de 2026');
    expect(content).toContain('2:00 PM a 3:00 PM');
    expect(content).toContain('Exodoncia · 60 min');
    expect(content).toContain('Odontología general');
    expect(content).toContain('313 555 6677');
  });

  it('renders status and reminder badges', () => {
    const el = render();
    const badge = el.querySelector('#badge') as HTMLElement;
    expect(text(badge)).toBe('Cancelada');
    expect(badge.className).toContain('text-destructive');
    expect(text(el.querySelector('app-reminder-badge') as HTMLElement)).toBe('Recordatorio falló · sin WhatsApp');
  });

  it('renders the public footer contact data', () => {
    const footer = render().querySelector('footer') as HTMLElement;
    expect(text(footer)).toContain('Calle 45 # 27-18, Bucaramanga');
  });

  it('gives the staff link a full-opacity 2px focus ring', () => {
    const header = render().querySelector('header') as HTMLElement;
    const staff = Array.from(header.querySelectorAll('a')).find((a) => text(a) === 'Ingreso del personal') as HTMLElement;
    expect(staff.className).toContain('focus-visible:ring-2');
    expect(staff.className).toContain('focus-visible:ring-ring');
    expect(staff.className).not.toContain('ring-4');
  });

  it('keeps the footer copy to one middle dot per line and hyphens as separators', () => {
    const footer = render().querySelector('footer') as HTMLElement;
    const lines = Array.from(footer.querySelectorAll('p')).map((p) => text(p));
    for (const line of lines) {
      expect((line.match(/·/g) ?? []).length).toBeLessThanOrEqual(1);
      expect(line).not.toMatch(/[–—]/);
    }
    expect(text(footer)).toContain('Calle 45 # 27-18, Bucaramanga');
    expect(text(footer)).toContain('WhatsApp +57 300 123 4567');
  });

  it('gives the summary status badge a definition term', () => {
    const dl = render().querySelector('dl') as HTMLElement;
    const badge = dl.querySelector('span[appStatusBadge]') as HTMLElement;
    expect(badge).not.toBeNull();
    const definition = badge.closest('dd');
    expect(definition).not.toBeNull();
    const term = definition?.parentElement?.querySelector('dt');
    expect(term).not.toBeNull();
    expect(text(term as HTMLElement)).toBe('Estado');
    expect((term as HTMLElement).className).toContain('sr-only');
  });

  it('renders status copy from the shared status map, never the raw enum value', () => {
    const el = render();
    const badge = el.querySelector('#badge') as HTMLElement;
    expect(text(badge)).toBe(STATUS_STYLES['Cancelada'].label);
    const source = readFileSync(join(resolve(process.cwd()), 'src/app/shared/ui/status-badge.ts'), 'utf8');
    expect(source).toMatch(/STATUS_STYLES\[this\.status\(\)\]\.label/);
    expect(source).not.toMatch(/\{\{\s*status\(\)\s*\}\}/);
  });
});
