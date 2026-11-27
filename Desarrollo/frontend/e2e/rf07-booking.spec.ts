import { expect, test } from './support/fixtures';
import { bookPublic, findSlot, uniqueName, uniquePhone } from './support/api';
import {
  agendaAppointment,
  loginAsAuxiliar,
  openAgendaAtDate,
  selectDentistFilter,
  selectSlotInPicker,
} from './support/ui';

test('CP-RF07-01: books a public appointment in at most three steps and shows it in the agenda', async ({
  api,
  page,
}) => {
  const target = await findSlot(api);
  const patient = { name: uniqueName('Paciente RF07'), phone: uniquePhone() };

  await page.goto('/agendar');
  await expect(page.locator('ol[aria-label="Progreso"] li')).toHaveCount(3);
  await selectSlotInPicker(page, target);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Tus datos' })).toBeVisible();
  await page.locator('#pac-nombre').fill(patient.name);
  await page.locator('#pac-telefono').fill(patient.phone);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Confirma tu cita' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar cita' }).click();

  await expect(
    page.getByRole('heading', { name: '¡Tu cita quedó agendada!' }),
  ).toBeVisible();
  await expect(page.getByText(/Guarda este código/)).toBeVisible();

  await loginAsAuxiliar(page);
  await openAgendaAtDate(page, target.date);
  await selectDentistFilter(page, target.dentist.id);
  await expect(agendaAppointment(page, target.dentist.name, patient.name)).toBeVisible();
});

test('CP-RF07-02: blocks a second active appointment for the same phone', async ({
  api,
  page,
}) => {
  const firstTarget = await findSlot(api);
  const patient = { name: uniqueName('Paciente RF07 Activo'), phone: uniquePhone() };
  await bookPublic(api, firstTarget, patient);

  const secondTarget = await findSlot(api);

  await page.goto('/agendar');
  await selectSlotInPicker(page, secondTarget);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.locator('#pac-nombre').fill(uniqueName('Paciente RF07 Segundo'));
  await page.locator('#pac-telefono').fill(patient.phone);
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Confirmar cita' }).click();

  await expect(
    page.getByRole('heading', { name: 'Ya tienes una cita programada' }),
  ).toBeVisible();
  await expect(
    page.getByText(/cada paciente puede tener una sola cita pendiente a la vez/),
  ).toBeVisible();
});
