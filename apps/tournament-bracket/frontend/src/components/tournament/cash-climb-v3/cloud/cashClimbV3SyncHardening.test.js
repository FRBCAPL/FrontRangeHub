import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sharedCloud, device } from './cashClimbV3SyncTestKit.js';
import { startedRecord, setupRecord, post, firstReady } from './cashClimbV3CloudTestKit.js';
import { createCashClimbV3SyncStore } from './cashClimbV3SyncStore.js';
import { readyMatchIds } from '../cashClimbV3Progress.js';
import { postCashClimbV3Result } from '../app/cashClimbV3Play.js';
import { memoryStorage } from '../app/cashClimbV3AppTestKit.js';

const cloudCopy = (cloud, id) => cloud.rows.get(id)?.payload;
const ready = (r) => readyMatchIds(r.event);

/** Posts on the tablet the way the app does: check the cloud first, then save locally and queue. */
async function postFresh(dev, record, matchId, opts) {
  const check = await dev.sync.checkLatest();
  if (check.state !== 'current') return { check, record: dev.tablet.load(record.id).record };
  const next = post(record, matchId, opts);
  await dev.confirm(next);
  return { check, record: next };
}

describe('Cash Climb (V3) multi-tablet scoring', () => {
  it('two devices posting different matches without a fresh check: conflict, both results kept, nothing overwritten', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const s = startedRecord('h-1', 8);
    await a.sync.hydrate(s);
    await b.sync.hydrate(s);
    const [m1, m2] = ready(s);
    const aCopy = post(s, m1);
    const bCopy = post(s, m2);
    await a.confirm(aCopy);
    await b.confirm(bCopy);
    assert.equal(b.sync.status.state, 'conflict');
    assert.deepEqual(b.sync.conflict.differences.tabletOnly, [m2]);
    assert.deepEqual(cloudCopy(cloud, 'h-1'), aCopy, 'the cloud keeps device A');
    assert.deepEqual(b.tablet.load('h-1').record, bCopy, 'device B keeps its result');
  });

  it('with the fresh check, the second device reviews the newer copy and both results reach the cloud', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const s = startedRecord('h-2', 8);
    await a.sync.hydrate(s);
    await b.sync.hydrate(s);
    const [m1, m2] = ready(s);
    await postFresh(a, s, m1);
    const first = await postFresh(b, s, m2);
    assert.equal(first.check.state, 'refreshed', 'nothing posted against the stale copy');
    assert.deepEqual(first.record, cloudCopy(cloud, 'h-2'), 'the newer cloud copy is now on device B');
    const second = await postFresh(b, first.record, m2);
    assert.equal(second.check.state, 'current');
    assert.equal(b.sync.status.state, 'synced');
    const final = cloudCopy(cloud, 'h-2');
    assert.notEqual(final.event.matches[m1].status, 'open');
    assert.notEqual(final.event.matches[m2].status, 'open');
  });

  it('a match that became final on another device while the dialog was open is not posted again', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const s = startedRecord('h-3', 8);
    await a.sync.hydrate(s);
    await b.sync.hydrate(s);
    const m = firstReady(s);
    await a.confirm(post(s, m, { winnerSlot: 0 }));
    const { check, record } = await postFresh(b, s, m, { winnerSlot: 1 });
    assert.equal(check.state, 'refreshed');
    assert.notEqual(record.event.matches[m].status, 'open', 'the refreshed copy shows the posted result');
    const winner = record.event.matches[m].winner;
    const again = postCashClimbV3Result(record, m, { outcome: 'completed', winner, loserRacks: 2 });
    assert.equal(again.status, 'invalid', 'the engine refuses a second result for the match');
    assert.deepEqual(cloudCopy(cloud, 'h-3'), record, 'device A\u2019s result stands');
  });

  it('the fresh check never sends anything, and while a conflict is open it says so', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const s = startedRecord('h-4', 8);
    await a.sync.hydrate(s);
    await b.sync.hydrate(s);
    const m = firstReady(s);
    await a.confirm(post(s, m, { winnerSlot: 0 }));
    await b.confirm(post(s, m, { winnerSlot: 1 }));
    const rev = cloud.rows.get('h-4').revision;
    assert.equal((await b.sync.checkLatest()).state, 'conflict');
    assert.equal(cloud.rows.get('h-4').revision, rev);
  });

  it('offline or unanswered: the fresh check lets local-first scoring continue and the result waits to be sent', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    let s = startedRecord('h-5', 8);
    await a.sync.hydrate(s);
    a.net.offline = true;
    const offline = await postFresh(a, s, firstReady(s));
    assert.equal(offline.check.state, 'current');
    assert.equal(offline.check.offline, true);
    assert.equal(a.sync.status.state, 'offline');
    assert.equal(a.store.meta('h-5').dirty, true);
    s = offline.record;

    const offlineSave = async () => ({ data: null, error: new TypeError('Failed to fetch'), code: 'network' });
    const silent = { load: () => new Promise(() => {}), save: offlineSave, list: offlineSave, remove: offlineSave };
    const hanging = device(cloud, { api: silent });
    hanging.store.saveMeta('h-5', { revision: 1 });
    await hanging.confirm(s);
    const started = Date.now();
    const check = await hanging.sync.checkLatest({ timeoutMs: 30 });
    assert.equal(check.state, 'current');
    assert.ok(Date.now() - started < 2000, 'a silent connection does not block scoring');
  });
});

