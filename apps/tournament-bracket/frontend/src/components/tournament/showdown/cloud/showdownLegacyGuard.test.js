import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startedEvent } from '../showdownTestKit.js';
import { startV3 } from '../v3/showdownV3WorkflowKit.js';
import { createFakeCloud, OPERATOR, GUEST_OPERATOR, ADMIN, PLAYER } from './showdownFakeCloud.js';
import { cloudErrorCode, staleVersionOf, createShowdownCloud } from './showdownCloudApi.js';
import { SHOWDOWN_ENGINE_LEVEL } from '../showdownRules.js';
import { freshStorage, apiFor } from './showdownCloudTestKit.js';
import { saveFixtures, saveScenarios, runSaveScenario } from './showdownSaveScenarios.js';
import { mutationScenarios } from './showdownMutationScenarios.js';

beforeEach(() => freshStorage());

const USERS = { operator: OPERATOR, guest: GUEST_OPERATOR, admin: ADMIN, player: PLAYER, anon: null };

function ctxFor(fake) {
  return {
    async call(user, fn, args) {
      const { data, error } = await fake.client(USERS[user]).rpc(fn, args);
      return error ? { data: null, code: cloudErrorCode(error), detail: staleVersionOf(error), message: error.message } : { data, code: '' };
    },
    async tamper(id, patch) {
      const row = fake.events.get(id);
      row.payload = { ...row.payload, ...patch };
    },
  };
}

describe('test cloud without the V2 guard (the database as it is today)', () => {
  for (const scenario of saveScenarios(saveFixtures(), { guarded: false })) {
    it(scenario.name, async () => {
      assert.deepEqual(await runSaveScenario(scenario, ctxFor(createFakeCloud({ guarded: false })).call), []);
    });
  }
});

describe('test cloud with the V2 guard: deletes and phone-score decisions (same scenarios as the SQL)', () => {
  for (const scenario of mutationScenarios()) {
    it(scenario.name, async () => {
      assert.deepEqual(await scenario.run(ctxFor(createFakeCloud())), []);
    });
  }
});

describe('the app delete and decision path', () => {
  function spied(fake) {
    const calls = [];
    const client = fake.client(OPERATOR);
    const spy = { rpc: (fn, args) => { calls.push([fn, args.p_engine]); return client.rpc(fn, args); } };
    return { calls, api: createShowdownCloud({ operator: spy, publicClient: fake.client(null) }) };
  }

  it('current builds delete and decide through the version-aware functions with their engine level', async () => {
    const fake = createFakeCloud();
    const { s } = startedEvent(8, { seed: 410, payoutVersion: 2 });
    await apiFor(fake).save(s, 0);
    const { calls, api } = spied(fake);
    assert.equal((await api.decide('00000000-0000-4000-8000-0000000000ff', 'rejected')).code, 'submission-not-found');
    assert.equal((await api.remove(s.id)).error, null);
    assert.equal(fake.events.has(s.id), false);
    assert.deepEqual(calls, [['cash_climb_showdown_decide_v2', SHOWDOWN_ENGINE_LEVEL], ['cash_climb_showdown_delete_v2', SHOWDOWN_ENGINE_LEVEL]]);
  });

  it('before the guard is installed, they fall back to the original functions', async () => {
    const fake = createFakeCloud({ guarded: false });
    const { s } = startV3(8, { seed: 411 });
    await apiFor(fake).save(s, 0);
    const { calls, api } = spied(fake);
    assert.equal((await api.remove(s.id)).error, null);
    assert.deepEqual(calls.map(([fn]) => fn), ['cash_climb_showdown_delete_v2', 'cash_climb_showdown_delete']);
  });

  it('a refusal from the version-aware function is reported, never retried through the original one', async () => {
    const fake = createFakeCloud();
    const { s } = startedEvent(8, { seed: 412, payoutVersion: 2 });
    await apiFor(fake).save(s, 0);
    fake.events.get(s.id).payload.payoutVersion = 7;
    const { calls, api } = spied(fake);
    assert.equal((await api.remove(s.id)).code, 'update-required');
    assert.deepEqual(calls.map(([fn]) => fn), ['cash_climb_showdown_delete_v2']);
    assert.equal(fake.events.has(s.id), true);
  });
});
