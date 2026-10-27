/**
 * Cash Climb (V3) cloud calls. Every call goes through a database function (see
 * supabase-migrations/cash-climb-v3-cloud-2026-11.sql) and returns { data, error, code, detail }: it never
 * throws, so the screens can always say what happened.
 */

/** This build's level. The database refuses writes from builds below the level a record needs. */
export const CASH_CLIMB_V3_CLIENT_LEVEL = 1;

/** Short code for a failed call: a 'ccv3:<code>' raised by the database, or a transport problem. */
export function cloudErrorCode(error) {
  if (!error) return '';
  const msg = String(error.message || error.details || error.hint || error || '');
  const own = msg.match(/ccv3:([a-z-]+)/);
  if (own) return own[1];
  if (error.code === 'PGRST202' || error.code === '42883' || /Could not find the function|schema cache/i.test(msg)) return 'unavailable';
  if (error.code === '42501' || /permission denied|JWT|not authorized/i.test(msg)) return 'not-authorized';
  if (error.name === 'TypeError' || /fetch|network|timeout|offline/i.test(msg)) return 'network';
  return 'error';
}

/** The cloud revision named in a 'stale-revision:<n>' refusal. */
export function staleRevisionOf(error) {
  const m = String(error?.message || '').match(/ccv3:stale-revision:(\d+)/);
  return m ? Number(m[1]) : null;
}

const MESSAGES = {
  'cloud-disabled': 'Cloud saving for Cash Climb is not turned on yet. This tournament is saved on this tablet only.',
  'dev-isolation-required': 'Development build: Cash Climb never saves to the live database from here. Turn on the isolated test cloud on this device to test cloud saving. This tournament is saved on this tablet only.',
  'local-host-blocked': 'This copy of the app is running on this computer or a private network, so Cash Climb never saves to the live database from here. This tournament is saved on this tablet only.',
  'upload-approval-required': 'This tournament was saved on this tablet before cloud saving was turned on. Review it and approve its first upload before it is sent.',
  unavailable: 'Cloud saving for Cash Climb is not set up yet. This tournament is saved on this tablet only.',
  'not-authorized': 'This account is not allowed to save Cash Climb tournaments to the cloud. Your changes are safe on this tablet.',
  network: 'Could not reach the cloud. Your changes are safe on this tablet and will be sent when the connection returns.',
  'stale-revision': 'Another device saved a newer copy of this tournament.',
  missing: 'The cloud no longer has a copy of this tournament. Your copy on this tablet is safe.',
  deleted: 'This tournament was deleted from the cloud on another device. Your copy on this tablet is kept but is no longer sent to the cloud.',
  'not-deletable': 'Only a tournament that has not started can be deleted from the cloud.',
  'too-large': 'This tournament is too large to save to the cloud. Your changes are safe on this tablet.',
  'invalid-event': 'The cloud refused this tournament because it is not a valid Cash Climb record. Nothing was changed in the cloud.',
  'unsupported-format': 'The cloud does not recognize this tournament\u2019s record version. Nothing was changed in the cloud.',
  'update-required': 'This tournament needs a newer version of the app. Reload the page to update. Nothing was changed in the cloud.',
  locked: 'The cloud refused this save because it would change the locked setup of a started tournament. Nothing was changed in the cloud.',
  'result-locked': 'The cloud refused this save because it would change a posted match result. Nothing was changed in the cloud.',
  'ledger-locked': 'The cloud refused this save because it would change or remove recorded earnings. Nothing was changed in the cloud.',
  'event-settled': 'The cloud refused this save because the tournament is settled and can no longer change. Nothing was changed in the cloud.',
  'status-order': 'The cloud refused this save because a tournament cannot go back to setup or skip play. Nothing was changed in the cloud.',
  'cloud-invalid': 'The cloud copy of this tournament failed validation on this tablet, so it was not used. Your copy on this tablet is unchanged.',
  error: 'The cloud save did not work. Your changes are safe on this tablet.',
};

export function cloudMessage(code) {
  return MESSAGES[code] || MESSAGES.error;
}

/** `client`: a Supabase client (or a test client) with rpc(fn, args). */
export function createCashClimbV3CloudApi({ client, level = CASH_CLIMB_V3_CLIENT_LEVEL }) {
  async function call(fn, args) {
    if (!client) return { data: null, error: new Error('ccv3:unavailable'), code: 'unavailable', detail: null };
    try {
      const { data, error } = await client.rpc(fn, args);
      if (error) return { data: null, error, code: cloudErrorCode(error), detail: staleRevisionOf(error) };
      return { data: data ?? null, error: null, code: '', detail: null };
    } catch (error) {
      return { data: null, error, code: cloudErrorCode(error) || 'network', detail: null };
    }
  }

  return {
    save: (record, expectedRevision) => call('cash_climb_v3_save', {
      p_id: record.id, p_expected_revision: Number(expectedRevision) || 0, p_payload: record, p_client_level: level,
    }),
    load: (id) => call('cash_climb_v3_load', { p_id: id }),
    list: () => call('cash_climb_v3_list', {}),
    remove: (id, expectedRevision) => call('cash_climb_v3_delete', { p_id: id, p_expected_revision: Number(expectedRevision) || 0, p_client_level: level }),
  };
}
