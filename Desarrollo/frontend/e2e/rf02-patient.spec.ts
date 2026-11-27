import { expect, test } from './support/fixtures';
import { findSlot, uniqueName } from './support/api';
import {
  loginAsAuxiliar,
  openAgendaAtDate,
  openNewAppointmentPanel,
  selectSlotInPicker,
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
