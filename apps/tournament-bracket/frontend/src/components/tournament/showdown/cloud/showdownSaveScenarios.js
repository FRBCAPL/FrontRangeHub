/**
 * Test-only save scenarios run against both the test cloud (showdownFakeCloud.js) and the real SQL
 * (supabase-migrations/tests). Events are built by the engine, so they look exactly like saved events.
 * Each step: { user, fn: 'legacy' | 'v2', expected, payload, engine, expect: 'ok' | <error code>, version? }.
 */
import * as E from '../showdownEngine.js';
import { startedEvent } from '../showdownTestKit.js';
import { createV3, startV3, toPlayoffsV3, runV3, v3Op, CONFIRM } from '../v3/showdownV3WorkflowKit.js';

const withId = (ev, id) => ({ ...E.clone(ev), id });
const without = (ev, key) => { const out = E.clone(ev); delete out[key]; return out; };

function v3InPlayoffsWithResult(seed) {
  const { s: po, op } = toPlayoffsV3(8, { seed });
  const m = po.matches.find((x) => x.phase === 'playoff' && x.p1 && x.p2);
  return E.recordResult(E.startOnTable(po, m.id, 1, op()), m.id, { score1: 5, score2: 2 }, op());
}

/** Built once: every event the scenarios need. */
export function saveFixtures() {
  const v1 = startedEvent(8, { seed: 71, payoutVersion: 1 }).s;
  const v2 = startedEvent(8, { seed: 72, payoutVersion: 2 }).s;
  const v2Setup = E.createShowdown({ payoutVersion: 2, players: [] }, v3Op(73)());
  const v3Setup = createV3(8, {}, v3Op(74));
  const v3Started = startV3(8, { seed: 75 }).s;
  const v3Playoff = v3InPlayoffsWithResult(76);
  const { s: po, op } = toPlayoffsV3(8, { seed: 77 });
  const v3Interrupted = E.interruptShowdown(po, {}, CONFIRM, op());
  const done = runV3(9, { seed: 78 });
  const v3Adjusted = E.adjustPayout(done.s, { playerId: 'P2', amountCents: 50, reason: 'Scoring error' }, done.op());
  const v3Adjusted2 = E.adjustPayout(v3Adjusted, { playerId: 'P3', amountCents: 50, reason: 'Second fix' }, done.op());
  return { v1, v2, v2Setup, v3Setup, v3Started, v3Playoff, v3Interrupted, v3Adjusted, v3Adjusted2 };
}

const st = (user, fn, expected, payload, expect, extra = {}) => ({ user, fn, expected, payload, expect, engine: 2, ...extra });

/** Before the V2 guard, older builds could still save V2 events through the legacy save. */
function unguardedV2Scenarios(f) {
  return [
    { name: 'legacy save keeps working for V1 and V2', steps: [
      st('operator', 'legacy', 0, withId(f.v1, 'l1'), 'ok', { version: 1 }),
      st('operator', 'legacy', 1, withId(f.v1, 'l1'), 'ok', { version: 2 }),
      st('operator', 'v2', 2, withId(f.v1, 'l1'), 'ok', { version: 3 }),
      st('operator', 'legacy', 0, withId(f.v2, 'l2'), 'ok'),
      st('operator', 'legacy', 1, withId({ ...f.v2, name: 'Renamed' }, 'l2'), 'ok'),
    ] },
    { name: 'a build that drops the format cannot silently turn V2 into V1', steps: [
      st('operator', 'legacy', 0, withId(f.v2, 'l6'), 'ok'),
      st('operator', 'legacy', 1, withId(without(f.v2, 'payoutVersion'), 'l6'), 'update-required'),
      st('operator', 'legacy', 0, withId(f.v2Setup, 'l7'), 'ok'),
      st('operator', 'legacy', 1, withId({ ...f.v2Setup, payoutVersion: 1 }, 'l7'), 'ok'),
    ] },
  ];
}

/** With the V2 guard, the legacy save is V1 only; V2 events need a current build. */
function guardedV2Scenarios(f) {
  return [
    { name: 'legacy save keeps working for V1; V2 needs a current build', steps: [
      st('operator', 'legacy', 0, withId(f.v1, 'l1'), 'ok', { version: 1 }),
      st('operator', 'legacy', 1, withId(f.v1, 'l1'), 'ok', { version: 2 }),
      st('operator', 'v2', 2, withId(f.v1, 'l1'), 'ok', { version: 3 }),
      st('operator', 'legacy', 0, withId(f.v2, 'l2'), 'update-required'),
      st('operator', 'v2', 0, withId(f.v2, 'l2'), 'ok', { version: 1 }),
      st('operator', 'legacy', 1, withId({ ...f.v2, name: 'Renamed' }, 'l2'), 'update-required'),
    ] },
    { name: 'a build that drops the format cannot silently turn V2 into V1', steps: [
      st('operator', 'v2', 0, withId(f.v2, 'l6'), 'ok'),
      st('operator', 'legacy', 1, withId(without(f.v2, 'payoutVersion'), 'l6'), 'update-required'),
      st('operator', 'v2', 0, withId(f.v2Setup, 'l7'), 'ok'),
      st('operator', 'legacy', 1, withId({ ...f.v2Setup, payoutVersion: 1 }, 'l7'), 'update-required'),
      st('operator', 'v2', 1, withId({ ...f.v2Setup, payoutVersion: 1 }, 'l7'), 'ok', { version: 2 }),
    ] },
  ];
}

