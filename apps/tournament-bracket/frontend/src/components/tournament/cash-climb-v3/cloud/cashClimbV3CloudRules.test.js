import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createCashClimbV3FakeCloud } from './cashClimbV3FakeCloud.js';
import { createCashClimbV3CloudApi } from './cashClimbV3CloudApi.js';
import { saveScenarios, runSaveScenario } from './cashClimbV3SaveScenarios.js';
import { setupRecord, startedRecord, settledRecord } from './cashClimbV3CloudTestKit.js';

export const OPERATOR = { uid: 'u-op', email: 'sslampro@gmail.com' };
const OTHER = { uid: 'u-other', email: 'other-operator@example.com' };
const MANAGER = { uid: 'u-all', email: 'manager@example.com' };
const GUEST = { uid: 'u-guest', email: 'guest@guestmail.com' };
const ANONYMOUS = { uid: 'u-anon-session', email: '', anonymous: true };
const PLAYER = { uid: 'u-player', email: 'player@example.com' };

function cloudWith() {
  const fake = createCashClimbV3FakeCloud({
    operators: [{ uid: OPERATOR.uid }, { uid: OTHER.uid }, { uid: MANAGER.uid, canManageAll: true }, { uid: GUEST.uid }, { uid: ANONYMOUS.uid }],
  });
  const as = (user) => createCashClimbV3CloudApi({ client: fake.client(user) });
  return { fake, as };
}

describe('Cash Climb (V3) cloud save rules (fake cloud, same scenarios as the database)', () => {
  for (const scenario of saveScenarios) {
    it(scenario.name, async () => {
      const { as } = cloudWith();
      const api = as(OPERATOR);
      const save = async (payload, expected) => {
        const res = await api.save(payload, expected);
        return { code: res.code, revision: res.data?.revision, replayed: res.data?.replayed };
      };
      const { result, revision } = await runSaveScenario(scenario, 'scn', save);
      assert.equal(result.code, scenario.code);
      if (scenario.replayed) assert.equal(result.replayed, true);
      if (scenario.sameRevision) assert.equal(result.revision, revision);
    });
  }
});

describe('Cash Climb (V3) cloud permissions (fake cloud)', () => {
  it('lets a listed operator create, load and list their own tournament', async () => {
    const { as } = cloudWith();
    const saved = await as(OPERATOR).save(setupRecord('perm-1'), 0);
    assert.equal(saved.code, '');
    assert.equal(saved.data.revision, 1);
    assert.equal((await as(OPERATOR).load('perm-1')).data.payload.id, 'perm-1');
    assert.deepEqual((await as(OPERATOR).list()).data.map((r) => r.id), ['perm-1']);
    assert.equal((await as(OPERATOR).list()).data[0].payload, undefined, 'the list never carries payloads');
  });

  it('refuses the guest testing account and anonymous sessions even when listed as operators', async () => {
    const { as } = cloudWith();
    for (const user of [GUEST, ANONYMOUS, PLAYER, null]) {
      assert.equal((await as(user).save(setupRecord('perm-2'), 0)).code, 'not-authorized');
      assert.equal((await as(user).load('perm-2')).code, 'not-authorized');
      assert.equal((await as(user).list()).code, 'not-authorized');
      assert.equal((await as(user).remove('perm-2', 0)).code, 'not-authorized');
    }
  });

  it('keeps one operator out of another operator\u2019s tournament; a manage-all operator can manage it', async () => {
    const { as } = cloudWith();
    await as(OPERATOR).save(setupRecord('perm-3'), 0);
    assert.equal((await as(OTHER).load('perm-3')).code, 'not-authorized');
    assert.equal((await as(OTHER).save(setupRecord('perm-3'), 1)).code, 'not-authorized');
    assert.deepEqual((await as(OTHER).list()).data, []);
    assert.equal((await as(MANAGER).load('perm-3')).code, '');
    assert.equal((await as(MANAGER).save(startedRecord('perm-3', 8), 1)).data.revision, 2);
  });
});

describe('Cash Climb (V3) cloud deletion (fake cloud)', () => {
  it('soft-deletes only setup tournaments, and a deleted id cannot be saved again', async () => {
    const { as, fake } = cloudWith();
    const api = as(OPERATOR);
    await api.save(setupRecord('del-1'), 0);
    assert.equal((await api.remove('del-1', 0)).code, 'stale-revision');
    const gone = await api.remove('del-1', 1);
    assert.equal(gone.code, '');
    assert.equal(gone.data.deleted, true);
    assert.equal((await api.remove('del-1', 1)).data.replayed, true, 'deleting again is harmless');
    assert.ok(fake.rows.get('del-1').payload, 'the tombstone keeps the record in the database');
    const loaded = await api.load('del-1');
    assert.equal(loaded.data.deleted, true);
    assert.equal(loaded.data.payload, null);
    assert.deepEqual((await api.list()).data, []);
    assert.equal((await api.save(setupRecord('del-1'), 0)).code, 'deleted', 'another device cannot recreate it');
    assert.equal((await api.save(setupRecord('del-1'), 2)).code, 'deleted');
  });

  it('refuses deleting started and completed tournaments', async () => {
    const { as } = cloudWith();
    const api = as(OPERATOR);
    await api.save(startedRecord('del-2', 8), 0);
    assert.equal((await api.remove('del-2', 1)).code, 'not-deletable');
    await api.save(settledRecord('del-3', 8), 0);
    assert.equal((await api.remove('del-3', 1)).code, 'not-deletable');
    assert.equal((await api.remove('nope', 0)).code, 'missing');
  });
});

describe('Cash Climb (V3) client version gate (fake cloud)', () => {
  it('refuses saves from a build below level 1', async () => {
    const { fake } = cloudWith();
    const old = createCashClimbV3CloudApi({ client: fake.client(OPERATOR), level: 0 });
    assert.equal((await old.save(setupRecord('lvl-1'), 0)).code, 'update-required');
    assert.equal((await old.remove('lvl-1', 0)).code, 'update-required');
  });

  it('refuses writing over a stored record that needs a newer app', async () => {
    const { as, fake } = cloudWith();
    await as(OPERATOR).save(setupRecord('lvl-2'), 0);
    const row = fake.rows.get('lvl-2');
    fake.rows.set('lvl-2', { ...row, payload: { ...row.payload, schemaVersion: 2 } });
    assert.equal((await as(OPERATOR).save(setupRecord('lvl-2'), 1)).code, 'update-required');
    assert.equal((await as(OPERATOR).remove('lvl-2', 1)).code, 'update-required');
  });
});
