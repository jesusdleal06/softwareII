import { expect, test } from './support/fixtures';
import { findSlot, uniqueName, uniquePhone } from './support/api';
import {
  loginAsAuxiliar,
  openAgendaAtDate,
  openNewAppointmentPanel,
  selectSlotInPicker,
  verifyPublicPhone,
} from './support/ui';

test('CP-RF02-02: blocks saving a manual appointment without a phone', async ({
  api,
  page,
}) => {
  const target = await findSlot(api);

  await loginAsAuxiliar(page);
  await openAgendaAtDate(page, target.date);
  const dialog = await openNewAppointmentPanel(page);
  await selectSlotInPicker(dialog, target);

  await dialog.getByLabel('Nombre completo del paciente').fill(uniqueName('Paciente RF02'));
  await dialog.getByRole('button', { name: 'Guardar cita' }).click();

  await expect(page.locator('#nc-telefono-error')).toHaveText(
    'El número de celular es obligatorio.',
  );
  await expect(page.getByText(/registrada\. El recordatorio/)).toHaveCount(0);
});

test('CP-RF02-04: books a public appointment after verifying the WhatsApp code', async ({
  api,
  page,
}) => {
  const target = await findSlot(api);
  const patient = { name: uniqueName('Paciente RF02 Codigo'), phone: uniquePhone() };

  await page.goto('/agendar');
  await selectSlotInPicker(page, target);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Tus datos' })).toBeVisible();
  await expect(
    page.getByText(
      '10 dígitos. A este número enviaremos un código de verificación y el recordatorio por WhatsApp.',
    ),
  ).toBeVisible();
  await page.locator('#pac-nombre').fill(patient.name);
  await page.locator('#pac-telefono').fill(patient.phone);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page.getByRole('heading', { name: 'Confirma tu cita' })).toBeVisible();
  await verifyPublicPhone(page, api, patient.phone);
  const codeField = page.locator('#booking-code');
  await expect(codeField).toHaveAttribute('inputmode', 'numeric');
  await expect(codeField).toHaveAttribute('autocomplete', 'one-time-code');
  await expect(page.getByRole('button', { name: 'Reenviar código' })).toBeDisabled();

  await page.getByRole('button', { name: 'Confirmar cita' }).click();
  await expect(
    page.getByRole('heading', { name: '¡Tu cita quedó agendada!' }),
  ).toBeVisible();
  await expect(page.getByText(/Guarda este código/)).toBeVisible();
});
