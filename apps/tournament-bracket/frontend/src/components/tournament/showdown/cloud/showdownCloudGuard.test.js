import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { startedEvent } from '../showdownTestKit.js';
import { startV3, startNext } from '../v3/showdownV3WorkflowKit.js';
import { createGuardedCloud, DEV_ISOLATION_REQUIRED } from './showdownCloudGuard.js';
import { createIsolatedCloud, clearIsolatedCloud, ISOLATED_CLOUD_KEY } from './showdownIsolatedCloud.js';
import { createShowdownCloud, cloudMessage } from './showdownCloudApi.js';
import { publicShowdown } from './showdownPublicState.js';
import { freshStorage, syncFor } from './showdownCloudTestKit.js';
import { v3PreviewOn, v3PreviewAvailable, V3_PREVIEW_FLAG } from '../operator/v3/showdownV3Preview.js';

const METHODS = ['save', 'load', 'list', 'remove', 'pending', 'decide', 'publicList', 'publicGet', 'publicPending', 'submit', 'submissionStatus'];

/** A live cloud that records every call; `reply(method, args)` decides the answer. */
function spyLive(reply = () => ({ data: null, error: null, code: '' })) {
  const calls = [];
  const api = Object.fromEntries(METHODS.map((m) => [m, async (...args) => { calls.push(m); return reply(m, args); }]));
  return { api, calls };
}

const v3Event = () => startV3(8).s;
const v1Event = () => startedEvent(8).s;
const DEV = { DEV: true, PROD: false };
const PROD = { DEV: false, PROD: true };

function guarded({ live, env, flag, isolated = () => createIsolatedCloud() }) {
  if (flag) localStorage.setItem(V3_PREVIEW_FLAG, 'on');
  return createGuardedCloud({ live, isolated, isolationOn: () => v3PreviewOn(env), devBuild: () => v3PreviewAvailable(env) });
}

async function callEvery(cloud, s) {
  const m = s.matches[0];
  await cloud.save(s, 0);
  await cloud.load(s.id);
  await cloud.list();
  await cloud.publicList();
  await cloud.publicGet(s.id);
  await cloud.publicPending(s.id);
  await cloud.submit({ eventId: s.id, matchId: m.id, p1: m.p1, p2: m.p2, score1: 4, score2: 3 });
  await cloud.submissionStatus('x');
  await cloud.pending(s.id);
  await cloud.decide('x', 'rejected');
  await cloud.remove(s.id);
}

beforeEach(() => freshStorage());

describe('development isolation: the isolated test cloud', () => {
  it('development build with the preview flag: no call of any kind reaches the live cloud, for V3 or V1', async () => {
    const { api, calls } = spyLive();
    const cloud = guarded({ live: api, env: DEV, flag: true });
    assert.equal(cloud.isIsolated(), true);
    await callEvery(cloud, v3Event());
    await callEvery(cloud, v1Event());
    assert.deepEqual(calls, []);
    assert.ok(localStorage.getItem(ISOLATED_CLOUD_KEY), 'the isolated store was used');
  });

  it('a failing isolated call is reported as it is and never retried against the live cloud', async () => {
    const { api, calls } = spyLive();
    const broken = createShowdownCloud({ operator: { rpc: async () => { throw new TypeError('Failed to fetch'); } }, publicClient: null });
    const cloud = guarded({ live: api, env: DEV, flag: true, isolated: () => broken });
    const s = v3Event();
    assert.equal((await cloud.save(s, 0)).code, 'network');
    assert.equal((await cloud.publicGet(s.id)).code, 'unavailable');
    assert.deepEqual(calls, []);
  });

  it('the flag does nothing in a production build: every call goes to the live cloud', async () => {
    const { api, calls } = spyLive();
    const cloud = guarded({ live: api, env: PROD, flag: true });
    assert.equal(cloud.isIsolated(), false);
    await cloud.save(v3Event(), 0);
    await cloud.publicGet('e1');
    assert.deepEqual(calls, ['save', 'publicGet']);
    assert.equal(localStorage.getItem(ISOLATED_CLOUD_KEY), null);
  });
});

