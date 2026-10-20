import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { makeAppointment } from '../../core/testing/appointment.fixture';
import { text } from '../testing/dom';
import { WhatsappBubble } from './whatsapp-bubble';

@Component({
  imports: [WhatsappBubble],
  template: `<figure appWhatsappBubble [appointment]="appointment"></figure>`,
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

describe('WhatsappBubble', () => {
  function render(): HTMLElement {
    TestBed.configureTestingModule({});
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('uses semantic success tokens with a dark variant', () => {
    const bubble = render().querySelector('figure') as HTMLElement;
    expect(bubble.className).toContain('bg-success/10');
    expect(bubble.className).toContain('dark:bg-success/20');
    expect(bubble.className).not.toContain('dark:bg-success/25');
    expect(bubble.className).not.toContain('oklch');
  });

  it('does not style the preview URL as a link', () => {
    const bubble = render().querySelector('figure') as HTMLElement;
    const url = Array.from(bubble.querySelectorAll('span')).find((span) =>
      text(span).includes('villadent.co/cita/'),
    );
    expect(url).toBeDefined();
    expect(url?.className).not.toContain('text-primary');
    expect(url?.className).not.toContain('underline');
    expect(text(bubble)).toContain('villadent.co/cita/VD-1049');
  });
});
