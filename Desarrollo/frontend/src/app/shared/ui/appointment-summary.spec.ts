import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { makeAppointment } from '../../core/testing/appointment.fixture';
import { text } from '../testing/dom';
import { createFakeStore, provideFakeStore } from '../testing/fake-store';
import { AppointmentSummary, AppointmentSummaryData } from './appointment-summary';

@Component({
  imports: [AppointmentSummary],
  template: `<dl appAppointmentSummary [appointment]="appointment" [showPatient]="showPatient"></dl>`,
})
class Host {
  appointment: AppointmentSummaryData = makeAppointment();
  showPatient = true;
}

function render(appointment: AppointmentSummaryData, showPatient = true): HTMLDListElement {
  TestBed.configureTestingModule({ providers: [provideFakeStore(createFakeStore())] });
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.appointment = appointment;
  fixture.componentInstance.showPatient = showPatient;
  fixture.detectChanges();
  return (fixture.nativeElement as HTMLElement).querySelector('dl')!;
}

const saved = makeAppointment();
const draft = { ...saved, code: undefined, status: undefined };
const details = [
  ['Fecha', 'jueves 15 de octubre de 202615/10/2026'],
  ['Hora', '8:00 AM a 8:30 AM'],
  ['Procedimiento', 'Limpieza · 30 min'],
  ['Odontólogo', 'Dra. Laura Villamizar Odontología general'],
];
const patient = ['Paciente', 'Paciente Prueba 300 000 0000'];
const code = ['Código de la cita', 'VD-2000'];
const status = ['Estado', 'Pendiente'];

describe('AppointmentSummary', () => {
  it.each([
    { variant: 'booking review', appointment: draft, showPatient: true, pairs: [...details, patient] },
    { variant: 'public detail', appointment: saved, showPatient: true, pairs: [code, status, ...details, patient] },
    { variant: 'public result', appointment: saved, showPatient: false, pairs: [code, status, ...details] },
    { variant: 'code only', appointment: { ...saved, status: undefined }, showPatient: true, pairs: [code, ...details, patient] },
    { variant: 'status only', appointment: { ...saved, code: undefined }, showPatient: true, pairs: [status, ...details, patient] },
  ])('CP-RNF02-02: groups each term with its definition in $variant', ({ appointment, showPatient, pairs }) => {
    const dl = render(appointment, showPatient);
    expect(Array.from(dl.children, (group) => [group.localName, ...Array.from(group.children, (el) => el.localName)]))
      .toEqual(pairs.map(() => ['div', 'dt', 'dd']));
    expect(Array.from(dl.children, (group) => Array.from(group.children, text))).toEqual(pairs);
    expect(dl.querySelectorAll('dt, dd')).toHaveLength(2 * pairs.length);
    expect(dl.querySelector('dt.sr-only')?.textContent).toBe(appointment.status ? 'Estado' : undefined);
  });
});
