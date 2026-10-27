import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { sharedCloud, device } from './cashClimbV3SyncTestKit.js';
import { setupRecord, startedRecord, post, firstReady, playMatches, T2 } from './cashClimbV3CloudTestKit.js';
import { settleCashClimbV3Record } from '../app/cashClimbV3Play.js';
import { ledgerSummary } from '../cashClimbV3Ledger.js';
import { RETRY_MS } from './cashClimbV3Sync.js';

const cloudCopy = (cloud, id) => cloud.rows.get(id)?.payload;
const earned = (r) => ledgerSummary(r.event.ledger).earnedByPlayer;

describe('Cash Climb (V3) sync: upload, reopen and results', () => {
  it('uploads a new tournament, reopens it on a second device and follows its results', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const rec = setupRecord('s-1');
    a.tablet.save(rec);
    await a.sync.hydrate(rec);
    assert.equal(a.sync.status.state, 'synced');
    assert.equal(a.store.meta('s-1').revision, 1);
    assert.equal(a.store.meta('s-1').dirty, false);

    b.tablet.save(rec);
    await b.sync.hydrate(rec);
    assert.equal(b.sync.status.state, 'synced');

    const started = startedRecord('s-1', 8);
    await a.confirm(started);
    const played = post(started, firstReady(started));
    await a.confirm(played);
    assert.equal(cloud.rows.get('s-1').revision, 3);
    assert.equal(await b.sync.pull(), true);
    assert.deepEqual(b.tablet.load('s-1').record, played, 'the second device now has the posted result');
    assert.equal(b.store.meta('s-1').revision, 3);
  });

  it('marks the tournament local-only (never as backed up) when cloud saving is off', async () => {
    const cloud = sharedCloud();
    const off = { save: async () => ({ data: null, error: new Error('ccv3:cloud-disabled'), code: 'cloud-disabled' }), load: async () => ({ data: null, error: new Error('ccv3:cloud-disabled'), code: 'cloud-disabled' }) };
    const a = device(cloud, { api: off });
    const rec = setupRecord('s-2');
    await a.sync.hydrate(rec);
    assert.equal(a.sync.status.state, 'local-only');
    await a.confirm(startedRecord('s-2', 8));
    assert.equal(a.sync.status.state, 'local-only');
    assert.equal(a.store.meta('s-2').dirty, true, 'the change is still marked as not in the cloud');
    assert.equal(a.store.meta('s-2').revision, 0);
  });
});

describe('Cash Climb (V3) sync: offline and interrupted saves', () => {
  it('keeps playing offline, queues every result, and sends them when the connection returns', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    let rec = startedRecord('o-1', 8);
    await a.sync.hydrate(rec);
    a.net.offline = true;
    for (let i = 0; i < 3; i += 1) { rec = post(rec, firstReady(rec)); await a.confirm(rec); }
    assert.equal(a.sync.status.state, 'offline');
    assert.equal(a.store.meta('o-1').dirty, true);
    assert.equal(cloud.rows.get('o-1').revision, 1, 'nothing reached the cloud');
    assert.deepEqual(a.tablet.load('o-1').record, rec, 'every result is safe on the tablet');
    assert.deepEqual(a.timers.map((t) => t.ms), RETRY_MS.slice(0, a.timers.length), 'bounded backoff');
    await a.fireRetry();
    assert.equal(a.sync.status.state, 'offline', 'still offline: retried and waiting again');
    a.net.offline = false;
    await a.fireRetry();
    assert.equal(a.sync.status.state, 'synced');
    assert.deepEqual(cloudCopy(cloud, 'o-1'), rec);
    assert.equal(a.store.meta('o-1').dirty, false);
  });

  it('a save the cloud accepted but whose answer was lost is confirmed by the retry, not posted twice', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const started = startedRecord('o-2', 8);
    await a.sync.hydrate(started);
    const played = post(started, firstReady(started));
    a.net.loseNextAnswer = true;
    await a.confirm(played);
    assert.equal(a.sync.status.state, 'offline');
    assert.equal(cloud.rows.get('o-2').revision, 2, 'the cloud did accept it');
    assert.equal(a.store.meta('o-2').revision, 1, 'the tablet does not know yet');
    await a.fireRetry();
    assert.equal(a.sync.status.state, 'synced');
    assert.equal(a.store.meta('o-2').revision, 2);
    assert.equal(cloud.rows.get('o-2').revision, 2, 'no extra revision');
    const keys = cloudCopy(cloud, 'o-2').event.ledger.entries.map((e) => e.key);
    assert.equal(new Set(keys).size, keys.length, 'no duplicate ledger entries');
  });

  it('a lost answer followed by another result fast-forwards instead of conflicting', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const started = startedRecord('o-3', 8);
    await a.sync.hydrate(started);
    const one = post(started, firstReady(started));
    a.net.loseNextAnswer = true;
    await a.confirm(one);
    const two = post(one, firstReady(one));
    await a.confirm(two);
    assert.equal(a.sync.status.state, 'synced');
    assert.deepEqual(cloudCopy(cloud, 'o-3'), two);
    assert.equal(cloud.rows.get('o-3').revision, 3);
  });
});

