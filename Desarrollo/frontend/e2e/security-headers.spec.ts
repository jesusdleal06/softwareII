import type { Page } from '@playwright/test';
import { test, expect } from './support/fixtures';
import { findSlot, uniqueName, uniquePhone } from './support/api';
import { loginAsAuxiliar, loginAsOdontologa, selectSlotInPicker } from './support/ui';

const PROD_URL = process.env.E2E_PROD_URL;

/**
 * CP-RNF03-04: the security headers from `vercel.json` must hold on the real
 * production build, and no page may trip the Content Security Policy.
 *
 * This spec only runs when `E2E_PROD_URL` points at the production build served
 * by `scripts/serve-dist.mjs`. The default `run.sh` stack (Angular dev server)
 * does not set it, so the regular E2E suite skips this file.
 */
test.use({ baseURL: PROD_URL ?? 'http://127.0.0.1:9' });
test.skip(!PROD_URL, 'Set E2E_PROD_URL to verify the production security headers.');

type CspViolation = {
  directive: string;
  blockedURI: string;
  source: string;
  line: number;
};

/**
 * Records `securitypolicyviolation` events from before the first script runs and
 * collects console errors about refused resources. Call `assertClean` once the
 * page under test has finished loading.
 */
async function watchCsp(page: Page): Promise<{ assertClean: () => Promise<void> }> {
  const consoleErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    const text = message.text();
    if (/content security policy|refused to (load|execute|apply|connect|frame)/i.test(text)) {
      consoleErrors.push(text);
    }
  });

  await page.addInitScript(() => {
    const store: CspViolation[] = [];
    (window as unknown as { __cspViolations: CspViolation[] }).__cspViolations = store;
    document.addEventListener('securitypolicyviolation', (event) => {
      store.push({
        directive: event.effectiveDirective,
        blockedURI: event.blockedURI,
        source: event.sourceFile,
        line: event.lineNumber,
      });
    });
  });

  return {
    async assertClean(): Promise<void> {
      const violations = await page.evaluate(
        () => (window as unknown as { __cspViolations?: CspViolation[] }).__cspViolations ?? [],
      );
      expect(violations, 'the page reported Content Security Policy violations').toEqual([]);
      expect(consoleErrors, 'the console reported CSP errors').toEqual([]);
    },
  };
}

const CSP_DIRECTIVES = [
  "default-src 'self'",
  "script-src 'self' 'sha256-",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://res.cloudinary.com",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
];

const FIXED_HEADERS: Record<string, string> = {
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
};

function expectSecurityHeaders(headers: Record<string, string>): void {
  const csp = headers['content-security-policy'];
  expect(csp, 'Content-Security-Policy header').toBeTruthy();

  for (const directive of CSP_DIRECTIVES) {
    expect(csp, `CSP should declare ${directive}`).toContain(directive);
  }
  expect(csp, "script-src must not allow 'unsafe-inline'").not.toMatch(
    /script-src[^;]*'unsafe-inline'/,
  );

  for (const [name, value] of Object.entries(FIXED_HEADERS)) {
    expect(headers[name], `${name} header`).toBe(value);
  }
}

test('serves the hardening headers on /, the SPA fallback and API errors', async ({ page }) => {
  const root = await page.request.get('/');
  expect(root.status()).toBe(200);
  expectSecurityHeaders(root.headers());

  const fallback = await page.request.get('/ruta-que-no-existe-rnf03-03');
  expect(fallback.status()).toBe(200);
  expect(fallback.headers()['content-type']).toContain('text/html');
  expectSecurityHeaders(fallback.headers());

  // The proxy also stamps the headers on backend errors.
  const missingApi = await page.request.get('/api/v1/ruta-que-no-existe-rnf03-03');
  expect(missingApi.status()).toBeGreaterThanOrEqual(400);
  expectSecurityHeaders(missingApi.headers());
});

test('renders the landing with the self-hosted Inter font and no CSP violation', async ({
  page,
}) => {
  const csp = await watchCsp(page);

  const externalFontRequests: string[] = [];
  page.on('request', (request) => {
    const host = new URL(request.url()).host;
    if (host === 'fonts.googleapis.com' || host === 'fonts.gstatic.com') {
      externalFontRequests.push(request.url());
    }
  });

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Agenda tu cita en 2 minutos' })).toBeVisible();

  const interLoaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return Array.from(document.fonts).some(
      (face) => face.family.replace(/["']/g, '').includes('Inter') && face.status === 'loaded',
    );
  });
  expect(interLoaded, 'Inter is served from /fonts and finished loading').toBe(true);
  expect(externalFontRequests, 'no Google Fonts request').toEqual([]);

  await csp.assertClean();
});

test('reaches the patient step of the public booking flow', async ({ api, page }) => {
  const csp = await watchCsp(page);
  const target = await findSlot(api);

  await page.goto('/agendar');
  await expect(page.getByRole('heading', { name: 'Elige tu horario' })).toBeVisible();
  await selectSlotInPicker(page, target);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Tus datos' })).toBeVisible();
  await page.locator('#pac-nombre').fill(uniqueName('RNF03'));
  await page.locator('#pac-telefono').fill(uniquePhone());

  await csp.assertClean();
});

test('signs the staff in', async ({ page }) => {
  const csp = await watchCsp(page);

  await loginAsAuxiliar(page);
  await expect(page.locator('app-date-nav')).toBeVisible();

  await csp.assertClean();
});

test('renders «Mi perfil» for the demo dentist', async ({ page }) => {
  const csp = await watchCsp(page);

  await loginAsOdontologa(page);
  await page.goto('/panel/mi-perfil');

  await expect(page.getByRole('heading', { name: 'Mi perfil' })).toBeVisible();
  await expect(page.getByLabel('Primer nombre')).toBeVisible();

  await csp.assertClean();
});

test('renders the reports page and its Unovis chart', async ({ page }) => {
  const csp = await watchCsp(page);

  await loginAsAuxiliar(page);
  await page.goto('/panel/reportes');
  await expect(page.getByRole('heading', { name: 'Reportes', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Este mes' }).click();
  const chart = page.locator('section[appReportChart]');
  await expect(chart).toBeVisible();
  await expect(chart.getByRole('heading', { name: 'Citas por día según estado' })).toBeVisible();
  await expect(page.locator('div[appReportCard]').first()).toBeVisible();

  await csp.assertClean();
});
