import { expect, test } from './support/fixtures';
import { monthRange } from './support/dates';
import type { LoginResponseDto } from './support/api';
import {
  getSession,
  login,
  loginAsAuxiliar,
  loginAsOdontologa,
} from './support/ui';

test('CP-RF09-01: shows only the signed-in role functions', async ({ page }) => {
  await loginAsAuxiliar(page);
  const auxiliarNav = page.getByRole('navigation', {
    name: 'Secciones del panel',
    exact: true,
  });
  await expect(auxiliarNav.getByRole('link', { name: 'Agenda', exact: true })).toBeVisible();
  await expect(auxiliarNav.getByRole('link', { name: 'Reportes', exact: true })).toBeVisible();
  await expect(auxiliarNav.getByRole('link', { name: 'Mi agenda', exact: true })).toHaveCount(0);
  await expect(auxiliarNav.getByRole('link', { name: 'Mi perfil', exact: true })).toHaveCount(0);

  await page.evaluate(() => localStorage.clear());
  await page.goto('/ingreso');
  await loginAsOdontologa(page);

  const dentistNav = page.getByRole('navigation', {
    name: 'Secciones del panel',
    exact: true,
  });
  await expect(dentistNav.getByRole('link', { name: 'Mi agenda', exact: true })).toBeVisible();
  await expect(dentistNav.getByRole('link', { name: 'Mi perfil', exact: true })).toBeVisible();
  await expect(dentistNav.getByRole('link', { name: 'Agenda', exact: true })).toHaveCount(0);
  await expect(dentistNav.getByRole('link', { name: 'Reportes', exact: true })).toHaveCount(0);
});

test('CP-RF09-02: rejects a wrong password and does not create a session', async ({
  page,
}) => {
  await login(page, 'ana@villadent.co', 'contraseña-incorrecta');

  await expect(
    page
      .getByRole('alert')
      .filter({
        hasText:
          'Correo o contraseña incorrectos. Verifica tus datos e intenta de nuevo.',
      }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/ingreso/);
  expect(await getSession(page)).toBeNull();
});

test('CP-RF09-03: redirects an unauthorized reports route and the API answers 403', async ({
  api,
  page,
}) => {
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/v1/auth/login') &&
      response.request().method() === 'POST',
  );
  await loginAsOdontologa(page);
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(200);
  const loginBody = (await loginResponse.json()) as LoginResponseDto;
  expect(loginBody.token).toBeTruthy();

  await page.goto('/panel/reportes');

  await expect(page).toHaveURL(/\/acceso-denegado/);
  const redirectUrl = new URL(page.url());
  expect(redirectUrl.searchParams.get('ruta')).toBe('/panel/reportes');
  await expect(page.getByRole('heading', { name: 'Acceso denegado' })).toBeVisible();

  const { from, to } = monthRange();
  const response = await api.get('/api/v1/reports', {
    headers: { Authorization: `Bearer ${loginBody.token}` },
    params: { from, to },
  });
  expect(response.status()).toBe(403);
});
