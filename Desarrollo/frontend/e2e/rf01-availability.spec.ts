import { expect, test } from './support/fixtures';
import {
  DEMO_AUXILIAR,
  bookPublic,
  findSlot,
  getAvailability,
  loginApi,
  registerDentist,
  uniqueName,
  uniquePhone,
} from './support/api';
import { formatTimeLabel } from './support/dates';
import {
  selectDayInPicker,
  selectDentistInPicker,
  selectProcedureInPicker,
  selectSlotCriteria,
} from './support/ui';

test('CP-RF01-01: hides the booked 10:00 slot and keeps the other free slots', async ({
  api,
  page,
}) => {
  const target = await findSlot(api, { preferredTime: '10:00' });
  await bookPublic(api, target, {
    name: uniqueName('Paciente RF01'),
    phone: uniquePhone(),
  });

  await page.goto('/agendar');
  await selectSlotCriteria(page, target);

  const availability = await getAvailability(
    api,
    target.dentist.id,
    target.procedure.id,
    target.date,
  );
  const otherTime = availability.slots.find((time) => time !== '10:00');
  expect(otherTime).toBeDefined();

  await expect(
    page.getByRole('radio', { name: formatTimeLabel(otherTime as string), exact: true }),
  ).toBeVisible();
  await expect(page.getByRole('radio', { name: '10:00 AM', exact: true })).toHaveCount(0);
});

test('CP-RF01-02: warns when the dentist has no schedule and lets the user choose another one', async ({
  api,
  page,
}) => {
  const target = await findSlot(api);
  const { token } = await loginApi(api, DEMO_AUXILIAR.email, DEMO_AUXILIAR.password);
  const noScheduleDentist = await registerDentist(
    api,
    token,
    uniqueName('Dr. E2E Sin Agenda'),
    'Odontología E2E',
  );

  await page.goto('/agendar');
  await selectDentistInPicker(page, noScheduleDentist);
  await selectProcedureInPicker(page, target.procedure);
  await selectDayInPicker(page, target.date);

  await expect(
    page.getByText('No hay horarios disponibles este día. Prueba con otro día.'),
  ).toBeVisible();

  await selectDentistInPicker(page, target.dentist);
  await expect(
    page.getByRole('radio', { name: formatTimeLabel(target.time), exact: true }),
  ).toBeVisible();
});
