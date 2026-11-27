import { readFileSync } from 'node:fs';
import { expect, test } from './support/fixtures';
import {
  DEMO_AUXILIAR,
  bookStaff,
  findSlotBetween,
  getReport,
  loginApi,
  patchStatus,
  uniqueName,
  uniquePhone,
} from './support/api';
import { addDays, monthRange, toDateKey } from './support/dates';
import { loginAsAuxiliar } from './support/ui';

type ReportStatus = 'ATENDIDA' | 'CANCELADA' | 'NO_ASISTIO';

test('CP-RF10-01: generates the monthly report with correct totals in under five seconds', async ({
  api,
  page,
}) => {
  const { token } = await loginApi(api, DEMO_AUXILIAR.email, DEMO_AUXILIAR.password);
  const { from, to } = monthRange();
  const today = toDateKey(new Date());
  const slotFrom = from > today ? from : today;

  const before = await getReport(api, token, from, to);
  const missing: Array<{ status: ReportStatus; count: number }> = [
    { status: 'ATENDIDA', count: before.attended },
    { status: 'CANCELADA', count: before.cancelled },
    { status: 'NO_ASISTIO', count: before.noShow },
  ];

  for (const item of missing) {
    if (item.count > 0) {
      continue;
    }

    try {
      const target = await findSlotBetween(api, slotFrom, to);
      const appointment = await bookStaff(api, token, target, {
        name: uniqueName(`Paciente RF10 ${item.status}`),
        phone: uniquePhone(),
      });
      await patchStatus(api, token, appointment.id, item.status);
    } catch {
      // The seeded data may already cover the month; the assertions below decide.
    }
  }

  const report = await getReport(api, token, from, to);
  expect(report.attended).toBeGreaterThan(0);
  expect(report.cancelled).toBeGreaterThan(0);
  expect(report.noShow).toBeGreaterThan(0);

  await loginAsAuxiliar(page);
  await page.goto('/panel/reportes');
  await page.getByRole('button', { name: 'Este mes' }).click();

  const cardValue = (heading: string) =>
    page.locator('div[appReportCard]').filter({ hasText: heading }).locator('span').nth(1);

  await expect(cardValue('Pacientes atendidos')).toBeVisible();
  await expect(cardValue('Pacientes atendidos')).toHaveText(String(report.attended));
  await expect(cardValue('Citas canceladas')).toHaveText(String(report.cancelled));
  await expect(cardValue('Inasistencias')).toHaveText(String(report.noShow));
  await expect(cardValue('Índice de inasistencia')).toHaveText(`${report.noShowRate}%`);

  const pdfButton = page.getByRole('button', { name: 'Descargar PDF' });
  await expect(pdfButton).toBeEnabled();

  const started = Date.now();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    pdfButton.click(),
  ]);
  const elapsed = Date.now() - started;

  expect(elapsed).toBeLessThan(5000);
  expect(download.suggestedFilename()).toContain(`reporte-${from}-${to}`);
  expect(download.suggestedFilename().endsWith('.pdf')).toBe(true);

  const path = await download.path();
  expect(path).toBeTruthy();
  const pdf = readFileSync(path as string);
  expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
  await expect(page.getByText('Archivo PDF descargado.')).toBeVisible();
});

test('CP-RF10-03: warns when the period has no data', async ({ page }) => {
  await loginAsAuxiliar(page);
  await page.goto('/panel/reportes');

  const emptyFrom = toDateKey(addDays(new Date(), 365));
  const emptyTo = toDateKey(addDays(new Date(), 366));
  await page.locator('#desde').fill(emptyFrom);
  await page.locator('#hasta').fill(emptyTo);

  await expect(
    page.getByText('No hay datos para el periodo seleccionado'),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar PDF' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Exportar' })).toBeDisabled();
});
