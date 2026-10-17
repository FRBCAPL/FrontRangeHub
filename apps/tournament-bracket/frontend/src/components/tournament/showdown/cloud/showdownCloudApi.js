/**
 * Showdown cloud calls. Every call goes through a database function (see
 * supabase-migrations/cash-climb-showdown-2026-10.sql) and returns { data, error, code } —
 * it never throws, so the operator screens can always show what happened.
 */
import { publicShowdown } from './showdownPublicState.js';

/** Short code for a failed call: a 'showdown:<code>' raised by the database, or a transport problem. */
export function cloudErrorCode(error) {
  if (!error) return '';
  const msg = String(error.message || error.details || error.hint || error || '');
  const own = msg.match(/showdown:([a-z-]+)/);
  if (own) return own[1];
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
  error: 'The cloud save did not work. Your changes are safe on this tablet.',
};

export function cloudMessage(code) {
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

  return {
    save: (state, expectedVersion) => call(operator, 'cash_climb_showdown_save', {
      p_id: state.id, p_expected_version: Number(expectedVersion) || 0, p_payload: state, p_public: publicShowdown(state),
    }),
    load: (id) => call(operator, 'cash_climb_showdown_load', { p_id: id }),
    list: () => call(operator, 'cash_climb_showdown_list', {}),
    remove: (id) => call(operator, 'cash_climb_showdown_delete', { p_id: id }),
    pending: (eventId) => call(operator, 'cash_climb_showdown_pending_list', { p_event_id: eventId }),
    decide: (id, decision, reason = '') => call(operator, 'cash_climb_showdown_decide', { p_id: id, p_decision: decision, p_reason: reason }),
    publicList: () => call(publicClient, 'cash_climb_showdown_public_list', {}),
    publicGet: (id) => call(publicClient, 'cash_climb_showdown_public_get', { p_id: id }),
    publicPending: (eventId) => call(publicClient, 'cash_climb_showdown_public_pending', { p_event_id: eventId }),
    submit: ({ eventId, matchId, p1, p2, score1, score2, name = '' }) => call(publicClient, 'cash_climb_showdown_submit', {
      p_event_id: eventId, p_match_id: matchId, p_p1: p1, p_p2: p2, p_score1: score1, p_score2: score2, p_name: name,
    }),
    submissionStatus: (id) => call(publicClient, 'cash_climb_showdown_submission_status', { p_id: id }),
  };
}
