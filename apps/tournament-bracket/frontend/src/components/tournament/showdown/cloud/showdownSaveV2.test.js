import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { startedEvent } from '../showdownTestKit.js';
import { createV3, startV3, startNext, v3Op } from '../v3/showdownV3WorkflowKit.js';
import { createFakeCloud, OPERATOR, GUEST_OPERATOR, ADMIN, PLAYER } from './showdownFakeCloud.js';
import { cloudErrorCode, cloudMessage, staleVersionOf, withDeclaredEngine, createShowdownCloud } from './showdownCloudApi.js';
import { saveSyncMeta } from './showdownSyncStore.js';
import { SHOWDOWN_ENGINE_LEVEL } from '../showdownRules.js';
import { freshStorage, apiFor, syncFor } from './showdownCloudTestKit.js';
import { saveFixtures, saveScenarios, runSaveScenario } from './showdownSaveScenarios.js';
import { sendPhoneScore } from '../public/showdownPhoneSubmit.js';

beforeEach(() => freshStorage());

const USERS = { operator: OPERATOR, guest: GUEST_OPERATOR, admin: ADMIN, player: PLAYER };

function fakeCaller(fake) {
  return async (user, fn, args) => {
    const { data, error } = await fake.client(USERS[user]).rpc(fn, args);
    return error ? { data: null, code: cloudErrorCode(error), detail: staleVersionOf(error), message: error.message } : { data, code: '' };
  };
}

describe('database save rules (test cloud; the same scenarios run against the SQL)', () => {
  const fixtures = saveFixtures();
  for (const scenario of saveScenarios(fixtures)) {
    it(scenario.name, async () => {
      assert.deepEqual(await runSaveScenario(scenario, fakeCaller(createFakeCloud())), []);
    });
  }
});

describe('the app save path', () => {
  it('current builds use the version-aware save and declare their engine level', async () => {
    const fake = createFakeCloud();
    const calls = [];
    const client = fake.client(OPERATOR);
    const spy = { rpc: (fn, args) => { calls.push([fn, args.p_engine]); return client.rpc(fn, args); } };
    const api = createShowdownCloud({ operator: spy, publicClient: fake.client(null) });
    const res = await api.save(startV3(8, { seed: 81 }).s, 0);
    assert.equal(res.error, null);
    assert.deepEqual(calls, [['cash_climb_showdown_save_v2', SHOWDOWN_ENGINE_LEVEL]]);
  });

  it('before the migration is applied, V1 and V2 still save through the original function; V3 never does', async () => {
    const fake = createFakeCloud({ migrated: false });
    const api = apiFor(fake);
    for (const v of [1, 2]) {
      const s = { ...startedEvent(8, { seed: 82 + v, payoutVersion: v }).s, id: `pre-migration-v${v}` };
      assert.equal((await api.save(s, 0)).error, null, `V${v}`);
    }
    const v3 = startV3(8, { seed: 85 }).s;
    const res = await api.save(v3, 0);
    assert.equal(res.code, 'unavailable');
    assert.equal(fake.events.has(v3.id), false, 'the unprotected save never receives a V3 event');
  });

  it('a V3 event made by an earlier build is saved with the V3 engine level declared', async () => {
    const old = { ...createV3(8, {}, v3Op(86)), minEngine: 1 };
    assert.equal(withDeclaredEngine(old).minEngine, 2);
    assert.equal(withDeclaredEngine(startedEvent(8, { seed: 87 }).s).minEngine, 1);
    const fake = createFakeCloud();
    assert.equal((await apiFor(fake).save(old, 0)).error, null);
    assert.equal(fake.events.get(old.id).payload.minEngine, 2);
  });

  it('a refused save is shown as an error and is not retried', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const { s: v3 } = startV3(8, { seed: 88 });
    await api.save(v3, 0);
    const { sync, timers } = syncFor(api);
    const tampered = { ...v3, payoutPlan: { ...v3.payoutPlan, poolCents: 1 } };
    saveSyncMeta(v3.id, { version: 1 });
    const status = await sync.queue(tampered);
    assert.equal(status.status, 'error');
    assert.equal(status.message, cloudMessage('plan-locked'));
    assert.equal(timers.length, 0, 'no retry is scheduled');
    assert.equal(fake.events.get(v3.id).payload.payoutPlan.poolCents, v3.payoutPlan.poolCents, 'the cloud copy is unchanged');
  });
});

