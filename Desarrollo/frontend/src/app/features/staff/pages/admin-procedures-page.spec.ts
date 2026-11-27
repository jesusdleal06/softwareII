import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminProcedureDto } from '../../../core/api/clinic-api';
import { ASSISTANT_SESSION } from '../../../shared/testing/session';
import { createFakeStore, provideFakeStore } from '../../../shared/testing/fake-store';
import { settle, text } from '../../../shared/testing/dom';
import { ProceduresAdminApi } from '../data/procedures-admin-api';
import { AdminProceduresPage } from './admin-procedures-page';

interface Calls {
  create: unknown[];
  updateDentists: unknown[];
  setActive: unknown[];
}

function fakeApi(): { api: unknown; calls: Calls; procedures: ReturnType<typeof signal<readonly AdminProcedureDto[]>> } {
  const procedures = signal<readonly AdminProcedureDto[]>([]);
  const calls: Calls = { create: [], updateDentists: [], setActive: [] };

  const api = {
    procedures: procedures.asReadonly(),
    loading: signal(false).asReadonly(),
    saving: signal(false).asReadonly(),
    error: signal<string | null>(null).asReadonly(),
    load: () => Promise.resolve(),
    create: (payload: unknown) => {
      calls.create.push(payload);
      return Promise.resolve(true);
    },
    updateDentists: (id: number, dentistIds: readonly number[]) => {
      calls.updateDentists.push({ id, dentistIds });
      return Promise.resolve(true);
    },
    setActive: (id: number, active: boolean) => {
      calls.setActive.push({ id, active });
      return Promise.resolve(true);
    },
  };

  return { api, calls, procedures };
}

function submit(root: HTMLElement): void {
  root
    .querySelector('form')
    ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

function typeIntoName(root: HTMLElement, value: string): void {
  const input = root.querySelector<HTMLInputElement>('#procedimiento-nombre');
  if (!input) throw new Error('Name input not found');
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

function toggleDentist(root: HTMLElement): void {
  const checkbox = root.querySelector<HTMLInputElement>('fieldset input[type="checkbox"]');
  if (!checkbox) throw new Error('Dentist checkbox not found');
  checkbox.click();
}

describe('AdminProceduresPage', () => {
  let fixture: ComponentFixture<AdminProceduresPage>;
  let harness: ReturnType<typeof fakeApi>;

  beforeEach(() => {
    harness = fakeApi();
    TestBed.configureTestingModule({
      providers: [
        provideFakeStore(createFakeStore({ session: ASSISTANT_SESSION })),
        { provide: ProceduresAdminApi, useValue: harness.api },
      ],
    });
  });

  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(AdminProceduresPage);
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('CP-RF12-08: blocks saving a procedure without a name or a dentist', async () => {
    const root = await render();

    submit(root);
    fixture.detectChanges();

    expect(text(root)).toContain('El nombre del procedimiento es obligatorio.');
    expect(text(root)).toContain('Seleccione al menos un odontólogo.');
    expect(harness.calls.create).toHaveLength(0);

    typeIntoName(root, 'Blanqueamiento');
    fixture.detectChanges();
    submit(root);
    fixture.detectChanges();

    expect(text(root)).not.toContain('El nombre del procedimiento es obligatorio.');
    expect(text(root)).toContain('Seleccione al menos un odontólogo.');
    expect(harness.calls.create).toHaveLength(0);
  });

  it('CP-RF12-08: saves the procedure once a name and a dentist are chosen', async () => {
    const root = await render();

    typeIntoName(root, 'Blanqueamiento');
    toggleDentist(root);
    fixture.detectChanges();
    submit(root);
    await settle();
    fixture.detectChanges();

    expect(harness.calls.create).toHaveLength(1);
    expect(harness.calls.create[0]).toMatchObject({ name: 'Blanqueamiento', durationMinutes: 30 });
  });
});