describe('Cash Climb (V3) pending changes across a reload', () => {
  it('sends results saved offline when the app opens again', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const s = startedRecord('h-6', 8);
    await a.sync.hydrate(s);
    a.net.offline = true;
    const played = post(s, firstReady(s));
    await a.confirm(played);
    const reopened = device(cloud, { storage: a.storage });
    await reopened.sync.hydrate(reopened.tablet.load('h-6').record);
    assert.equal(reopened.sync.status.state, 'synced');
    assert.deepEqual(cloudCopy(cloud, 'h-6'), played);
    assert.equal(reopened.store.meta('h-6').dirty, false);
  });

  it('keeps an offline result when the cloud moved on while the app was closed', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const other = device(cloud);
    const s = startedRecord('h-7', 8);
    await a.sync.hydrate(s);
    await other.sync.hydrate(s);
    a.net.offline = true;
    const [m1, m2] = ready(s);
    const mine = post(s, m1);
    await a.confirm(mine);
    const theirs = post(s, m2);
    await other.confirm(theirs);
    const reopened = device(cloud, { storage: a.storage });
    await reopened.sync.hydrate(reopened.tablet.load('h-7').record);
    assert.equal(reopened.sync.status.state, 'conflict');
    assert.deepEqual(reopened.tablet.load('h-7').record, mine, 'the offline result is still on the tablet');
    assert.deepEqual(cloudCopy(cloud, 'h-7'), theirs, 'the cloud is not overwritten');
  });
});

describe('Cash Climb (V3) first upload of tournaments saved before cloud saving', () => {
  const approval = { requireUploadApproval: () => true };

  it('does not upload an existing tablet-only tournament until the operator approves it', async () => {
    const cloud = sharedCloud();
    const a = device(cloud, approval);
    let s = startedRecord('h-8', 8);
    a.tablet.save(s);
    await a.sync.hydrate(s);
    assert.equal(a.sync.status.state, 'needs-approval');
    assert.equal(cloud.rows.has('h-8'), false, 'nothing was sent');
    s = post(s, firstReady(s));
    await a.confirm(s);
    assert.equal(a.sync.status.state, 'needs-approval', 'new results do not trigger an upload either');
    await a.sync.retry();
    assert.equal(cloud.rows.has('h-8'), false);
    assert.equal(a.store.meta('h-8').state, 'needs-approval', 'the hub can show it needs review');

    await a.sync.approveUpload();
    assert.equal(a.sync.status.state, 'synced');
    assert.deepEqual(cloudCopy(cloud, 'h-8'), s, 'sent exactly as saved: same id, same locked record');
    assert.equal(cloud.rows.get('h-8').revision, 1);
  });

  it('uploads a tournament created while the cloud is in use without a separate review', async () => {
    const cloud = sharedCloud();
    const a = device(cloud, approval);
    const s = setupRecord('h-9');
    a.store.saveMeta('h-9', { uploadApproved: true });
    a.tablet.save(s);
    await a.sync.hydrate(s);
    assert.equal(a.sync.status.state, 'synced');
    assert.equal(cloud.rows.get('h-9').revision, 1);
  });

  it('an approval given in the isolated test cloud never counts for the live cloud', () => {
    const storage = memoryStorage();
    let isolated = true;
    const store = createCashClimbV3SyncStore({ storage, isolated: () => isolated });
    store.saveMeta('h-10', { uploadApproved: true });
    isolated = false;
    assert.equal(store.meta('h-10').uploadApproved, false);
    assert.equal(store.meta('h-10').revision, 0);
  });

  it('a tournament the cloud already has needs no approval to keep syncing', async () => {
    const cloud = sharedCloud();
    const first = device(cloud);
    const s = startedRecord('h-11', 8);
    await first.sync.hydrate(s);
    const second = device(cloud, approval);
    second.tablet.save(s);
    await second.sync.hydrate(s);
    assert.equal(second.sync.status.state, 'synced');
    const next = post(s, firstReady(s));
    await second.confirm(next);
    assert.deepEqual(cloudCopy(cloud, 'h-11'), next);
  });
});

describe('Cash Climb (V3) repeated uploads and lost acknowledgments', () => {
  it('a first upload whose answer was lost, retried several times, creates one copy at revision 1', async () => {
    const cloud = sharedCloud();
    const a = device(cloud, { requireUploadApproval: () => true });
    const s = startedRecord('h-12', 8);
    a.tablet.save(s);
    await a.sync.hydrate(s);
    a.net.loseNextAnswer = true;
    await a.sync.approveUpload();
    assert.equal(a.sync.status.state, 'offline', 'the answer was lost');
    assert.equal(cloud.rows.get('h-12').revision, 1, 'but the cloud has it');
    await a.fireRetry();
    await a.sync.retry();
    await a.sync.approveUpload();
    assert.equal(a.sync.status.state, 'synced');
    assert.equal(cloud.rows.size, 1);
    assert.equal(cloud.rows.get('h-12').revision, 1, 'never saved twice');
    assert.deepEqual(cloudCopy(cloud, 'h-12'), s);
  });

  it('a result whose answer was lost and is retried repeatedly is posted once', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const s = startedRecord('h-13', 8);
    await a.sync.hydrate(s);
    const played = post(s, firstReady(s));
    a.net.loseNextAnswer = true;
    await a.confirm(played);
    for (let i = 0; i < 3; i += 1) await a.sync.retry();
    await a.fireRetry();
    assert.equal(a.sync.status.state, 'synced');
    assert.equal(cloud.rows.get('h-13').revision, 2);
    assert.deepEqual(cloudCopy(cloud, 'h-13'), played);
  });
});
