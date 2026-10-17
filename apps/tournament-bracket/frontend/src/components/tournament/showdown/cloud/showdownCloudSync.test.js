import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { startedEvent, playOpen, randomRace, settleShootouts } from '../showdownTestKit.js';
import { createFakeCloud, OPERATOR, GUEST_OPERATOR, ADMIN, PLAYER } from './showdownFakeCloud.js';
import { freshStorage, apiFor, syncFor } from './showdownCloudTestKit.js';
import { loadSyncMeta, saveSyncMeta, listConflictCopies } from './showdownSyncStore.js';
import { reconcileCopies, sameEvent } from './showdownSync.js';
import { saveShowdown, loadShowdown } from '../operator/showdownStore.js';
import { publicCopyProblem } from './showdownPublicState.js';

beforeEach(() => freshStorage());

describe('cloud persistence', () => {
  it('creates, saves every phase, restores after a refresh and completes with the full record', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const { sync } = syncFor(api);
    let { s, op } = startedEvent(16, { seed: 4 });
    await sync.queue(s);
    assert.equal(fake.events.get(s.id).version, 1);
    s = playOpen(s, op, 'qualifying', randomRace(3));
    await sync.queue(s);
    s = settleShootouts(E.lockQualifying(s, op()), op);
    await sync.queue(s);
    s = E.confirmPlayoff(E.drawPlayoff(s, op()), op());
    await sync.queue(s);
    s = E.completeShowdown(playOpen(s, op, 'playoff', randomRace(5)), op());
    await sync.queue(s);
    assert.equal(sync.status.status, 'saved');
    assert.equal(loadSyncMeta(s.id).dirty, false);

    const row = fake.events.get(s.id);
    assert.equal(row.status, 'completed');
    assert.ok(sameEvent(row.payload, s), 'qualifying, shootouts, bracket, payout plan and audit all restored');
    assert.deepEqual(E.computeEarnings(row.payload), E.computeEarnings(s));
    assert.equal(row.payload.audit.length, s.audit.length);
    assert.equal(publicCopyProblem(row.publicPayload), '', 'public copy has no audit and no emails');

    // refresh: a new controller on the same tablet finds nothing to do
    const again = syncFor(api);
    await again.sync.hydrate(s);
    assert.equal(again.sync.status.status, 'saved');
    assert.equal(again.replaced.length, 0);
  });

  it('browser restart on a new tablet: opening from the cloud restores the complete event', async () => {
    const fake = createFakeCloud();
    const { sync } = syncFor(apiFor(fake));
    const { s, op } = startedEvent(8, { seed: 2 });
    const played = playOpen(s, op, 'qualifying', randomRace(3));
    await sync.queue(played);
    freshStorage();
    const res = await apiFor(fake).load(played.id);
    assert.ok(sameEvent(res.data.payload, played));
    assert.equal(res.data.version, 1);
  });

  it('moves a Phase 2 tablet-only event to the cloud without changing or deleting it', async () => {
    const fake = createFakeCloud();
    const { s } = startedEvent(8, { seed: 3 });
    saveShowdown(s);
    const { sync } = syncFor(apiFor(fake));
    await sync.hydrate(loadShowdown());
    assert.equal(fake.events.get(s.id).version, 1);
    assert.ok(sameEvent(loadShowdown(), s), 'tablet copy untouched');
    assert.deepEqual({ v: loadSyncMeta(s.id).version, d: loadSyncMeta(s.id).dirty }, { v: 1, d: false });
  });

  it('a failed save keeps the tablet copy, shows the failure, and retries until it lands', async () => {
    const fake = createFakeCloud();
    const { sync, timers, runTimers, statuses } = syncFor(apiFor(fake));
    const { s, op } = startedEvent(8, { seed: 5 });
    saveShowdown(s);
    fake.setOffline(true);
    await sync.queue(s);
    assert.equal(sync.status.status, 'offline');
    assert.match(sync.status.message, /safe on this tablet/);
    assert.equal(loadSyncMeta(s.id).dirty, true);
    assert.ok(loadShowdown(), 'nothing discarded');
    assert.equal(timers.length, 1);
    const next = E.startOnTable(s, E.suggestNextMatch(s.matches).id, 1, op());
    saveShowdown(next);
    await sync.queue(next);
    await runTimers();
    assert.equal(sync.status.status, 'offline', 'still offline');
    fake.setOffline(false);
    await runTimers();
    assert.equal(sync.status.status, 'saved');
    assert.ok(sameEvent(fake.events.get(s.id).payload, next), 'the newest change was saved');
    assert.ok(statuses.includes('saving'));
  });

  it('a manual retry works the same as the automatic one', async () => {
    const fake = createFakeCloud();
    const { sync } = syncFor(apiFor(fake));
    const { s } = startedEvent(8, { seed: 6 });
    fake.setOffline(true);
    await sync.queue(s);
    fake.setOffline(false);
    await sync.retry();
    assert.equal(sync.status.status, 'saved');
  });

  it('a stale save never overwrites a newer cloud copy: it opens a conflict and keeps both copies', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const a = syncFor(api);
    const { s, op } = startedEvent(8, { seed: 7 });
    await a.sync.queue(s);
    const fromOtherDevice = E.updateDetails(s, { venue: 'Other device' }, op());
    await api.save(fromOtherDevice, 1);
    const tabletChange = E.startOnTable(s, E.suggestNextMatch(s.matches).id, 1, op());
    await a.sync.queue(tabletChange);
    assert.equal(a.sync.status.status, 'conflict');
    assert.equal(fake.events.get(s.id).payload.venue, 'Other device', 'cloud copy was not overwritten');
    assert.equal(a.sync.conflict.cloud.version, 2);

    await a.sync.resolve('cloud');
    assert.equal(a.replaced.at(-1).venue, 'Other device');
    const kept = listConflictCopies();
    assert.ok(kept.some((k) => k.source === 'tablet' && sameEvent(k.state, tabletChange)), 'tablet copy kept');
    assert.deepEqual({ v: loadSyncMeta(s.id).version, d: loadSyncMeta(s.id).dirty }, { v: 2, d: false });
  });

  it('keeping the tablet copy after a conflict saves it on top of the newer version', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const a = syncFor(api);
    const { s, op } = startedEvent(8, { seed: 8 });
    await a.sync.queue(s);
    await api.save(E.updateDetails(s, { venue: 'Other' }, op()), 1);
    const mine = E.updateDetails(s, { venue: 'Mine' }, op());
    await a.sync.queue(mine);
    await a.sync.resolve('tablet');
    assert.equal(a.sync.status.status, 'saved');
    assert.equal(fake.events.get(s.id).payload.venue, 'Mine');
    assert.equal(fake.events.get(s.id).version, 3);
    assert.ok(listConflictCopies().some((k) => k.source === 'cloud' && k.state.venue === 'Other'), 'cloud copy kept');
  });

  it('on opening: newer cloud copy is loaded, unsent changes against a newer cloud copy become a conflict', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const { s, op } = startedEvent(8, { seed: 9 });
    await syncFor(api).sync.queue(s);
    await api.save(E.updateDetails(s, { venue: 'Newer' }, op()), 1);

    const clean = syncFor(api);
    await clean.sync.hydrate(s);
    assert.equal(clean.replaced.at(-1).venue, 'Newer');

    saveSyncMeta(s.id, { version: 1, dirty: true });
    const dirty = syncFor(api);
    await dirty.sync.hydrate(E.updateDetails(s, { venue: 'Unsent' }, op()));
    assert.equal(dirty.sync.status.status, 'conflict');
    assert.equal(dirty.replaced.length, 0);
  });

  it('reconcile rules', () => {
    const local = { id: 'x', a: 1 };
    assert.equal(reconcileCopies(local, { version: 0, dirty: true }, null).action, 'push');
    assert.equal(reconcileCopies(local, { version: 3, dirty: false }, null).action, 'missing');
    assert.equal(reconcileCopies(local, { version: 2, dirty: true }, { version: 2, payload: {} }).action, 'push');
    assert.equal(reconcileCopies(local, { version: 2, dirty: false }, { version: 2, payload: {} }).action, 'none');
    assert.equal(reconcileCopies(local, { version: 0, dirty: true }, { version: 4, payload: { a: 1, id: 'x' } }).action, 'adopt');
    assert.equal(reconcileCopies(local, { version: 0, dirty: true }, { version: 4, payload: { id: 'x', a: 2 } }).action, 'conflict');
  });

  it('a removed cloud copy is reported and re-created only when the operator asks', async () => {
    const fake = createFakeCloud();
    const api = apiFor(fake);
    const a = syncFor(api);
    const { s } = startedEvent(8, { seed: 10 });
    await a.sync.queue(s);
    await api.remove(s.id);
    const b = syncFor(api);
    await b.sync.hydrate(s);
    assert.equal(b.sync.status.status, 'missing');
    assert.equal(fake.events.has(s.id), false);
    await b.sync.reupload();
    assert.equal(fake.events.get(s.id).version, 1);
  });

  it('no database yet: the tablet keeps working and says it is saved on this tablet only', async () => {
    const api = apiFor({ client: () => ({ rpc: async () => ({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } }) }) });
    const { sync, timers } = syncFor(api);
    const { s } = startedEvent(8, { seed: 11 });
    await sync.queue(s);
    assert.equal(sync.status.status, 'local-only');
    assert.equal(timers.length, 0, 'no retry storm');
    assert.equal(loadSyncMeta(s.id).dirty, true);
  });
});

