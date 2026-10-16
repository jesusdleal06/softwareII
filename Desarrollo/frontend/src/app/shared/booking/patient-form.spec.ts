import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PatientData, validatePatient } from '../../core/domain';
import { text, typeInto } from '../testing/dom';
import { PatientForm } from './patient-form';

describe('PatientForm', () => {
  let fixture: ComponentFixture<PatientForm>;
  let emitted: PatientData[];

  function render(data: PatientData, showErrors: boolean): HTMLElement {
    fixture = TestBed.createComponent(PatientForm);
    fixture.componentRef.setInput('data', data);
    fixture.componentRef.setInput('errors', showErrors ? validatePatient(data) : {});
    emitted = [];
    fixture.componentInstance.dataChange.subscribe((d) => emitted.push(d));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('shows the hint and no errors while untouched', () => {
    const el = render({ name: '', phone: '' }, false);
    expect(el.querySelectorAll('[role="alert"]')).toHaveLength(0);
    expect(text(el)).toContain('10 dígitos. A este número enviaremos el recordatorio por WhatsApp.');
    expect(el.querySelector('#pac-telefono')?.getAttribute('aria-describedby')).toBe('pac-telefono-hint');
  });

  it('shows the validation messages from validatePatient', () => {
    const el = render({ name: 'Ana', phone: '300 12' }, true);
    const alerts = Array.from(el.querySelectorAll('[role="alert"]')).map((a) => text(a));
    expect(alerts).toEqual(['Escribe nombre y apellido.', 'El celular debe tener 10 dígitos.']);
    const name = el.querySelector('#pac-nombre') as HTMLInputElement;
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe('pac-nombre-error');
  });

  it('shows the required and Colombian mobile messages', () => {
    const el = render({ name: '', phone: '2001234567' }, true);
    const alerts = Array.from(el.querySelectorAll('[role="alert"]')).map((a) => text(a));
    expect(alerts).toEqual([
      'El nombre completo es obligatorio.',
      'Escribe un celular colombiano válido (empieza por 3).',
    ]);
  });

  it('labels the fields and emits the typed name', () => {
    const el = render({ name: '', phone: '' }, false);
    expect(el.querySelector('label[for="pac-nombre"]')?.textContent?.trim()).toBe('Nombre completo');
    expect(el.querySelector('label[for="pac-telefono"]')?.textContent?.trim()).toBe('Número de celular');
    typeInto(el.querySelector('#pac-nombre') as HTMLInputElement, 'Ana Pérez');
    expect(emitted).toEqual([{ name: 'Ana Pérez', phone: '' }]);
  });

  it('keeps only digits and spaces in the phone', () => {
    const el = render({ name: 'Ana Pérez', phone: '' }, false);
    typeInto(el.querySelector('#pac-telefono') as HTMLInputElement, '300-12a3 4567');
    expect(emitted).toEqual([{ name: 'Ana Pérez', phone: '300123 4567' }]);
  });

  it('supports custom ids and labels', () => {
    fixture = TestBed.createComponent(PatientForm);
    fixture.componentRef.setInput('data', { name: '', phone: '' });
    fixture.componentRef.setInput('errors', {});
    fixture.componentRef.setInput('idPrefix', 'nc');
    fixture.componentRef.setInput('labels', { name: 'Nombre completo del paciente' });
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('label[for="nc-nombre"]')?.textContent?.trim()).toBe('Nombre completo del paciente');
    expect(el.querySelector('label[for="nc-telefono"]')?.textContent?.trim()).toBe('Número de celular');
  });
});