describe('Cash Climb (V3) sync: reconciliation and conflicts', () => {
  it('fast-forwards a tablet that has every cloud result plus more', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const started = startedRecord('c-1', 8);
    await a.sync.hydrate(started);
    await b.sync.hydrate(started);
    const one = post(started, firstReady(started));
    await a.confirm(one);
    b.net.offline = true;
    const bTwo = post(one, firstReady(one));
    b.tablet.save(bTwo);
    b.store.saveMeta('c-1', { dirty: true });
    b.net.offline = false;
    await b.sync.hydrate(bTwo);
    assert.equal(b.sync.status.state, 'synced');
    assert.deepEqual(cloudCopy(cloud, 'c-1'), bTwo);
  });

  it('adopts a cloud copy that already contains everything on the tablet', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const started = startedRecord('c-2', 8);
    await a.sync.hydrate(started);
    await b.sync.hydrate(started);
    const more = playMatches(started, 3);
    await a.confirm(more);
    b.store.saveMeta('c-2', { dirty: true });
    await b.sync.hydrate(started);
    assert.equal(b.sync.status.state, 'synced');
    assert.deepEqual(b.tablet.load('c-2').record, more);
  });

  it('stops on divergent results, keeps both copies, and requires acknowledgment before using the cloud copy', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const started = startedRecord('c-3', 8);
    await a.sync.hydrate(started);
    await b.sync.hydrate(started);
    const id = firstReady(started);
    const aCopy = post(started, id, { winnerSlot: 0 });
    const bCopy = post(started, id, { winnerSlot: 1 });
    await a.confirm(aCopy);
    await b.confirm(bCopy);
    assert.equal(b.sync.status.state, 'conflict');
    const { differences } = b.sync.conflict;
    assert.deepEqual(differences.tabletOnly, [id]);
    assert.equal(differences.matches[0].side, 'different');
    assert.ok(differences.earnings.length > 0, 'the earnings difference is shown');
    assert.deepEqual(cloudCopy(cloud, 'c-3'), aCopy, 'the cloud was not overwritten');
    assert.deepEqual(b.tablet.load('c-3').record, bCopy, 'the tablet result was not discarded');

    await b.sync.retry();
    assert.equal(b.sync.status.state, 'conflict', 'sync stays stopped');
    assert.equal(b.sync.useCloud().ok, false, 'not without acknowledgment');
    assert.equal(b.sync.status.state, 'conflict');
    assert.equal(b.sync.useCloud({ acknowledged: true }).ok, true);
    assert.equal(b.sync.status.state, 'synced');
    assert.deepEqual(b.tablet.load('c-3').record, aCopy);
    const [kept] = b.store.conflicts();
    assert.equal(kept.source, 'tablet');
    assert.deepEqual(kept.record, bCopy, 'the tablet copy is archived');
    assert.deepEqual(kept.tabletOnlyMatches, [id]);
    assert.equal(kept.acknowledged, true);
  });

  it('an idle second tab never resends its older copy and follows the tab that posts', async () => {
    const cloud = sharedCloud();
    const tab1 = device(cloud);
    const tab2 = device(cloud, { storage: tab1.storage });
    const started = startedRecord('m-1', 8);
    tab1.tablet.save(started);
    await tab1.sync.hydrate(started);
    await tab2.sync.hydrate(started);
    const played = post(started, firstReady(started));
    await tab1.confirm(played);
    const calls = tab2.net.calls;
    await tab2.sync.retry();
    assert.equal(tab2.net.calls, calls, 'the idle tab sent nothing');
    assert.equal(tab2.sync.status.state, 'synced');
    assert.deepEqual(cloudCopy(cloud, 'm-1'), played);

    tab2.sync.observe(played);
    const next = post(played, firstReady(played));
    await tab2.confirm(next);
    assert.equal(tab2.sync.status.state, 'synced');
    assert.deepEqual(cloudCopy(cloud, 'm-1'), next, 'the second tab builds on the first tab\'s result');
  });

  it('a conflict resolved in one tab closes in the other tab of the same browser', async () => {
    const cloud = sharedCloud();
    const other = device(cloud);
    const tab1 = device(cloud);
    const tab2 = device(cloud, { storage: tab1.storage });
    const started = startedRecord('m-2', 8);
    await other.sync.hydrate(started);
    tab1.tablet.save(started);
    await tab1.sync.hydrate(started);
    await tab2.sync.hydrate(started);
    const id = firstReady(started);
    const otherCopy = post(started, id, { winnerSlot: 0 });
    const tabCopy = post(started, id, { winnerSlot: 1 });
    await other.confirm(otherCopy);
    await tab1.confirm(tabCopy);
    tab2.sync.observe(tabCopy);
    await tab2.sync.hydrate(tabCopy);
    assert.equal(tab1.sync.status.state, 'conflict');
    assert.equal(tab2.sync.status.state, 'conflict');

    assert.equal(tab1.sync.useCloud({ acknowledged: true }).ok, true);
    tab2.sync.observe(tab1.tablet.load('m-2').record);
    assert.equal(tab2.sync.status.state, 'synced');
    assert.equal(tab2.sync.conflict, null);
    assert.deepEqual(cloudCopy(cloud, 'm-2'), otherCopy, 'the cloud copy was never overwritten');
    assert.equal(tab1.store.conflicts().length, 1, 'the tablet copy stays archived once');
  });

  it('keeps describing the newest tablet copy while a conflict is open', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const started = startedRecord('c-4', 8);
    await a.sync.hydrate(started);
    await b.sync.hydrate(started);
    const ids = [firstReady(started)];
    await a.confirm(post(started, ids[0], { winnerSlot: 0 }));
    const bOne = post(started, ids[0], { winnerSlot: 1 });
    await b.confirm(bOne);
    const bTwo = post(bOne, firstReady(bOne));
    await b.confirm(bTwo);
    assert.equal(b.sync.status.state, 'conflict');
    assert.deepEqual(b.sync.conflict.tablet, bTwo);
    assert.equal(b.sync.conflict.differences.tabletOnly.length, 2);
  });

  it('lets two setup copies (no results anywhere) choose the tablet copy', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const rec = setupRecord('c-5');
    await a.sync.hydrate(rec);
    await b.sync.hydrate(rec);
    await a.confirm({ ...rec, name: 'Device A name' });
    const mine = { ...rec, name: 'Device B name' };
    await b.confirm(mine);
    assert.equal(b.sync.status.state, 'conflict');
    assert.equal(b.sync.conflict.differences.setupOnly, true);
    assert.equal(b.sync.conflict.differences.needsAcknowledgment, false);
    assert.equal((await b.sync.useTablet()).ok, true);
    assert.equal(cloudCopy(cloud, 'c-5').name, 'Device B name');
    assert.equal(b.store.conflicts()[0].record.name, 'Device A name', 'the replaced cloud copy is archived');
  });

  it('never adopts a cloud copy that fails validation', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const started = startedRecord('c-6', 8);
    a.tablet.save(started);
    await a.sync.hydrate(started);
    const row = cloud.rows.get('c-6');
    const tampered = JSON.parse(JSON.stringify(post(started, firstReady(started))));
    tampered.event.ledger.entries[0].cents += 500;
    cloud.rows.set('c-6', { ...row, revision: 2, payload: tampered });
    assert.equal(await a.sync.pull(), false);
    assert.equal(a.sync.status.code, 'cloud-invalid');
    assert.deepEqual(a.tablet.load('c-6').record, started, 'the tablet copy is unchanged');
  });

  it('does not lose earnings when a settled copy and a running copy meet', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const started = startedRecord('c-7', 8);
    await a.sync.hydrate(started);
    await b.sync.hydrate(started);
    const done = settleCashClimbV3Record(playMatches(started), { now: T2 }).record;
    await a.confirm(done);
    b.store.saveMeta('c-7', { dirty: true });
    const partial = playMatches(started, 2);
    await b.confirm(partial);
    assert.equal(b.sync.status.state, 'synced', 'the settled cloud copy contains the partial one');
    assert.deepEqual(b.tablet.load('c-7').record, done);
    Object.entries(earned(partial)).forEach(([p, cents]) => assert.ok(earned(done)[p] >= cents));
  });
});