describe('cloud authorization', () => {
  it('only the operator who created an event (or an admin) can change it; players and the public cannot', async () => {
    const fake = createFakeCloud();
    const { s, op } = startedEvent(8, { seed: 12 });
    assert.equal((await apiFor(fake, OPERATOR).save(s, 0)).code, '');
    const changed = E.updateDetails(s, { venue: 'X' }, op());
    assert.equal((await apiFor(fake, PLAYER).save(changed, 1)).code, 'not-authorized');
    assert.equal((await apiFor(fake, null).save(changed, 1)).code, 'not-authorized');
    assert.equal((await apiFor(fake, GUEST_OPERATOR).save(changed, 1)).code, 'not-authorized', 'another operator cannot take over');
    assert.equal((await apiFor(fake, GUEST_OPERATOR).load(s.id)).code, 'not-authorized');
    assert.equal((await apiFor(fake, PLAYER).remove(s.id)).code, 'not-authorized');
    assert.equal((await apiFor(fake, ADMIN).save(changed, 1)).code, '', 'hub admin may correct');
    assert.equal(fake.events.get(s.id).version, 2);
    assert.deepEqual((await apiFor(fake, PLAYER).list()).data, []);
  });

  it('rejects payloads that are not Showdown events', async () => {
    const fake = createFakeCloud();
    const res = await apiFor(fake).save({ id: 'x', type: 'cash-climb', status: 'setup' }, 0);
    assert.equal(res.code, 'invalid-event');
  });
});
