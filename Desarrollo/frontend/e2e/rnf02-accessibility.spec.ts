import AxeBuilder from '@axe-core/playwright';
import { type Page } from '@playwright/test';

import { bookPublic, findSlot, issueManageLink, uniqueName, uniquePhone } from './support/api';
import { expect, test } from './support/fixtures';
import { selectSlotInPicker } from './support/ui';

/**
 * CP-RNF02-02 — accessibility of the public flow and the staff sign-in.
 *
 * Uses axe-core with the WCAG 2.0/2.1/2.2 A and AA rule sets and fails on any
 * `serious` or `critical` violation. It also completes one appointment with the
 * keyboard only and asserts the focus indicator stays visible on the chosen
 * time slot and on each step's main control.
 */
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'];

interface ActiveControl {
  id: string;
  role: string | null;
  text: string;
  groupLabel: string | null;
}

async function activeControl(page: Page): Promise<ActiveControl> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    return {
      id: el?.id ?? '',
      role: el?.getAttribute('role') ?? (el?.tagName === 'BUTTON' ? 'button' : el?.tagName === 'A' ? 'link' : null),
      text: (el?.textContent ?? '').trim(),
      groupLabel: el?.closest('[role="radiogroup"]')?.getAttribute('aria-label') ?? null,
    };
  });
}

async function tabUntil(
  page: Page,
  predicate: (control: ActiveControl) => boolean,
  description: string,
  maxTabs = 160,
): Promise<void> {
  for (let i = 0; i < maxTabs; i += 1) {
    if (predicate(await activeControl(page))) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  throw new Error(`No se alcanzó con el teclado: ${description}`);
}

async function expectFocusVisible(page: Page, context: string): Promise<void> {
  const styles = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el) return null;
    const computed = window.getComputedStyle(el);
    return {
      tag: el.tagName,
      matchesFocusVisible: el.matches(':focus-visible'),
      outlineStyle: computed.outlineStyle,
      outlineWidth: computed.outlineWidth,
      outlineColor: computed.outlineColor,
      boxShadow: computed.boxShadow,
    };
  });

  expect(styles, `${context}: no hay elemento enfocado`).not.toBeNull();

  const hasOutline =
    styles!.outlineStyle !== 'none' &&
    styles!.outlineStyle !== 'hidden' &&
    Number.parseFloat(styles!.outlineWidth) > 0 &&
    styles!.outlineColor !== 'transparent' &&
    styles!.outlineColor !== 'rgba(0, 0, 0, 0)';
  const hasShadow = styles!.boxShadow !== 'none' && styles!.boxShadow.trim() !== '';

  expect(
    styles!.matchesFocusVisible && (hasOutline || hasShadow),
    `${context}: el foco no es visible (matches :focus-visible=${styles!.matchesFocusVisible}, outline=${styles!.outlineStyle} ${styles!.outlineWidth} ${styles!.outlineColor}, box-shadow=${styles!.boxShadow})`,
  ).toBe(true);
}

async function expectNoSeriousViolations(page: Page, context: string): Promise<void> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical',
  );
  const summary = blocking
    .map(
      (violation) =>
        `- ${violation.id} (${violation.impact}): ${violation.help}\n  nodos: ${violation.nodes
          .map((node) => node.target.join(' '))
          .join(', ')}`,
    )
    .join('\n');

  expect(blocking, `${context}: axe detectó violaciones serias/críticas:\n${summary}`).toEqual([]);
}

test('CP-RNF02-02: la landing pública no tiene violaciones graves de accesibilidad', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('footer')).toBeVisible();
  await expectNoSeriousViolations(page, 'landing pública');
});

test('CP-RNF02-02: cada paso del agendamiento público pasa axe', async ({ page, api }) => {
  const target = await findSlot(api);

  await page.goto('/agendar');
  await expect(page.getByRole('heading', { name: 'Elige tu horario' })).toBeVisible();
  await expectNoSeriousViolations(page, 'agendamiento paso 1');

  await selectSlotInPicker(page, target);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Tus datos' })).toBeVisible();
  await expectNoSeriousViolations(page, 'agendamiento paso 2');

  await page.locator('#pac-nombre').fill(uniqueName('Paciente RNF02'));
  await page.locator('#pac-telefono').fill(uniquePhone());
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Confirma tu cita' })).toBeVisible();
  await expectNoSeriousViolations(page, 'agendamiento paso 3');
});