/** `guarded`: expectations with the proposed V2 guard installed (false: the database as it is today). */
export function saveScenarios(f, { guarded = true } = {}) {
  const v3PlayoffReopened = E.reopenQualifying({ ...f.v3Playoff, matches: f.v3Playoff.matches.map((m) => (m.phase === 'playoff' ? { ...m, status: 'waiting' } : m)) }, CONFIRM, v3Op(80)());
  return [
    ...(guarded ? guardedV2Scenarios(f) : unguardedV2Scenarios(f)),
    { name: 'legacy save refuses an incoming V3 event', steps: [
      st('operator', 'legacy', 0, withId(f.v3Setup, 'l3'), 'update-required'),
      st('operator', 'legacy', 0, withId(f.v3Started, 'l3'), 'update-required'),
    ] },
    { name: 'legacy save refuses to overwrite a stored V3 event, even disguised as V1', steps: [
      st('operator', 'v2', 0, withId(f.v3Started, 'l4'), 'ok'),
      st('operator', 'legacy', 1, withId(f.v3Started, 'l4'), 'update-required'),
      st('operator', 'legacy', 1, withId(without(without(f.v3Started, 'payoutVersion'), 'minEngine'), 'l4'), 'update-required'),
      st('operator', 'legacy', 1, withId({ ...f.v1 }, 'l4'), 'update-required'),
    ] },
    { name: 'unknown payout versions are never treated as V1', steps: [
      st('operator', 'legacy', 0, withId({ ...f.v1, payoutVersion: 9 }, 'l5'), 'update-required'),
      st('operator', 'legacy', 0, withId({ ...f.v1, payoutVersion: '1' }, 'l5'), 'update-required'),
      st('operator', 'legacy', 0, withId({ ...f.v1, payoutVersion: null }, 'l5'), 'update-required'),
      st('operator', 'v2', 0, withId({ ...f.v1, payoutVersion: 4 }, 'l5'), 'unsupported-format'),
      st('operator', 'v2', 0, withId({ ...f.v1, payoutVersion: '3' }, 'l5'), 'unsupported-format'),
      st('operator', 'v2', 0, withId({ ...f.v1, minEngine: 'two' }, 'l5'), 'unsupported-format'),
    ] },
    { name: 'engine levels: older builds cannot save V3 or newer events', steps: [
      st('operator', 'v2', 0, withId(f.v3Started, 'e1'), 'update-required', { engine: 1 }),
      st('operator', 'v2', 0, withId(f.v1, 'e2'), 'ok', { engine: 1 }),
      st('operator', 'v2', 0, withId({ ...f.v3Started, minEngine: 1 }, 'e3'), 'invalid-event'),
      st('operator', 'v2', 0, withId({ ...f.v3Started, payoutPlan: null }, 'e3'), 'invalid-event'),
      st('operator', 'v2', 0, withId({ ...f.v1, minEngine: 3 }, 'e4'), 'update-required'),
      st('operator', 'legacy', 0, withId({ ...f.v1, minEngine: 2 }, 'e5'), 'update-required'),
      st('operator', 'v2', 0, withId(f.v3Started, 'e6'), 'update-required', { engine: null }),
    ] },
    { name: 'two devices saving from the same version: the second must reload', steps: [
      st('operator', 'v2', 0, withId(f.v3Started, 'c1'), 'ok', { version: 1 }),
      st('operator', 'v2', 1, withId({ ...f.v3Started, name: 'Tablet A' }, 'c1'), 'ok', { version: 2 }),
      st('operator', 'v2', 1, withId({ ...f.v3Started, name: 'Tablet B' }, 'c1'), 'stale-version', { detail: 2 }),
      st('operator', 'v2', 2, withId({ ...f.v3Started, name: 'Tablet B' }, 'c1'), 'ok', { version: 3 }),
      st('operator', 'legacy', 0, withId(f.v1, 'c2'), 'ok'),
      st('operator', 'legacy', 1, withId({ ...f.v1, name: 'A' }, 'c2'), 'ok'),
      st('operator', 'legacy', 1, withId({ ...f.v1, name: 'B' }, 'c2'), 'stale-version', { detail: 2 }),
    ] },
    { name: 'two devices creating the same new event: the second must reload', steps: [
      st('operator', 'v2', 0, withId({ ...f.v3Setup, name: 'A' }, 'c3'), 'ok'),
      st('operator', 'v2', 0, withId({ ...f.v3Setup, name: 'B' }, 'c3'), 'stale-version', { detail: 1 }),
    ] },
    { name: 'retrying a save that already went through is not a conflict', steps: [
      st('operator', 'v2', 0, withId(f.v3Started, 'r1'), 'ok', { version: 1 }),
      st('operator', 'v2', 1, withId({ ...f.v3Started, name: 'Sent once' }, 'r1'), 'ok', { version: 2 }),
      st('operator', 'v2', 1, withId({ ...f.v3Started, name: 'Sent once' }, 'r1'), 'ok', { version: 2 }),
      st('operator', 'v2', 1, withId({ ...f.v3Started, name: 'Different' }, 'r1'), 'stale-version', { detail: 2 }),
    ] },
    { name: 'a partly played V3 event cannot be overwritten in ways the engine forbids', steps: [
      st('operator', 'v2', 0, withId(f.v3Playoff, 'p1'), 'ok'),
      st('operator', 'v2', 1, withId({ ...f.v3Playoff, payoutPlan: { ...f.v3Playoff.payoutPlan, poolCents: f.v3Playoff.payoutPlan.poolCents + 100 } }, 'p1'), 'plan-locked'),
      st('operator', 'v2', 1, withId(v3PlayoffReopened, 'p1'), 'event-settled'),
      st('operator', 'v2', 1, withId({ ...f.v3Playoff, status: 'setup' }, 'p1'), 'invalid-event'),
      st('operator', 'v2', 1, withId({ ...f.v3Playoff, payoutVersion: 2, minEngine: 1 }, 'p1'), 'format-locked'),
      st('operator', 'v2', 1, withId({ ...f.v3Playoff, name: 'Still fine' }, 'p1'), 'ok'),
    ] },
    { name: 'a settled interruption is final', steps: [
      st('operator', 'v2', 0, withId(f.v3Interrupted, 's1'), 'ok'),
      st('operator', 'v2', 1, withId({ ...f.v3Interrupted, status: 'playoffs' }, 's1'), 'event-settled'),
      st('operator', 'v2', 1, withId({ ...f.v3Interrupted, v3Outcome: { ...f.v3Interrupted.v3Outcome, kind: 'completed' } }, 's1'), 'event-settled'),
    ] },
    { name: 'recorded adjustments can be added to but never removed or changed', steps: [
      st('operator', 'v2', 0, withId(f.v3Adjusted, 'a1'), 'ok'),
      st('operator', 'v2', 1, withId({ ...f.v3Adjusted, v3Adjustments: [] }, 'a1'), 'event-settled'),
      st('operator', 'v2', 1, withId({ ...f.v3Adjusted, v3Adjustments: [{ ...f.v3Adjusted.v3Adjustments[0], amountCents: 500 }] }, 'a1'), 'event-settled'),
      st('operator', 'v2', 1, withId(f.v3Adjusted2, 'a1'), 'ok'),
    ] },
    { name: 'only the owner or an admin can save', steps: [
      st('operator', 'v2', 0, withId(f.v3Started, 'o1'), 'ok'),
      st('guest', 'v2', 1, withId(f.v3Started, 'o1'), 'not-authorized'),
      st('player', 'v2', 1, withId(f.v3Started, 'o1'), 'not-authorized'),
      st('admin', 'v2', 1, withId({ ...f.v3Started, name: 'Admin fix' }, 'o1'), 'ok'),
    ] },
  ];
}

/** Runs one scenario. `call(user, fn, args)` returns { data, code, detail }. Returns a list of mismatches. */
export async function runSaveScenario(scenario, call) {
  const problems = [];
  for (const [i, s] of scenario.steps.entries()) {
    const args = { p_id: s.payload.id, p_expected_version: s.expected, p_payload: s.payload, p_public: { name: s.payload.name } };
    const res = s.fn === 'v2'
      ? await call(s.user, 'cash_climb_showdown_save_v2', { ...args, p_engine: s.engine })
      : await call(s.user, 'cash_climb_showdown_save', args);
    const got = res.code || 'ok';
    if (got !== s.expect) problems.push(`step ${i + 1}: expected ${s.expect}, got ${got}${res.message ? ` (${res.message})` : ''}`);
    else if (s.version && res.data?.version !== s.version) problems.push(`step ${i + 1}: expected version ${s.version}, got ${res.data?.version}`);
    else if (s.detail && res.detail !== s.detail) problems.push(`step ${i + 1}: expected stale version ${s.detail}, got ${res.detail}`);
  }
  return problems;
}