describe('V3 phone scores through the database rules', () => {
  async function onTable({ games = 8, phase = 'qualifying', seed = 90 } = {}) {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    let { s, op } = startV3(8, { seed, games });
    let m;
    if (phase === 'qualifying') [s, m] = startNext(s, op, 'qualifying');
    else {
      const { toPlayoffsV3 } = await import('../v3/showdownV3WorkflowKit.js');
      ({ s, op } = toPlayoffsV3(8, { seed, games }));
      [s, m] = startNext(s, op, 'playoff');
    }
    await api.save(s, 0);
    const submit = (a, b) => api.submit({ eventId: s.id, matchId: m.id, p1: m.p1, p2: m.p2, score1: a, score2: b });
    return { fake, api, s, m, submit };
  }

  it('qualifying: scores must add up to the locked game count; ties are allowed', async () => {
    const { submit } = await onTable();
    assert.equal((await submit(5, 2)).code, 'invalid-games');
    assert.equal((await submit(8, 8)).code, 'invalid-games');
    assert.equal((await submit(-1, 9)).code, 'invalid-games');
    const tie = await submit(4, 4);
    assert.equal(tie.error, null);
    assert.equal((await submit(5, 3)).code, 'duplicate');
  });

  it('two phones at the same instant: the unique-index refusal reads as "already waiting", not a generic error', () => {
    const raw = { code: '23505', message: 'duplicate key value violates unique constraint "cash_climb_showdown_pending_one_open"' };
    assert.equal(cloudErrorCode(raw), 'duplicate');
    assert.equal(cloudErrorCode({ message: raw.message }), 'duplicate');
  });

  it('playoffs: scores are races to the locked length', async () => {
    const { submit } = await onTable({ phase: 'playoff', games: 7 });
    assert.equal((await submit(5, 5)).code, 'invalid-score');
    assert.equal((await submit(6, 2)).code, 'invalid-score');
    assert.equal((await submit(4, 4)).code, 'invalid-score');
    assert.equal((await submit(5, 3)).error, null);
  });

  it('missing settings and unknown formats are refused', async () => {
    const { fake, s, m, api } = await onTable();
    const row = fake.events.get(s.id);
    row.payload = { ...row.payload, payoutPlan: { ...row.payload.payoutPlan, qualifyingGames: undefined } };
    const args = { eventId: s.id, matchId: m.id, p1: m.p1, p2: m.p2, score1: 4, score2: 4 };
    assert.equal((await api.submit(args)).code, 'invalid-settings');
    row.payload = { ...row.payload, payoutVersion: 7 };
    assert.equal((await api.submit(args)).code, 'unsupported-format');
  });

  it('the phone shows the V3 rule in plain words', async () => {
    const { s, m, api } = await onTable();
    const res = await sendPhoneScore(api, s, m, 5, 2);
    assert.match(res.error, /8 games, all played.*tie is allowed/);
  });

  it('V1 and V2 phone scores keep their race rules', async () => {
    for (const v of [1, 2]) {
      const fake = createFakeCloud();
      const api = apiFor(fake);
      const { s, op } = startedEvent(8, { seed: 95 + v, payoutVersion: v });
      const m = s.matches.find((x) => x.phase === 'qualifying');
      const on = E.startOnTable(s, m.id, 1, op());
      await api.save(on, 0);
      const submit = (a, b) => api.submit({ eventId: on.id, matchId: m.id, p1: m.p1, p2: m.p2, score1: a, score2: b });
      assert.equal((await submit(3, 3)).code, 'invalid-score', `V${v}`);
      assert.equal((await submit(2, 1)).code, 'invalid-score', `V${v}`);
      assert.equal((await submit(3, 1)).error, null, `V${v}`);
    }
  });
});
