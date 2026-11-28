import { expect, type APIRequestContext, type Locator, type Page } from '@playwright/test';
import { getPhoneCode, type DentistDto, type ProcedureDto, type SlotTarget } from './api';
import {
  dayDiff,
  formatLongDate,
  formatTimeLabel,
  fromDateKey,
  mondayOf,
  shortDayName,
  toDateKey,
} from './dates';

type Scope = Page | Locator;

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/ingreso');
  await page.getByLabel('Correo electrónico').fill(email);
  await page.getByLabel('Contraseña', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Ingresar' }).click();
}

export async function loginAsAuxiliar(page: Page): Promise<void> {
  await login(page, 'ana@villadent.co', 'villadent2024');
  await expect(page).toHaveURL(/\/panel\/agenda/);
}

export async function loginAsOdontologa(page: Page): Promise<void> {
  await login(page, 'laura@villadent.co', 'villadent2024');
  await expect(page).toHaveURL(/\/panel\/mi-agenda/);
}

export async function getSession(
  page: Page,
): Promise<{ token: string; role: string; name: string } | null> {
  return page.evaluate(() => {
    const raw = localStorage.getItem('villadent-sesion');
    return raw ? (JSON.parse(raw) as { token: string; role: string; name: string }) : null;
  });
}

export async function openAgendaAtDate(page: Page, dateKey: string): Promise<void> {
  await page.goto('/panel/agenda');
  const difference = dayDiff(new Date(), fromDateKey(dateKey));
  const direction = difference >= 0 ? 'Día siguiente' : 'Día anterior';
  for (let step = 0; step < Math.abs(difference); step += 1) {
    await page.getByRole('button', { name: direction }).click();
  }
  await expect(page.locator('app-date-nav')).toContainText(formatLongDate(fromDateKey(dateKey)));
}

export async function selectDentistFilter(page: Page, dentistId: number): Promise<void> {
  await page.locator('#filtro-dentista').selectOption(String(dentistId));
}

export async function openNewAppointmentPanel(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Nueva cita manual' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

export async function selectDentistInPicker(
  scope: Scope,
  dentist: DentistDto,
): Promise<void> {
  const compact = scope.locator('#sp-dentista-select');
  if ((await compact.count()) > 0) {
    await compact.selectOption(String(dentist.id));
    return;
  }

  await scope
    .getByRole('radiogroup', { name: 'Odontólogo' })
    .getByRole('radio', { name: new RegExp(escapeRegExp(dentist.name)) })
    .click();
}

export async function selectProcedureInPicker(
  scope: Scope,
  procedure: ProcedureDto,
): Promise<void> {
  const compact = scope.locator('#sp-proc-select');
  if ((await compact.count()) > 0) {
    await compact.selectOption(String(procedure.id));
    return;
  }

  await scope
    .getByRole('radiogroup', { name: 'Procedimiento' })
    .getByRole('radio', { name: new RegExp(escapeRegExp(procedure.name)) })
    .click();
}

export async function selectDayInPicker(
  scope: Scope,
  dateKey: string,
  referenceDateKey = toDateKey(new Date()),
): Promise<void> {
  const referenceMonday = mondayOf(fromDateKey(referenceDateKey));
  const targetMonday = mondayOf(fromDateKey(dateKey));
  const weeks = Math.round(dayDiff(referenceMonday, targetMonday) / 7);
  const direction = weeks >= 0 ? 'Semana siguiente' : 'Semana anterior';

  for (let step = 0; step < Math.abs(weeks); step += 1) {
    await scope.getByRole('button', { name: direction }).click();
  }

  const target = fromDateKey(dateKey);
  const dayButton = scope
    .getByRole('radiogroup', { name: 'Día' })
    .getByRole('radio', {
      name: new RegExp(`^${escapeRegExp(shortDayName(target))} ${target.getDate()}(?:\\s|$)`),
    });

  await dayButton.click();
  await expect(dayButton).toHaveAttribute('aria-checked', 'true');
}

export async function selectTimeInPicker(scope: Scope, time: string): Promise<void> {
  const timeButton = scope.getByRole('radio', {
    name: formatTimeLabel(time),
    exact: true,
  });
  await timeButton.click();
  await expect(timeButton).toHaveAttribute('aria-checked', 'true');
}

export async function selectSlotCriteria(
  scope: Scope,
  target: SlotTarget,
  referenceDateKey = toDateKey(new Date()),
): Promise<void> {
  await selectDentistInPicker(scope, target.dentist);
  await selectProcedureInPicker(scope, target.procedure);
  await selectDayInPicker(scope, target.date, referenceDateKey);
}

export async function selectSlotInPicker(
  scope: Scope,
  target: SlotTarget,
  referenceDateKey = toDateKey(new Date()),
): Promise<void> {
  await selectSlotCriteria(scope, target, referenceDateKey);
  await selectTimeInPicker(scope, target.time);
}

export function agendaAppointment(
  page: Page,
  dentistName: string,
  patientName: string,
): Locator {
  return page
    .getByRole('group', { name: `Agenda de ${dentistName}` })
    .getByRole('button', { name: new RegExp(escapeRegExp(patientName)) });
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Requests the WhatsApp code from step 3, reads the code the e2e backend captured and
 * types it into the verification field. Leaves the flow ready to press «Confirmar cita».
 */
export async function verifyPublicPhone(
  page: Page,
  api: APIRequestContext,
  phone: string,
): Promise<void> {
  await page.getByRole('button', { name: 'Enviar código por WhatsApp' }).click();
  const codeField = page.locator('#booking-code');
  await expect(codeField).toBeVisible();
  const code = await getPhoneCode(api, phone);
  await codeField.fill(code);
}
