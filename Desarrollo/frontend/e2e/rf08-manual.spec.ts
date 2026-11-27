import { expect, test } from './support/fixtures';
import {
  bookPublic,
  findSlot,
  getAvailability,
  uniqueName,
  uniquePhone,
} from './support/api';
import {
  agendaAppointment,
  loginAsAuxiliar,
  openAgendaAtDate,
  openNewAppointmentPanel,
  selectDentistFilter,
  selectSlotInPicker,
} from './support/ui';

test('CP-RF08-01: shows a manual appointment in the dentist agenda and stops offering its slot', async ({
  api,
  page,
}) => {
  const target = await findSlot(api);
  const patient = { name: uniqueName('Paciente RF08 Manual'), phone: uniquePhone() };

  await loginAsAuxiliar(page);
  await openAgendaAtDate(page, target.date);
  const dialog = await openNewAppointmentPanel(page);
  await selectSlotInPicker(dialog, target);
  await dialog.locator('#nc-nombre').fill(patient.name);
  await dialog.locator('#nc-telefono').fill(patient.phone);
  await dialog.getByRole('button', { name: 'Guardar cita' }).click();

  await expect(page.getByText(/registrada\. El recordatorio/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Listo' }).click();

  await openAgendaAtDate(page, target.date);
  await selectDentistFilter(page, target.dentist.id);
  await expect(agendaAppointment(page, target.dentist.name, patient.name)).toBeVisible();

  const availability = await getAvailability(
    api,
    target.dentist.id,
    target.procedure.id,
    target.date,
  );
  expect(availability.slots).not.toContain(target.time);
});

test('CP-RF08-03: blocks a manual appointment for a phone with an active appointment', async ({
  api,
  page,
}) => {
  const firstTarget = await findSlot(api);
  const patient = { name: uniqueName('Paciente RF08 Activo'), phone: uniquePhone() };
  await bookPublic(api, firstTarget, patient);

  const secondTarget = await findSlot(api);

  await loginAsAuxiliar(page);
  await openAgendaAtDate(page, secondTarget.date);
  const dialog = await openNewAppointmentPanel(page);
  await selectSlotInPicker(dialog, secondTarget);
  await dialog.locator('#nc-nombre').fill(uniqueName('Paciente RF08 Duplicado'));
  await dialog.locator('#nc-telefono').fill(patient.phone);
  await dialog.getByRole('button', { name: 'Guardar cita' }).click();

  await expect(page.getByText(/ya tiene una cita activa/)).toBeVisible();
  await expect(page.getByText(/Reprograma o cancela esa cita/)).toBeVisible();
  await expect(page.getByText(/registrada\. El recordatorio/)).toHaveCount(0);
});