test('CP-RNF02-02: la página de gestión por enlace pasa axe', async ({ page, api }) => {
  const target = await findSlot(api);
  const patient = { name: uniqueName('Paciente RNF02'), phone: uniquePhone() };
  const appointment = await bookPublic(api, target, patient);
  const link = await issueManageLink(api, appointment.id);

  await page.goto(`/cita/${encodeURIComponent(link.token)}`);
  await expect(page.getByRole('button', { name: 'Reprogramar' })).toBeVisible();
  await expectNoSeriousViolations(page, 'gestión de la cita');
});

test('CP-RNF02-02: el ingreso del personal pasa axe', async ({ page }) => {
  await page.goto('/ingreso');
  await expect(page.getByRole('heading', { name: 'Ingreso del personal' })).toBeVisible();
  await expectNoSeriousViolations(page, 'ingreso del personal');
});

test('CP-RNF02-02: una cita se agenda solo con el teclado y el foco es visible', async ({ page }) => {
  await page.goto('/agendar');
  await expect(page.getByRole('heading', { name: 'Elige tu horario' })).toBeVisible();

  // Odontólogo.
  await tabUntil(
    page,
    (control) => control.groupLabel === 'Odontólogo' && control.role === 'radio',
    'grupo Odontólogo',
  );
  await page.keyboard.press('Space');
  await expectFocusVisible(page, 'odontólogo seleccionado');

  // Procedimiento.
  await tabUntil(
    page,
    (control) => control.groupLabel === 'Procedimiento' && control.role === 'radio',
    'grupo Procedimiento',
  );
  await page.keyboard.press('Space');
  await expectFocusVisible(page, 'procedimiento seleccionado');

  // Día: avanzar con las flechas hasta encontrar un día con horarios.
  await tabUntil(
    page,
    (control) => control.groupLabel === 'Día' && control.role === 'radio',
    'grupo Día',
  );
  let slotsFound = false;
  for (let day = 0; day < 7 && !slotsFound; day += 1) {
    await page.keyboard.press('Space');
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const count = await page
        .locator('[role="radiogroup"][aria-label^="Horarios de la "] [role="radio"]')
        .count();
      if (count > 0) {
        slotsFound = true;
        break;
      }
      const searching = await page.getByText('Buscando horarios disponibles').count();
      if (searching === 0) {
        break;
      }
      await page.waitForTimeout(150);
    }
    if (!slotsFound) {
      await page.keyboard.press('ArrowRight');
    }
  }
  expect(slotsFound, 'debía haber horarios disponibles en algún día de la semana visible').toBe(true);

  // Horario: elegir el primer horario con Space y comprobar el foco visible.
  await tabUntil(
    page,
    (control) => (control.groupLabel?.startsWith('Horarios de la ') ?? false) && control.role === 'radio',
    'grupo de horarios',
  );
  await page.keyboard.press('Space');
  await expectFocusVisible(page, 'horario seleccionado');

  // Continuar paso 1.
  await tabUntil(
    page,
    (control) => control.role === 'button' && control.text === 'Continuar',
    'botón Continuar del paso 1',
  );
  await expectFocusVisible(page, 'botón Continuar del paso 1');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Tus datos' })).toBeVisible();

  // Datos del paciente solo con el teclado.
  await tabUntil(page, (control) => control.id === 'pac-nombre', 'campo nombre');
  await expectFocusVisible(page, 'campo nombre');
  await page.keyboard.type(uniqueName('Paciente RNF02'));

  await tabUntil(page, (control) => control.id === 'pac-telefono', 'campo teléfono');
  await expectFocusVisible(page, 'campo teléfono');
  await page.keyboard.type(uniquePhone());

  await tabUntil(
    page,
    (control) => control.role === 'button' && control.text === 'Continuar',
    'botón Continuar del paso 2',
  );
  await expectFocusVisible(page, 'botón Continuar del paso 2');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Confirma tu cita' })).toBeVisible();

  // Confirmar cita.
  await tabUntil(
    page,
    (control) => control.role === 'button' && control.text === 'Confirmar cita',
    'botón Confirmar cita',
  );
  await expectFocusVisible(page, 'botón Confirmar cita');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: '¡Tu cita quedó agendada!' })).toBeVisible();
});
