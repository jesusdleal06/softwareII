import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { clickButton, settle, text, typeInto } from '../../../shared/testing/dom';
import { createFakeStore, FakeStore, provideFakeStore } from '../../../shared/testing/fake-store';
import { ASSISTANT_SESSION, DENTIST_SESSION } from '../../../shared/testing/session';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  let fixture: ComponentFixture<LoginForm>;
  let el: HTMLElement;
  let store: FakeStore;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    store = createFakeStore({ session: null });
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideFakeStore(store)],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginForm);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.restoreAllMocks());

  async function submit(email: string, password: string): Promise<void> {
    typeInto(el.querySelector('#login-email') as HTMLInputElement, email);
    typeInto(el.querySelector('#login-password') as HTMLInputElement, password);
    fixture.detectChanges();
    clickButton(el, 'Ingresar');
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
  }

  function alertText(): string {
    const alert = el.querySelector('form [role="alert"]');
    return alert ? text(alert) : '';
  }

  it('renders the sign-in form without demo credentials', () => {
    expect(text(el)).toContain('Ingreso del personal');
    expect(text(el)).toContain('Acceso exclusivo para el equipo de Villadent.');
    expect(el.querySelector('#login-email')?.getAttribute('placeholder')).toBe('nombre@villadent.co');
    expect(el.querySelector('details')).toBeNull();
    expect(text(el)).not.toContain('villadent2024');
  });

  it('asks for both fields when empty', async () => {
    await submit('', '');
    expect(alertText()).toBe('Escribe tu correo y tu contraseña.');
    expect(store.login).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the error for wrong credentials', async () => {
    store.login.mockResolvedValue(null);
    await submit('ana@villadent.co', 'mala');
    expect(store.login).toHaveBeenCalledWith('ana@villadent.co', 'mala');
    expect(alertText()).toBe('Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logs the assistant in and goes to the agenda', async () => {
    store.login.mockResolvedValue(ASSISTANT_SESSION);
    await submit('ana@villadent.co', 'villadent2024');
    expect(store.login).toHaveBeenCalledWith('ana@villadent.co', 'villadent2024');
    expect(navigate).toHaveBeenCalledWith('/panel/agenda');
  });

  // Email normalization (trim + lowercase) belongs to AppStore.login and is covered in app-store.service.spec.ts.
  it('sends dentists to their agenda', async () => {
    store.login.mockResolvedValue(DENTIST_SESSION);
    await submit('laura@villadent.co', 'villadent2024');
    expect(store.login).toHaveBeenCalledWith('laura@villadent.co', 'villadent2024');
    expect(navigate).toHaveBeenCalledWith('/panel/mi-agenda');
  });

  it('reports a network failure instead of staying silent', async () => {
    store.login.mockRejectedValue(new Error('offline'));
    await submit('ana@villadent.co', 'villadent2024');
    expect(alertText()).toContain('No pudimos conectar con el servidor.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('toggles the password visibility', () => {
    const password = el.querySelector('#login-password') as HTMLInputElement;
    expect(password.type).toBe('password');
    (el.querySelector('[aria-label="Mostrar contraseña"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect((el.querySelector('#login-password') as HTMLInputElement).type).toBe('text');
    expect(el.querySelector('[aria-label="Ocultar contraseña"]')?.getAttribute('aria-pressed')).toBe('true');
  });

  it('marks both fields required', () => {
    for (const id of ['#login-email', '#login-password']) {
      expect((el.querySelector(id) as HTMLInputElement).required).toBe(true);
      expect(el.querySelector(id)?.getAttribute('aria-required')).toBe('true');
    }
  });

  it('announces the pending submit with aria-busy', async () => {
    let resolve: (value: typeof ASSISTANT_SESSION | null) => void = () => undefined;
    store.login.mockReturnValue(new Promise((r) => (resolve = r)));
    typeInto(el.querySelector('#login-email') as HTMLInputElement, 'ana@villadent.co');
    typeInto(el.querySelector('#login-password') as HTMLInputElement, 'villadent2024');
    fixture.detectChanges();
    clickButton(el, 'Ingresar');
    fixture.detectChanges();
    const form = el.querySelector('form') as HTMLFormElement;
    expect(form.getAttribute('aria-busy')).toBe('true');
    resolve(ASSISTANT_SESSION);
    await settle();
    fixture.detectChanges();
    expect(form.getAttribute('aria-busy')).toBeNull();
  });
});
