/**
 * Test-only delete and phone-score decision scenarios for the proposed V2 guard, run against both the test
 * cloud (showdownFakeCloud.js) and the real SQL (supabase-migrations/tests). "legacy" = the functions older
 * builds call; "v2" = the version-aware functions current builds call with their engine level.
 * Each scenario: { name, run(ctx) } where ctx = { call(user, fn, args) -> { data, code }, tamper(id, patch) }.
 * run returns a list of mismatches.
 */
import * as E from '../showdownEngine.js';
import { startedEvent } from '../showdownTestKit.js';
import { startV3, startNext } from '../v3/showdownV3WorkflowKit.js';

const MISSING_SUBMISSION = '00000000-0000-4000-8000-0000000000ff';

/** An event with one match on a table, and the same event with the phone's score recorded. */
export function onTable(version, seed) {
  if (version === 3) {
    const { s, op } = startV3(8, { seed });
    const [on, m] = startNext(s, op, 'qualifying');
    const a = Math.ceil(on.payoutPlan.qualifyingGames / 2);
    const score = { score1: a, score2: on.payoutPlan.qualifyingGames - a };
    return { on, m, score, other: { score1: score.score2, score2: score.score1 }, record: (sc) => E.recordResult(on, m.id, sc, op()) };
  }
  const { s, op } = startedEvent(8, { seed, payoutVersion: version });
  const m = s.matches.find((x) => x.phase === 'qualifying');
  const on = E.startOnTable(s, m.id, 1, op());
  const race = on.settings.qualifyingRaceTo;
  return { on, m, score: { score1: race, score2: race - 1 }, other: { score1: race - 1, score2: race }, record: (sc) => E.recordResult(on, m.id, sc, op()) };
}

function checker(ctx) {
  const problems = [];
  const expect = async (label, user, fn, args, want) => {
    const res = await ctx.call(user, fn, args);
    const got = res.code || 'ok';
    if (got !== want) problems.push(`${label}: expected ${want}, got ${got}${res.message ? ` (${res.message})` : ''}`);
    return res;
  };
  const save = (label, ev, expected) => expect(label, 'operator', 'cash_climb_showdown_save_v2', {
    p_id: ev.id, p_expected_version: expected, p_payload: ev, p_public: { name: ev.name }, p_engine: 2,
  }, 'ok');
  const exists = async (label, id, want) => {
    const res = await ctx.call('operator', 'cash_climb_showdown_load', { p_id: id });
    if (Boolean(res.data) !== want) problems.push(`${label}: expected the event to ${want ? 'remain' : 'be gone'}`);
  };
  const status = async (label, subId, want) => {
    const res = await ctx.call('anon', 'cash_climb_showdown_submission_status', { p_id: subId });
    if (res.data?.status !== want) problems.push(`${label}: expected submission ${want}, got ${res.data?.status}`);
  };
  /** Saves the on-table event, then a phone sends `sc`. Returns the submission id. */
  const submitted = async (label, fx, id, sc) => {
    await save(`${label} save`, { ...fx.on, id }, 0);
    const res = await expect(`${label} submit`, 'anon', 'cash_climb_showdown_submit', {
      p_event_id: id, p_match_id: fx.m.id, p_p1: fx.m.p1, p_p2: fx.m.p2, p_score1: sc.score1, p_score2: sc.score2, p_name: 'Phone',
    }, 'ok');
    return res.data?.id;
  };
  return { problems, expect, save, exists, status, submitted };
}

const del = (id, engine) => (engine === undefined ? { p_id: id } : { p_id: id, p_engine: engine });
const dec = (id, decision, engine) => ({ p_id: id, p_decision: decision, p_reason: '', ...(engine === undefined ? {} : { p_engine: engine }) });
const LEGACY_DELETE = 'cash_climb_showdown_delete';
const DELETE_V2 = 'cash_climb_showdown_delete_v2';
const LEGACY_DECIDE = 'cash_climb_showdown_decide';
const DECIDE_V2 = 'cash_climb_showdown_decide_v2';

