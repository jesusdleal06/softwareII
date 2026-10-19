import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppStore } from '../../../core/services/app-store.service';
import { SESSION_STORAGE } from '../../../core/services/tokens';
import { clickButton, getByText, text, typeInto } from '../../../shared/testing/dom';
import { memoryStorage, SESSION_KEY } from '../../../shared/testing/session';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  let fixture: ComponentFixture<LoginForm>;
  let el: HTMLElement;
  let storage: ReturnType<typeof memoryStorage>;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    storage = memoryStorage();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: SESSION_STORAGE, useValue: storage }],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(LoginForm);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => vi.restoreAllMocks());

  function submit(email: string, password: string): void {
    typeInto(el.querySelector('#login-email') as HTMLInputElement, email);
    typeInto(el.querySelector('#login-password') as HTMLInputElement, password);
    fixture.detectChanges();
    clickButton(el, 'Ingresar');
    fixture.detectChanges();
  }

  function alertText(): string {
    const alert = el.querySelector('form [role="alert"]');
    return alert ? text(alert) : '';
  }

  function demoUsers(): { set(value: boolean): void } {
    return (fixture.componentInstance as unknown as { showDemoUsers: { set(value: boolean): void } })
      .showDemoUsers;
  }

  it('renders the prototype form and the test users', () => {
    expect(text(el)).toContain('Ingreso del personal');
    expect(text(el)).toContain('Acceso exclusivo para el equipo de Villadent.');
    expect(el.querySelector('#login-email')?.getAttribute('placeholder')).toBe('nombre@villadent.co');
    expect(text(el)).toContain('ana@villadent.co');
    expect(text(el)).toContain('Odontóloga · contraseña: villadent2024');
  });

  it('hides the demo credentials outside dev mode', () => {
    demoUsers().set(false);
    fixture.detectChanges();
    expect(el.querySelector('details')).toBeNull();
    expect(text(el)).not.toContain('Usuarios de prueba');
    expect(text(el)).not.toContain('villadent2024');
  });

  it('still logs in when the demo credentials are hidden', () => {
    demoUsers().set(false);
    fixture.detectChanges();
    submit('ana@villadent.co', 'villadent2024');
    expect(TestBed.inject(AppStore).session()?.name).toBe('Ana María Rueda');
    expect(navigate).toHaveBeenCalledWith('/panel/agenda');
  });

  it('asks for both fields when empty', () => {
    submit('', '');
    expect(alertText()).toBe('Escribe tu correo y tu contraseña.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows the prototype error for wrong credentials', () => {
    submit('ana@villadent.co', 'mala');
    expect(alertText()).toBe('Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.');
    expect(TestBed.inject(AppStore).session()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('logs the assistant in and goes to the agenda', () => {
    submit('ana@villadent.co', 'villadent2024');
    expect(TestBed.inject(AppStore).session()?.name).toBe('Ana María Rueda');
    expect(storage.data.get(SESSION_KEY)).toContain('Ana María Rueda');
    expect(navigate).toHaveBeenCalledWith('/panel/agenda');
    expect(getByText<HTMLButtonElement>(el, 'button', 'Ingresando…').disabled).toBe(true);
  });

  it('logs the dentist in and goes to her agenda', () => {
    submit('LAURA@villadent.co ', 'villadent2024');
    expect(TestBed.inject(AppStore).session()?.role).toBe('Odontóloga');
    expect(navigate).toHaveBeenCalledWith('/panel/mi-agenda');
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

  it('announces the pending submit with aria-busy', () => {
    const form = el.querySelector('form') as HTMLFormElement;
    expect(form.getAttribute('aria-busy')).toBeNull();
    submit('ana@villadent.co', 'villadent2024');
    expect(form.getAttribute('aria-busy')).toBe('true');
  });
});