describe('development isolation: preview flag off', () => {
  it('a V3 save is refused before the live cloud; a V1 save goes through as before', async () => {
    const { api, calls } = spyLive();
    const cloud = guarded({ live: api, env: DEV, flag: false });
    const res = await cloud.save(v3Event(), 0);
    assert.equal(res.code, DEV_ISOLATION_REQUIRED);
    assert.deepEqual(calls, []);
    assert.equal((await cloud.save(v1Event(), 0)).code, '');
    assert.deepEqual(calls, ['save']);
  });

  it('phone scores, pending lists and deletes for a V3 event read from the live cloud are refused', async () => {
    const s = v3Event();
    const { api, calls } = spyLive((m) => (m === 'publicGet' ? { data: { event: publicShowdown(s) }, error: null, code: '' } : { data: null, error: null, code: '' }));
    const cloud = guarded({ live: api, env: DEV, flag: false });
    await cloud.publicGet(s.id);
    const m = s.matches[0];
    assert.equal((await cloud.submit({ eventId: s.id, matchId: m.id, p1: m.p1, p2: m.p2, score1: 4, score2: 3 })).code, DEV_ISOLATION_REQUIRED);
    assert.equal((await cloud.pending(s.id)).code, DEV_ISOLATION_REQUIRED);
    assert.equal((await cloud.remove(s.id)).code, DEV_ISOLATION_REQUIRED);
    assert.deepEqual(calls, ['publicGet']);
  });

  it('the sync shows "saved on this tablet only" with the reason and does not keep retrying', async () => {
    const { api } = spyLive();
    const cloud = guarded({ live: api, env: DEV, flag: false });
    const { sync, timers } = syncFor(cloud);
    const s = v3Event();
    const status = await sync.queue(s);
    assert.equal(status.status, 'local-only');
    assert.equal(status.message, cloudMessage(DEV_ISOLATION_REQUIRED));
    assert.match(status.message, /never sent to the live database/);
    assert.equal(timers.length, 0);
  });

  it('a production build passes V3 writes to the live cloud unchanged (the database decides)', async () => {
    const { api, calls } = spyLive();
    const cloud = guarded({ live: api, env: PROD, flag: false });
    await cloud.save(v3Event(), 0);
    assert.deepEqual(calls, ['save']);
  });
});

describe('isolated test cloud: shared by every tab of the browser', () => {
  it('an event saved by the operator tab is read by a player tab, with versioned saves and stale-save conflicts', async () => {
    const operatorTab = createIsolatedCloud();
    const playerTab = createIsolatedCloud();
    const op = startV3(8);
    let s = op.s;
    let m;
    [s, m] = startNext(s, op.op, 'qualifying');
    assert.equal((await operatorTab.save(s, 0)).data.version, 1);
    const pub = (await playerTab.publicGet(s.id)).data;
    assert.equal(pub.event.payoutVersion, 3);
    assert.equal(pub.event.matches.find((x) => x.id === m.id).status, 'on-table');
    assert.equal((await operatorTab.save(s, 0)).data.replayed, true, 'the same save again is a retry, not a conflict');
    assert.equal((await operatorTab.save({ ...s, name: 'Other tablet' }, 0)).code, 'stale-version', 'a different save from the same version is a conflict');
    assert.equal((await operatorTab.list()).data.length, 1);
  });

  it('reads running at the same time as a save never write back an older copy', async () => {
    const operatorTab = createIsolatedCloud();
    const poller = createIsolatedCloud();
    const { s } = startV3(8);
    const [saved] = await Promise.all([operatorTab.save(s, 0), poller.list(), poller.load(s.id), operatorTab.pending(s.id), poller.publicGet(s.id)]);
    assert.equal(saved.data.version, 1);
    assert.equal((await poller.load(s.id)).data.version, 1, 'the save survived the overlapping reads');  });

  it('V3 phone scores follow the locked plan: ties accepted, wrong totals refused, duplicates refused', async () => {
    const operatorTab = createIsolatedCloud();
    const phone = createIsolatedCloud();
    const run = startV3(8, { games: 6 });
    let s = run.s;
    let m;
    [s, m] = startNext(s, run.op, 'qualifying');
    await operatorTab.save(s, 0);
    const sub = (a, b) => phone.submit({ eventId: s.id, matchId: m.id, p1: m.p1, p2: m.p2, score1: a, score2: b });
    assert.equal((await sub(4, 3)).code, 'invalid-games');
    assert.equal((await sub(3, 3)).data.status, 'pending');
    assert.equal((await sub(3, 3)).code, 'duplicate');
    const rows = (await operatorTab.pending(s.id)).data;
    assert.deepEqual(rows.map((r) => [r.score1, r.score2]), [[3, 3]]);
    assert.match(rows[0].id, /^isolated-/);
    const approved = E.approvePhoneResult(s, { id: rows[0].id, matchId: m.id, p1: m.p1, p2: m.p2, score1: 3, score2: 3 }, run.op());
    const done = approved.matches.find((x) => x.id === m.id);
    assert.deepEqual([done.status, done.score1, done.score2, done.winnerId ?? null], ['completed', 3, 3, null]);
  });

  it('clearing the isolated cloud removes every test event and phone score', async () => {
    const tab = createIsolatedCloud();
    await tab.save(v3Event(), 0);
    clearIsolatedCloud();
    assert.deepEqual((await tab.list()).data, []);
  });
});
