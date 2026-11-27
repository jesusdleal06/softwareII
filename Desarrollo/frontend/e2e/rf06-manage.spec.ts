import { expect, test } from './support/fixtures';
import {
  DEMO_AUXILIAR,
  bookPublic,
  findSlot,
  getAvailability,
  getManaged,
  issueManageLink,
  loginApi,
  uniqueName,
  uniquePhone,
  type StaffAppointmentDto,
} from './support/api';
import { selectDayInPicker, selectTimeInPicker } from './support/ui';

test('CP-RF06-03: reschedules the appointment from the manage link and frees the old slot', async ({
  api,
  page,
}) => {
  const target = await findSlot(api);
  const patient = { name: uniqueName('Paciente RF06'), phone: uniquePhone() };
  const appointment = await bookPublic(api, target, patient);
  const link = await issueManageLink(api, appointment.id);

  await page.goto(`/cita/${encodeURIComponent(link.token)}`);
  await expect(page.getByRole('button', { name: 'Reprogramar' })).toBeVisible();
  await page.getByRole('button', { name: 'Reprogramar' }).click();
  await expect(
    page.getByRole('heading', { name: 'Elige tu nuevo horario' }),
  ).toBeVisible();

  const newTarget = await findSlot(api, {
    fromDate: appointment.date,
    dentist: target.dentist,
    procedure: target.procedure,
    exclude: new Set([`${appointment.date}T${appointment.time}`]),
  });

  await selectDayInPicker(page, newTarget.date, appointment.date);
  await selectTimeInPicker(page, newTarget.time);
  await page.getByRole('button', { name: 'Confirmar nuevo horario' }).click();

  await expect(
    page.getByRole('heading', { name: '¡Tu cita fue reprogramada!' }),
  ).toBeVisible();

  const { token: staffToken } = await loginApi(
    api,
    DEMO_AUXILIAR.email,
    DEMO_AUXILIAR.password,
  );
  const agendaResponse = await api.get('/api/v1/appointments', {
    headers: { Authorization: `Bearer ${staffToken}` },
    params: { date: newTarget.date, dentistId: target.dentist.id },
  });
  expect(agendaResponse.status()).toBe(200);
  const agenda = (await agendaResponse.json()) as StaffAppointmentDto[];
  const moved = agenda.find((item) => item.id === appointment.id);
  expect(moved).toBeDefined();
  expect(moved?.date).toBe(newTarget.date);
  expect(moved?.time).toBe(newTarget.time);
  expect(moved?.status).toBe('REPROGRAMADA');

  const oldAvailability = await getAvailability(
    api,
    target.dentist.id,
    target.procedure.id,
    appointment.date,
  );
  expect(oldAvailability.slots).toContain(appointment.time);

  const newAvailability = await getAvailability(
    api,
    target.dentist.id,
    target.procedure.id,
    newTarget.date,
  );
  expect(newAvailability.slots).not.toContain(newTarget.time);
});

test('CP-RF06-05: rejects an altered manage link without exposing or changing the appointment', async ({
  api,
  page,
}) => {
  const target = await findSlot(api);
  const patient = { name: uniqueName('Paciente RF06 Invalido'), phone: uniquePhone() };
  const appointment = await bookPublic(api, target, patient);
  const link = await issueManageLink(api, appointment.id);

  const managedBefore = await getManaged(api, link.token);
  expect(managedBefore.status).toBe(200);
  const statusBefore = managedBefore.body?.status;

  const alteredToken =
    link.token.slice(0, -1) + (link.token.endsWith('a') ? 'b' : 'a');
  const altered = await getManaged(api, alteredToken);
  expect(altered.status).toBe(404);

  await page.goto(`/cita/${encodeURIComponent(alteredToken)}`);
  await expect(
    page.getByRole('heading', { name: 'No encontramos esta cita' }),
  ).toBeVisible();
  await expect(
    page.getByText(/El enlace no corresponde a una cita activa/),
  ).toBeVisible();
  await expect(page.getByText(patient.name)).toHaveCount(0);
  await expect(page.getByText(patient.phone)).toHaveCount(0);

  const managedAfter = await getManaged(api, link.token);
  expect(managedAfter.status).toBe(200);
  expect(managedAfter.body?.status).toBe(statusBefore);
});
