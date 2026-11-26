import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ApiError } from '../../../core/api/api-error';
import { DentistProfile } from '../../../core/models';
import { DENTIST_SESSION } from '../../../shared/testing/session';
import { createFakeStore, FakeStore, provideFakeStore } from '../../../shared/testing/fake-store';
import { settle, text } from '../../../shared/testing/dom';
import { DentistProfilePage } from './dentist-profile-page';

const PROFILE: DentistProfile = {
  id: 'd1',
  firstName: 'Laura',
  secondName: 'María',
  firstSurname: 'Villamizar',
  secondSurname: null,
  fullName: 'Laura María Villamizar',
  specialty: 'Odontología general',
  photoUrl: 'https://example.test/laura.jpg',
  academicTitles: ['Ortodoncia'],
  description: 'Odontóloga especialista en ortodoncia.',
};

function photo(type: string, size: number): File {
  const file = new File(['x'], 'foto.bin', { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('DentistProfilePage', () => {
  let fixture: ComponentFixture<DentistProfilePage>;
  let store: FakeStore;

  beforeEach(async () => {
    store = createFakeStore({ session: DENTIST_SESSION });
    store.dentistProfile.mockResolvedValue(PROFILE);
    TestBed.configureTestingModule({ providers: [provideFakeStore(store)] });
  });

  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(DentistProfilePage);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function input(el: HTMLElement, id: string): HTMLInputElement {
    return el.querySelector(`#${id}`) as HTMLInputElement;
  }

  function setValue(el: HTMLElement, id: string, value: string): void {
    const field = el.querySelector(`#${id}`) as HTMLInputElement | HTMLTextAreaElement;
    field.value = value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function choosePhoto(el: HTMLElement, file: File): void {
    const picker = input(el, 'perfil-foto');
    Object.defineProperty(picker, 'files', { value: [file], configurable: true });
    picker.dispatchEvent(new Event('change', { bubbles: true }));
    fixture.detectChanges();
  }

  function submit(el: HTMLElement): void {
    (el.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  it('loads the signed-in dentist profile into the form', async () => {
    const el = await render();
    expect(input(el, 'perfil-primer-nombre').value).toBe('Laura');
    expect(input(el, 'perfil-primer-apellido').value).toBe('Villamizar');
    expect(input(el, 'perfil-segundo-nombre').value).toBe('María');
    expect(input(el, 'perfil-segundo-apellido').value).toBe('');
    expect(input(el, 'perfil-titulo-0').value).toBe('Ortodoncia');
    expect((el.querySelector('#perfil-descripcion') as HTMLTextAreaElement).value).toBe(
      'Odontóloga especialista en ortodoncia.',
    );
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://example.test/laura.jpg');
  });

  it('CP-RF11-02: blocks saving without a first name', async () => {
    const el = await render();
    setValue(el, 'perfil-primer-nombre', '   ');
    submit(el);
    await settle();
    expect(text(el)).toContain('El primer nombre es obligatorio.');
    expect(store.saveDentistProfile).not.toHaveBeenCalled();
  });

  it('CP-RF11-02: blocks saving without a first surname', async () => {
    const el = await render();
    setValue(el, 'perfil-primer-apellido', '');
    submit(el);
    await settle();
    expect(text(el)).toContain('El primer apellido es obligatorio.');
    expect(store.saveDentistProfile).not.toHaveBeenCalled();
  });

  it('CP-RF11-03: saves when the optional second name and surname are empty', async () => {
    const el = await render();
    setValue(el, 'perfil-segundo-nombre', '');
    setValue(el, 'perfil-segundo-apellido', '   ');
    submit(el);
    await settle();
    await settle();
    fixture.detectChanges();
    expect(store.saveDentistProfile).toHaveBeenCalledWith(
      expect.objectContaining({ secondName: null, secondSurname: null }),
    );
    expect(text(el)).toContain('Guardaste los cambios de tu perfil.');
  });

  it('CP-RF11-04: requires at least one academic title', async () => {
    const el = await render();
    setValue(el, 'perfil-titulo-0', '   ');
    submit(el);
    await settle();
    expect(text(el)).toContain('Agrega al menos un título académico.');
    expect(store.saveDentistProfile).not.toHaveBeenCalled();
  });

  it('CP-RF11-04: rejects a description over 500 characters', async () => {
    const el = await render();
    setValue(el, 'perfil-descripcion', 'a'.repeat(501));
    submit(el);
    await settle();
    expect(text(el)).toContain('La descripción no puede superar 500 caracteres.');
    expect(store.saveDentistProfile).not.toHaveBeenCalled();
  });

  it('CP-RF11-04: accepts a description of exactly 500 characters', async () => {
    const el = await render();
    setValue(el, 'perfil-descripcion', 'a'.repeat(500));
    submit(el);
    await settle();
    expect(store.saveDentistProfile).toHaveBeenCalled();
  });

  it('CP-RF11-05: blocks an image of more than 5 MB', async () => {
    const el = await render();
    choosePhoto(el, photo('image/jpeg', 5 * 1024 * 1024 + 1));
    expect(text(el)).toContain('La imagen no puede superar 5 MB.');
  });

  it('CP-RF11-05: accepts an image of exactly 5 MB', async () => {
    const el = await render();
    choosePhoto(el, photo('image/jpeg', 5 * 1024 * 1024));
    expect(text(el)).not.toContain('La imagen no puede superar 5 MB.');
  });

  it('CP-RF11-06: blocks a PDF renamed like an image', async () => {
    const el = await render();
    choosePhoto(el, photo('application/pdf', 1024));
    expect(text(el)).toContain('La imagen debe ser JPG, PNG o WebP.');
  });

  it('CP-RF11-07: keeps the previous photo when the upload fails with 502', async () => {
    store.uploadDentistPhoto.mockRejectedValue(
      new ApiError(502, null, 'No pudimos subir la imagen. Intenta de nuevo.'),
    );
    const el = await render();
    choosePhoto(el, photo('image/jpeg', 1024));
    (Array.from(el.querySelectorAll('button')).find((b) => text(b) === 'Subir foto') as HTMLButtonElement).click();
    await settle();
    fixture.detectChanges();
    expect(text(el)).toContain('No pudimos subir la imagen. Intenta de nuevo.');
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://example.test/laura.jpg');
  });

  it('shows a server 400 message under its field', async () => {
    store.saveDentistProfile.mockRejectedValue(
      new ApiError(400, null, 'La descripción no puede superar 500 caracteres.'),
    );
    const el = await render();
    submit(el);
    await settle();
    fixture.detectChanges();
    const alert = el.querySelector('#perfil-descripcion-error');
    expect(text(alert as HTMLElement)).toContain('La descripción no puede superar 500 caracteres.');
  });
});
