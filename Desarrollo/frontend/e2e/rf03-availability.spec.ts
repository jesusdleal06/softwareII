import { expect, test } from './support/fixtures';
import {
  bookPublic,
  findSharedSlot,
  getAvailability,
  getDentists,
  uniqueName,
  uniquePhone,
} from './support/api';
import { formatTimeLabel } from './support/dates';
import { selectSlotCriteria } from './support/ui';

test('CP-RF03-01: keeps the 10:00 slot available for another dentist', async ({
  api,
  page,
}) => {
  const dentists = await getDentists(api);
  const first = dentists.find((dentist) => dentist.name === 'Laura Villamizar');
  const second = dentists.find((dentist) => dentist.name === 'Andrés Peña');
  if (!first || !second) {
    throw new Error('Demo dentists not found');
  }

  const shared = await findSharedSlot(api, first, second, '10:00');
  await bookPublic(
    api,
    {
      dentist: first,
      procedure: shared.procedure,
      date: shared.date,
      time: shared.time,
    },
    { name: uniqueName('Paciente RF03'), phone: uniquePhone() },
  );

  const secondAvailability = await getAvailability(
    api,
    second.id,
    shared.procedure.id,
    shared.date,
  );
  expect(secondAvailability.slots).toContain('10:00');

  await page.goto('/agendar');
  await selectSlotCriteria(page, {
    dentist: second,
    procedure: shared.procedure,
    date: shared.date,
    time: shared.time,
  });
  await expect(
    page.getByRole('radio', { name: formatTimeLabel('10:00'), exact: true }),
  ).toBeVisible();
});
