/**
 * The save rules of supabase-migrations/cash-climb-v3-cloud-2026-11.sql, in JavaScript, so the test clouds
 * (cashClimbV3FakeCloud.js and the development isolated cloud) behave like the database. Each check returns
 * '' or the database error code. Keep the two in step: the same scenarios run against both
 * (cashClimbV3SaveScenarios.js).
 */
import { stableJson, sameValue } from '../app/cashClimbV3SameValue.js';

export const CCV3_MAX_PAYLOAD_BYTES = 1000000;
export const CCV3_DENIED_EMAILS = Object.freeze(['guest@guestmail.com']);

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const chars = (s) => [...s].length;
const btrim = (s) => s.replace(/^ +| +$/g, '');

/** Equality with jsonb semantics (key order ignored). */
export { stableJson };
export const sameJson = sameValue;

const omit = (obj, keys) => Object.fromEntries(Object.entries(obj || {}).filter(([k]) => !keys.includes(k)));

/** App level needed to write the record; null when the record's schema or engine version is unknown. */
export function requiredLevel(p) {
  return isObj(p) && p.schemaVersion === 1 && isObj(p.event) && p.event.version === 1 ? 1 : null;
}

export function payloadProblem(id, p) {
  if (!isObj(p)) return 'invalid-event';
  if (new TextEncoder().encode(JSON.stringify(p)).length > CCV3_MAX_PAYLOAD_BYTES) return 'too-large';
  if (p.type !== 'cash-climb-v3' || p.id !== id) return 'invalid-event';
  const ev = p.event;
  if (typeof p.schemaVersion !== 'number' || !isObj(ev) || typeof ev.version !== 'number') return 'invalid-event';
  if (requiredLevel(p) === null) return 'unsupported-format';
  if (!['setup', 'in-progress', 'completed'].includes(p.status)
    || typeof p.name !== 'string' || chars(btrim(p.name)) < 1 || chars(btrim(p.name)) > 200
    || typeof p.tournamentDate !== 'string' || chars(p.tournamentDate) > 20
    || !Array.isArray(p.players) || !isObj(p.placement) || !isObj(p.payout)
    || typeof p.payout.optimizerId !== 'string' || chars(p.payout.optimizerId) < 1 || chars(p.payout.optimizerId) > 200
    || ev.id !== id || ev.format !== 'cash-climb-v3'
    || !isObj(ev.matches) || !Array.isArray(ev.order) || !isObj(ev.ledger)) return 'invalid-event';
  if (p.players.length < 2 || p.players.length > 1024) return 'invalid-event';
  if (Object.values(ev.matches).some((m) => !isObj(m))) return 'invalid-event';
  const { entries, resolved } = ev.ledger;
  if (!Array.isArray(entries) || !isObj(resolved)) return 'invalid-event';
  if (entries.some((e) => !isObj(e) || typeof e.key !== 'string')) return 'invalid-event';
  if (new Set(entries.map((e) => e.key)).size !== entries.length) return 'invalid-event';
  if ((p.status === 'completed') !== isObj(ev.settlement)) return 'invalid-event';
  if (p.status === 'setup' && (entries.length > 0 || Object.keys(resolved).length > 0)) return 'invalid-event';
  return '';
}

const LIVE = ['status', 'result', 'winner'];

/** '' when `incoming` may replace `stored` (a different payload for the same event). */
export function lockProblem(stored, incoming) {
  if (stored.status === 'completed') return 'event-settled';
  if (stored.status === 'setup') return incoming.status === 'completed' ? 'status-order' : '';
  if (incoming.status === 'setup') return 'status-order';
  const sm = stored.event.matches;
  const im = incoming.event.matches;
  const sl = stored.event.ledger;
  const il = incoming.event.ledger;
  const top = ['status', 'updatedAt', 'completedAt', 'event'];
  if (!sameJson(omit(stored, top), omit(incoming, top))
    || !sameJson(omit(stored.event, ['matches', 'ledger', 'settlement']), omit(incoming.event, ['matches', 'ledger', 'settlement']))
    || !sameJson(omit(sl, ['entries', 'resolved', 'operatorRetainedCents']), omit(il, ['entries', 'resolved', 'operatorRetainedCents']))
    || Object.keys(im).some((k) => !(k in sm))
    || Object.keys(sm).some((k) => !(k in im) || !sameJson(omit(sm[k], LIVE), omit(im[k], LIVE)))) return 'locked';
  const resultChanged = Object.keys(sm).some((k) => sm[k].status !== 'open'
    && !sameJson([sm[k].status, sm[k].result, sm[k].winner], [im[k].status, im[k].result, im[k].winner]));
  if (resultChanged) return 'result-locked';
  const incomingEntries = new Set(il.entries.map(stableJson));
  if (sl.entries.some((e) => !incomingEntries.has(stableJson(e)))
    || Object.keys(sl.resolved).some((k) => !sameJson(sl.resolved[k], il.resolved[k]))) return 'ledger-locked';
  return '';
}

/**
 * Mirrors cash_climb_v3_is_operator: a site admin (`hubAdmin`, with the users privilege guard installed) or a
 * listed user id; never anonymous or a denied email.
 */
export function isOperator(user, operators) {
  if (!user?.uid || user.anonymous) return false;
  if (CCV3_DENIED_EMAILS.includes(String(user.email || '').toLowerCase())) return false;
  return Boolean(user.hubAdmin) || operators.some((o) => o.uid === user.uid);
}

export function canManage(user, operators, ownerId) {
  if (!isOperator(user, operators)) return false;
  return ownerId === user.uid || Boolean(user.hubAdmin) || operators.some((o) => o.uid === user.uid && o.canManageAll);
}
