import { type Page } from '@playwright/test';

import { findSlot, uniqueName, uniquePhone } from './support/api';
import { expect, test } from './support/fixtures';
import { loginAsAuxiliar, selectSlotInPicker, verifyPublicPhone } from './support/ui';

/**
 * CP-RNF01-02 — cross-browser and cross-resolution compatibility.
 *
 * Runs in every configured project (Chromium, Firefox and WebKit at desktop
 * 1366×768 and mobile 360×640). Each run completes the public booking flow and
 * the staff sign-in, then asserts the page never overflows horizontally and the
 * main controls are visible and enabled.
 */
async function expectNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  expect(
    scrollWidth,
    `${context}: desbordamiento horizontal (scrollWidth ${scrollWidth} > innerWidth ${innerWidth})`,
  ).toBeLessThanOrEqual(innerWidth);
}

test('CP-RNF01-02: el agendamiento y el ingreso del personal funcionan sin desbordamiento', async ({
  page,
  api,
}) => {
  const target = await findSlot(api);
  const patient = { name: uniqueName('Paciente RNF01'), phone: uniquePhone() };

  // Landing pública.
  await page.goto('/');
  await expect(page.locator('footer')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'landing pública');

  // Paso 1: elegir horario.
  await page.goto('/agendar');
  await expect(page.locator('ol[aria-label="Progreso"] li')).toHaveCount(3);
  const continueStep1 = page.getByRole('button', { name: 'Continuar' });
  await expect(continueStep1).toBeVisible();
  await expectNoHorizontalOverflow(page, 'agendamiento paso 1');

  await selectSlotInPicker(page, target);
  // Only after choosing a slot is the step-1 button operable (before that it is aria-disabled).
  await expect(continueStep1).toBeEnabled();
  await expectNoHorizontalOverflow(page, 'agendamiento paso 1 con selección');
  await continueStep1.click();

  // Paso 2: datos del paciente.
  await expect(page.getByRole('heading', { name: 'Tus datos' })).toBeVisible();
  const nameField = page.locator('#pac-nombre');
  const phoneField = page.locator('#pac-telefono');
  await expect(nameField).toBeVisible();
  await expect(nameField).toBeEnabled();
  await expect(phoneField).toBeVisible();
  await expect(phoneField).toBeEnabled();
  await expectNoHorizontalOverflow(page, 'agendamiento paso 2');

  await nameField.fill(patient.name);
  await phoneField.fill(patient.phone);
  await page.getByRole('button', { name: 'Continuar' }).click();

  // Paso 3: pedir el código de WhatsApp y confirmar.
  await expect(page.getByRole('heading', { name: 'Confirma tu cita' })).toBeVisible();
  const sendCode = page.getByRole('button', { name: 'Enviar código por WhatsApp' });
  await expect(sendCode).toBeVisible();
  await expect(sendCode).toBeEnabled();
  await expectNoHorizontalOverflow(page, 'agendamiento paso 3');

  await verifyPublicPhone(page, api, patient.phone);
  const confirm = page.getByRole('button', { name: 'Confirmar cita' });
  await expect(confirm).toBeVisible();
  await expect(confirm).toBeEnabled();
  await expectNoHorizontalOverflow(page, 'agendamiento paso 3 con código');
  await confirm.click();

  await expect(page.getByRole('heading', { name: '¡Tu cita quedó agendada!' })).toBeVisible();
  await expectNoHorizontalOverflow(page, 'agendamiento confirmado');

  // Ingreso del personal.
  await page.goto('/ingreso');
  await expect(page.getByRole('heading', { name: 'Ingreso del personal' })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.getByLabel('Contraseña', { exact: true })).toBeVisible();
  const signIn = page.getByRole('button', { name: 'Ingresar' });
  await expect(signIn).toBeVisible();
  await expect(signIn).toBeEnabled();
  await expectNoHorizontalOverflow(page, 'ingreso del personal');

  await loginAsAuxiliar(page);
  await expect(page.locator('#filtro-dentista')).toBeVisible();
  await expectNoHorizontalOverflow(page, 'panel de agenda');
});
