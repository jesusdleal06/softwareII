import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { makeAppointment } from '../../core/testing/appointment.fixture';
import { text } from '../testing/dom';
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
    date: '2026-10-14',
    time: '14:00',
  });
}

describe('shared ui markup', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders the public header with logo and staff link', () => {
    const header = render().querySelector('header') as HTMLElement;
    expect(header.querySelector('a[aria-label="Villadent, ir al inicio"]')?.getAttribute('href')).toBe('/');
    expect(text(header)).toContain('Villadent');
    expect(text(header)).toContain('AgendaPro');
    const staff = Array.from(header.querySelectorAll('a')).find((a) => text(a) === 'Ingreso del personal');
    expect(staff?.getAttribute('href')).toBe('/ingreso');
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
    expect(content).toContain('villadent.co/cita/VD-1049');
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
});
