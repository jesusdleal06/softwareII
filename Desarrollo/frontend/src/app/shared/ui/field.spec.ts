import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SelectField, SelectOption, TextField } from './field';

@Component({
  imports: [TextField, SelectField],
  template: `
    <app-text-field fieldId="nombre" label="Nombre" placeholder="Ej: Ana" hint="Escribe tu nombre" />
    <app-text-field fieldId="correo" label="Correo" [required]="true" />
    <app-select-field fieldId="procedimiento" label="Procedimiento" [options]="options" placeholder="Elige" />
  `,
})
class Host {
  readonly options: SelectOption[] = [{ value: 'p1', label: 'Limpieza' }];
}

describe('Field primitives', () => {
  function render(): HTMLElement {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('paints the placeholder with the placeholder token, not a faded muted colour', () => {
    const input = render().querySelector('#nombre') as HTMLInputElement;
    expect(input.className).toContain('placeholder:text-placeholder-foreground');
    expect(input.className).not.toContain('placeholder:text-muted-foreground/70');
  });

  it('shows focus with a full-opacity 2px ring', () => {
    const input = render().querySelector('#nombre') as HTMLInputElement;
    expect(input.className).toContain('focus-visible:ring-2');
    expect(input.className).toContain('focus-visible:ring-ring');
    expect(input.className).not.toContain('ring-4');
    expect(input.className).not.toMatch(/ring-ring\/(?:30|40|50)/);
  });

  it('draws the select arrow from the muted-foreground token without a raw colour', () => {
    const el = render();
    const select = el.querySelector('#procedimiento') as HTMLSelectElement;
    expect(select.getAttribute('style') ?? '').not.toContain('background-image');
    const arrow = el.querySelector('.select-arrow') as HTMLElement;
    expect(arrow).not.toBeNull();
    expect(arrow.getAttribute('aria-hidden')).toBe('true');

    const source = readFileSync(join(resolve(process.cwd()), 'src/app/shared/ui/field.ts'), 'utf8');
    expect(source).not.toMatch(/%23[0-9a-fA-F]{3,8}/);
    expect(source).toContain('mask-image');
    expect(source).toContain('var(--color-muted-foreground)');
  });

  it('exposes required and aria-required on required fields', () => {
    const required = render().querySelector('#correo') as HTMLInputElement;
    expect(required.hasAttribute('required')).toBe(true);
    expect(required.getAttribute('aria-required')).toBe('true');
  });

  it('leaves optional fields without required semantics', () => {
    const input = render().querySelector('#nombre') as HTMLInputElement;
    expect(input.hasAttribute('required')).toBe(false);
    expect(input.getAttribute('aria-required')).toBeNull();
  });

  it('keeps the label, placeholder and describedby wiring', () => {
    const el = render();
    expect(el.querySelector('label[for="nombre"]')?.textContent?.trim()).toBe('Nombre');
    const input = el.querySelector('#nombre') as HTMLInputElement;
    expect(input.getAttribute('placeholder')).toBe('Ej: Ana');
    expect(input.getAttribute('aria-describedby')).toBe('nombre-hint');
  });

  it('keeps the select placeholder and options', () => {
    const select = render().querySelector('#procedimiento') as HTMLSelectElement;
    const options = Array.from(select.querySelectorAll('option')).map((o) => o.textContent?.trim());
    expect(options).toEqual(['Elige', 'Limpieza']);
    expect(select.className).toContain('appearance-none');
  });
});
