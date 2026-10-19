/**
 * Showdown cloud calls. Every call goes through a database function (see
 * supabase-migrations/cash-climb-showdown-2026-10.sql) and returns { data, error, code } —
 * it never throws, so the operator screens can always show what happened.
 */
import { publicShowdown } from './showdownPublicState.js';
import { formatSupportProblem, isPayoutV3, payoutVersionOf } from '../showdownPayoutVersion.js';
import { SHOWDOWN_ENGINE_LEVEL, minEngineFor } from '../showdownRules.js';

/** V3 events made by earlier builds may still say minEngine 1; the database requires the V3 engine level. */
export function withDeclaredEngine(state) {
  const required = minEngineFor(payoutVersionOf(state));
  return (state.minEngine ?? 1) >= required ? state : { ...state, minEngine: required };
}

/** Short code for a failed call: a 'showdown:<code>' raised by the database, or a transport problem. */
export function cloudErrorCode(error) {
  if (!error) return '';
  const msg = String(error.message || error.details || error.hint || error || '');
  const own = msg.match(/showdown:([a-z-]+)/);
  if (own) return own[1];
  // Two phones submitting the same match at the same instant: the one-waiting-score index refuses the second.
  if (error.code === '23505' || /duplicate key value/i.test(msg)) return 'duplicate';
  if (error.code === 'PGRST202' || error.code === '42883' || /Could not find the function|schema cache/i.test(msg)) return 'unavailable';
  if (error.code === '42501' || /permission denied|JWT|not authorized/i.test(msg)) return 'not-authorized';
  if (error.name === 'TypeError' || /fetch|network|timeout|offline/i.test(msg)) return 'network';
  return 'error';
}

export function staleVersionOf(error) {
  const m = String(error?.message || '').match(/showdown:stale-version:(\d+)/);
  return m ? Number(m[1]) : null;
}

const MESSAGES = {
  unavailable: 'Cloud saving is not set up yet. Everything is saved on this tablet only.',
  'not-authorized': 'This account cannot save this event to the cloud. Sign in as the operator who created it.',
  network: 'Could not reach the cloud. Your changes are safe on this tablet and will be sent when the connection returns.',
  'stale-version': 'Another device saved a newer copy of this event.',
  missing: 'The cloud copy of this event was removed.',
  'too-large': 'This event is too large to save to the cloud.',
  'invalid-event': 'The cloud refused this event because it is not a valid Showdown.',
  'update-required': 'This event uses a format this version of the app cannot save. Nothing was changed in the cloud. Update the app (reload the page) to continue it.',
  'not-recorded': 'The phone score was not approved because that result is not in the cloud copy of the event yet. Nothing was changed in the cloud.',
  'unsupported-format': 'The cloud refused this event because its tournament format is not recognized. Nothing was changed in the cloud.',
  'format-locked': 'The cloud refused this save because it would change the format of an event that has started. Nothing was changed in the cloud.',
  'plan-locked': 'The cloud refused this save because it would change the payout plan locked when the event started. Nothing was changed in the cloud.',
  'event-settled': 'The cloud refused this save because it would change a settled result, a recorded adjustment or locked qualifying credits. Nothing was changed in the cloud. Reload the event.',
  'dev-isolation-required': 'Development build: V3 events, and any event already tested with the isolated test cloud on this device, are never sent to the live database, so this one is saved on this tablet only. Turn on the V3 preview on this device to test cloud saving, phone scores and the TV with the isolated test cloud.',
  error: 'The cloud save did not work. Your changes are safe on this tablet.',
};

/** Shown with every cloud status while the isolated test cloud answers instead of the live database. */
export const ISOLATED_CLOUD_NOTE = 'Isolated test cloud: cloud saves, phone scores and the TV use this browser\u2019s test storage. Nothing is sent to the live database.';

/** Development build with the V3 preview off: V1 and V2 cloud saves are real writes to the live database. */
export const DEV_LIVE_WRITE_NOTE = 'Development build: this V1/V2 event saves to the LIVE database. Turn on the V3 preview on this device to use the isolated test cloud instead.';

export const V3_LOCAL_ONLY_MESSAGE = 'This V3 event is saved on this tablet only. The cloud cannot store V3 events until the V3 database update is installed, so other devices, phones and the TV cannot see it.';

/** `state`: the event being saved, when known, so a V3 event is never described with V1/V2 wording. */
export function cloudMessage(code, state = null) {
  if (code === 'unavailable' && state && isPayoutV3(state)) return V3_LOCAL_ONLY_MESSAGE;
  return MESSAGES[code] || MESSAGES.error;
}

export function createShowdownCloud({ operator, publicClient }) {
  async function call(client, fn, args) {
    if (!client) return { data: null, error: new Error('showdown:unavailable'), code: 'unavailable' };
    try {
      const { data, error } = await client.rpc(fn, args);
      if (error) return { data: null, error, code: cloudErrorCode(error) };
      return { data: data ?? null, error: null, code: '' };
    } catch (error) {
      return { data: null, error, code: cloudErrorCode(error) || 'network' };
    }
  }

  /**
   * Version-aware save (cash_climb_showdown_save_v2). Until that function is installed, V1 and V2 events
   * fall back to the original save; a V3 event never does, because only the new save protects it.
   */
  async function save(state, expectedVersion) {
    if (formatSupportProblem(state)) return { data: null, error: new Error('showdown:update-required'), code: 'update-required' };
    const payload = withDeclaredEngine(state);
    const args = { p_id: state.id, p_expected_version: Number(expectedVersion) || 0, p_payload: payload, p_public: publicShowdown(state) };
    const res = await call(operator, 'cash_climb_showdown_save_v2', { ...args, p_engine: SHOWDOWN_ENGINE_LEVEL });
    if (res.code !== 'unavailable' || isPayoutV3(state)) return res;
    return call(operator, 'cash_climb_showdown_save', args);
  }

  /**
   * Version-aware delete and decision (cash_climb_showdown_delete_v2 / _decide_v2). The original functions
   * act only on V1 events once the guard is installed; before that, they are the fallback.
   */
  async function versioned(fn, args) {
    const res = await call(operator, `${fn}_v2`, { ...args, p_engine: SHOWDOWN_ENGINE_LEVEL });
    return res.code === 'unavailable' ? call(operator, fn, args) : res;
  }

  return {
    save,
    load: (id) => call(operator, 'cash_climb_showdown_load', { p_id: id }),
    list: () => call(operator, 'cash_climb_showdown_list', {}),
    remove: (id) => versioned('cash_climb_showdown_delete', { p_id: id }),
    pending: (eventId) => call(operator, 'cash_climb_showdown_pending_list', { p_event_id: eventId }),
    decide: (id, decision, reason = '') => versioned('cash_climb_showdown_decide', { p_id: id, p_decision: decision, p_reason: reason }),
    publicList: () => call(publicClient, 'cash_climb_showdown_public_list', {}),
    publicGet: (id) => call(publicClient, 'cash_climb_showdown_public_get', { p_id: id }),
    publicPending: (eventId) => call(publicClient, 'cash_climb_showdown_public_pending', { p_event_id: eventId }),
    submit: ({ eventId, matchId, p1, p2, score1, score2, name = '' }) => call(publicClient, 'cash_climb_showdown_submit', {
      p_event_id: eventId, p_match_id: matchId, p_p1: p1, p_p2: p2, p_score1: score1, p_score2: score2, p_name: name,
    }),
    submissionStatus: (id) => call(publicClient, 'cash_climb_showdown_submission_status', { p_id: id }),
  };
}
