import itemsure from './itemsureClient.js';
import { assertOk } from '../utils/itemsureErrors.js';

// Automatic Clover sales imports: the schedule and how it's going. The database works out the
// next time in the Clover site's time zone; a shared scheduler does the importing.

const missingFunction = (error) => error && (error.code === 'PGRST202' || /could not find the function/i.test(error.message || ''));

/** { missing } until the database update is applied, else the status (see itemsure.pos_auto_status). */
export async function getPosAutoStatus(organizationId) {
  const { data, error } = await itemsure.rpc('pos_auto_status', { p_organization: organizationId });
  if (missingFunction(error)) return { missing: true };
  return assertOk({ data, error }, 'automatic sales imports') || { connected: false, on: false };
}

/** Saves the schedule; { on, frequency: 'daily'|'weekly', weekday: 0-6, time: 'HH:MM' }. */
export async function setPosAutoSync(organizationId, { on, frequency, weekday, time }) {
  return assertOk(
    await itemsure.rpc('set_pos_auto_sync', {
      p_organization: organizationId, p_on: on, p_frequency: frequency, p_weekday: weekday, p_time: time,
    }),
    'save the schedule',
  );
}
