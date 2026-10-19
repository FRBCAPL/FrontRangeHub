/**
 * The save rules of supabase-migrations/cash-climb-showdown-v3-2026-10.sql (and the proposed guard), in JavaScript, so the test
 * cloud (showdownFakeCloud.js) behaves like the database. Each returns '' or the database error code.
 * Keep the two in step: the same scenarios run against both (showdownSaveScenarios.js).
 */
export const DB_V3_ENGINE = 2;

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** Missing payoutVersion is V1; anything but the numbers 1, 2 or 3 is unsupported (null). */
export function dbPayoutVersion(p) {
  if (!isObj(p)) return null;
  if (!('payoutVersion' in p)) return 1;
  return [1, 2, 3].includes(p.payoutVersion) ? p.payoutVersion : null;
}

export function dbMinEngine(p) {
  if (!isObj(p)) return null;
  if (!('minEngine' in p)) return 1;
  return Number.isInteger(p.minEngine) && p.minEngine >= 1 && p.minEngine <= 9999 ? p.minEngine : null;
}

/**
 * The guard (supabase-migrations/proposed/cash-climb-showdown-v2-guard-PROPOSED.sql): the functions older
 * builds call (save, delete, decide) act only on V1 events.
 */
export function legacyV1OnlyProblem(payload) {
  return dbPayoutVersion(payload) !== 1 || (dbMinEngine(payload) ?? 99) > 1 ? 'update-required' : '';
}

export function guardedLegacySaveProblem(stored, incoming) {
  return legacyV1OnlyProblem(incoming) || (stored ? legacyV1OnlyProblem(stored.payload) : '');
}

/** cash_climb_showdown_delete_v2 / _decide_v2: the build's engine level against the stored event. */
export function engineProblem(payload, engine) {
  if (!Number.isInteger(engine) || engine < 1) return 'update-required';
  return dbPayoutVersion(payload) === null || (dbMinEngine(payload) ?? 99) > engine ? 'update-required' : '';
}

/** cash_climb_showdown_decide_v2: a V2 or V3 approval must match the saved result exactly. */
export function approvalProblem(payload, sub) {
  if (dbPayoutVersion(payload) === 1) return '';
  const matches = Array.isArray(payload?.matches) ? payload.matches : [];
  const recorded = matches.some((m) => m?.id === sub.match_id && m.status === 'completed' && m.result === 'played'
    && m.p1 === sub.p1 && m.p2 === sub.p2 && m.score1 === sub.score1 && m.score2 === sub.score2);
  return recorded ? '' : 'not-recorded';
}

/** Legacy save before the guard (V3 migration): never touches V3, unsupported formats, newer engines or a silent format change. */
export function legacySaveProblem(stored, incoming) {
  const vin = dbPayoutVersion(incoming);
  if (vin === null || vin === 3 || (dbMinEngine(incoming) ?? 99) > 1) return 'update-required';
  if (!stored) return '';
  const vst = dbPayoutVersion(stored.payload);
  if (vst === null || vst === 3 || (dbMinEngine(stored.payload) ?? 99) > 1) return 'update-required';
  if (vin !== vst && (stored.status !== 'setup' || !('payoutVersion' in incoming))) return 'update-required';
  return '';
}

/** Checks before the version comparison (format, engine, V3 plan presence). */
export function saveV2PreProblem(stored, incoming, engine) {
  if (!Number.isInteger(engine) || engine < 1) return 'update-required';
  const vin = dbPayoutVersion(incoming);
  const minIn = dbMinEngine(incoming);
  if (vin === null || minIn === null) return 'unsupported-format';
  if (minIn > engine) return 'update-required';
  if (vin === 3) {
    if (engine < DB_V3_ENGINE) return 'update-required';
    if (minIn < DB_V3_ENGINE) return 'invalid-event';
    if (incoming.status !== 'setup' && incoming.payoutPlan?.payoutVersion !== 3) return 'invalid-event';
  }
  if (!stored) return '';
  const vst = dbPayoutVersion(stored.payload);
  const minSt = dbMinEngine(stored.payload);
  if (vst === null || minSt === null || minSt > engine) return 'update-required';
  return '';
}

/** Checks after the version comparison: what a started event may not lose. */
export function saveV2LockProblem(stored, incoming) {
  if (stored.status === 'setup') return '';
  const was = stored.payload;
  if (dbPayoutVersion(incoming) !== dbPayoutVersion(was)) return 'format-locked';
  if (incoming.status === 'setup' || dbMinEngine(incoming) < dbMinEngine(was)) return 'invalid-event';
  if (dbPayoutVersion(was) !== 3) return '';
  if (!same(incoming.payoutPlan, was.payoutPlan)) return 'plan-locked';
  const kind = was.v3Outcome?.kind;
  if (['interrupted', 'interrupted-final', 'abandoned'].includes(kind) && (incoming.status !== 'completed' || !same(incoming.v3Outcome, was.v3Outcome))) return 'event-settled';
  const oldAdj = Array.isArray(was.v3Adjustments) ? was.v3Adjustments : [];
  const newAdj = incoming.v3Adjustments;
  if (oldAdj.length && (!Array.isArray(newAdj) || newAdj.length < oldAdj.length || oldAdj.some((a, i) => !same(a, newAdj[i])))) return 'event-settled';
  const playoffResult = (was.matches || []).some((m) => m.phase === 'playoff' && m.status === 'completed');
  if (playoffResult && !same(incoming.qualification?.v3Credits, was.qualification?.v3Credits)) return 'event-settled';
  return '';
}