describe('Cash Climb (V3) sync: deletion', () => {
  it('deletes an unstarted tournament from the cloud; another device sees it removed and cannot recreate it', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const rec = setupRecord('d-1');
    await a.sync.hydrate(rec);
    await b.sync.hydrate(rec);
    assert.equal((await a.sync.deleteFromCloud()).ok, true);
    await b.confirm({ ...rec, name: 'Edited after deletion' });
    assert.equal(b.sync.status.state, 'deleted');
    assert.equal(b.tablet.load('d-1').record.name, 'Edited after deletion', 'the tablet copy is kept');
    await b.sync.reupload();
    assert.equal(b.sync.status.state, 'deleted', 're-uploading a deleted tournament is refused');
    assert.ok(cloud.rows.get('d-1').deleted_at);
  });

  it('refuses deleting a started tournament from the cloud', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    await a.sync.hydrate(startedRecord('d-2', 8));
    const r = await a.sync.deleteFromCloud();
    assert.equal(r.ok, false);
    assert.equal(cloud.rows.get('d-2').deleted_at, null);
  });

  it('reports a cloud copy that disappeared and can send it again', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const rec = setupRecord('d-3');
    await a.sync.hydrate(rec);
    cloud.rows.delete('d-3');
    await a.sync.hydrate(rec);
    assert.equal(a.sync.status.state, 'missing');
    await a.sync.reupload();
    assert.equal(a.sync.status.state, 'synced');
    assert.equal(cloud.rows.get('d-3').revision, 1);
  });
});

describe('Cash Climb (V3) sync: refusals', () => {
  it('reports update-required and not-authorized without retrying or losing the tablet copy', async () => {
    const cloud = sharedCloud();
    const stranger = device(cloud, { user: { uid: 'u-x', email: 'x@example.com' } });
    const rec = setupRecord('r-1');
    stranger.tablet.save(rec);
    await stranger.sync.hydrate(rec);
    assert.equal(stranger.sync.status.state, 'error');
    assert.equal(stranger.sync.status.code, 'not-authorized');
    assert.equal(stranger.timers.length, 0, 'no pointless retries');
    assert.deepEqual(stranger.tablet.load('r-1').record, rec);
  });
});