export function mutationScenarios() {
  const fx = { 1: onTable(1, 401), 2: onTable(2, 402), 3: onTable(3, 403) };
  return [
    { name: 'older builds delete V1 events, never V2, V3 or a tampered format', async run(ctx) {
      const c = checker(ctx);
      for (const v of [1, 2, 3]) await c.save(`create V${v}`, { ...fx[v].on, id: `md-${v}` }, 0);
      await c.save('create V1 to tamper', { ...fx[1].on, id: 'md-t' }, 0);
      await c.expect('V1', 'operator', LEGACY_DELETE, del('md-1'), 'ok');
      await c.exists('V1', 'md-1', false);
      for (const v of [2, 3]) {
        await c.expect(`V${v}`, 'operator', LEGACY_DELETE, del(`md-${v}`), 'update-required');
        await c.exists(`V${v}`, `md-${v}`, true);
      }
      for (const patch of [{ payoutVersion: 7 }, { payoutVersion: '1' }, { minEngine: 2 }, { minEngine: 'x' }]) {
        await ctx.tamper('md-t', patch);
        await c.expect(`tampered ${JSON.stringify(patch)}`, 'operator', LEGACY_DELETE, del('md-t'), 'update-required');
      }
      await c.exists('tampered', 'md-t', true);
      await c.expect('missing event', 'operator', LEGACY_DELETE, del('md-none'), 'ok');
      return c.problems;
    } },
    { name: 'current builds delete every supported format; engine and owner checks apply', async run(ctx) {
      const c = checker(ctx);
      for (const v of [1, 2, 3]) await c.save(`create V${v}`, { ...fx[v].on, id: `mv-${v}` }, 0);
      await c.save('create V1 to tamper', { ...fx[1].on, id: 'mv-t' }, 0);
      await c.expect('no engine', 'operator', DELETE_V2, del('mv-3', null), 'update-required');
      await c.expect('engine 1 on V3', 'operator', DELETE_V2, del('mv-3', 1), 'update-required');
      await c.expect('player', 'player', DELETE_V2, del('mv-3', 2), 'not-authorized');
      await c.expect('V1 engine 1', 'operator', DELETE_V2, del('mv-1', 1), 'ok');
      await c.expect('V2', 'operator', DELETE_V2, del('mv-2', 2), 'ok');
      await c.expect('V3 by admin', 'admin', DELETE_V2, del('mv-3', 2), 'ok');
      for (const v of [1, 2, 3]) await c.exists(`V${v}`, `mv-${v}`, false);
      await ctx.tamper('mv-t', { payoutVersion: 7 });
      await c.expect('unrecognized format', 'operator', DELETE_V2, del('mv-t', 2), 'update-required');
      await c.expect('missing event', 'operator', DELETE_V2, del('mv-none', 2), 'ok');
      return c.problems;
    } },
    { name: 'older builds decide V1 phone scores, never V2 or V3 ones', async run(ctx) {
      const c = checker(ctx);
      const v1 = await c.submitted('V1', fx[1], 'mp-1', fx[1].score);
      await c.expect('V1 approve', 'operator', LEGACY_DECIDE, dec(v1, 'approved'), 'ok');
      await c.status('V1', v1, 'approved');
      for (const v of [2, 3]) {
        const sub = await c.submitted(`V${v}`, fx[v], `mp-${v}`, fx[v].score);
        await c.save(`V${v} record`, { ...fx[v].record(fx[v].score), id: `mp-${v}` }, 1);
        await c.expect(`V${v} approve`, 'operator', LEGACY_DECIDE, dec(sub, 'approved'), 'update-required');
        await c.expect(`V${v} reject`, 'operator', LEGACY_DECIDE, dec(sub, 'rejected'), 'update-required');
        await c.status(`V${v}`, sub, 'pending');
      }
      return c.problems;
    } },
    { name: 'current builds approve a V2 or V3 phone score only once exactly that result is saved', async run(ctx) {
      const c = checker(ctx);
      for (const v of [2, 3]) {
        const id = `ma-${v}`;
        const sub = await c.submitted(`V${v}`, fx[v], id, fx[v].score);
        await c.expect(`V${v} before recording`, 'operator', DECIDE_V2, dec(sub, 'approved', 2), 'not-recorded');
        await c.save(`V${v} record`, { ...fx[v].record(fx[v].score), id }, 1);
        await c.expect(`V${v} engine 1`, 'operator', DECIDE_V2, dec(sub, 'approved', v === 3 ? 1 : null), 'update-required');
        await c.expect(`V${v} player`, 'player', DECIDE_V2, dec(sub, 'approved', 2), 'not-authorized');
        await c.expect(`V${v} approve`, 'operator', DECIDE_V2, dec(sub, 'approved', 2), 'ok');
        await c.status(`V${v}`, sub, 'approved');
        await c.expect(`V${v} again`, 'operator', DECIDE_V2, dec(sub, 'rejected', 2), 'already-decided');

        const otherId = `mo-${v}`;
        const other = await c.submitted(`V${v} other`, fx[v], otherId, fx[v].other);
        await c.save(`V${v} other record`, { ...fx[v].record(fx[v].score), id: otherId }, 1);
        await c.expect(`V${v} different result`, 'operator', DECIDE_V2, dec(other, 'approved', 2), 'not-recorded');
        await c.expect(`V${v} reject`, 'operator', DECIDE_V2, dec(other, 'rejected', 2), 'ok');
        await c.status(`V${v} other`, other, 'rejected');
      }
      const v1 = await c.submitted('V1', fx[1], 'ma-1', fx[1].score);
      await c.expect('V1 approve (unchanged)', 'operator', DECIDE_V2, dec(v1, 'approved', 2), 'ok');
      await c.expect('invalid decision', 'operator', DECIDE_V2, dec(v1, 'maybe', 2), 'invalid-decision');
      await c.expect('missing submission', 'operator', DECIDE_V2, dec(MISSING_SUBMISSION, 'approved', 2), 'submission-not-found');
      return c.problems;
    } },
  ];
}
