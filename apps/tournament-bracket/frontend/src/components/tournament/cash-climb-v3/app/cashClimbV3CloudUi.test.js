import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { render } from './cashClimbV3RenderKit.test-support.mjs';
import { cashClimbV3Store } from './cashClimbV3Store.js';
import { memoryStorage } from './cashClimbV3AppTestKit.js';
import { listCashClimbV3HubEvents } from './cashClimbV3Hub.js';
import { listCashClimbV3ForHub, removeCashClimbV3FromHub } from './cashClimbV3HubActions.js';
import { openCashClimbV3FromCloud } from './cashClimbV3CloudOpen.js';
import { canDeleteFromCloud, removalPrompt } from './cashClimbV3Removal.js';
import { hubEventDetailLine } from '../../tournamentHubEvents.js';
import { createCashClimbV3SyncStore } from '../cloud/cashClimbV3SyncStore.js';
import { createCashClimbV3CloudApi } from '../cloud/cashClimbV3CloudApi.js';
import { cashClimbV3SyncLabel, cashClimbV3HubSyncLabel } from '../cloud/cashClimbV3SyncLabels.js';
import { OPERATOR, device, sharedCloud } from '../cloud/cashClimbV3SyncTestKit.js';
import { firstReady, post, setupRecord, startedRecord } from '../cloud/cashClimbV3CloudTestKit.js';

const STATES = {
  'local-only': 'Saved on this tablet only',
  sending: 'Sending…',
  synced: 'Synced',
  offline: 'Offline \u2014 changes pending',
  conflict: 'Conflict',
  deleted: 'Removed in cloud',
  'update-required': 'Update required',
  error: 'Cloud error',
};

const tabletOf = () => {
  const storage = memoryStorage();
  return { storage, store: cashClimbV3Store(storage), syncStore: createCashClimbV3SyncStore({ storage }) };
};

describe('Cash Climb (V3) sync status wording', () => {
  it('uses the agreed label for every state, and never "Synced" while changes are unsent', () => {
    Object.entries(STATES).forEach(([state, label]) => assert.equal(cashClimbV3SyncLabel(state), label));
    assert.equal(cashClimbV3SyncLabel('nonsense'), 'Cloud error');
    assert.equal(cashClimbV3HubSyncLabel({ state: 'synced', dirty: true, revision: 2 }), 'Changes not sent yet');
    assert.equal(cashClimbV3HubSyncLabel({ state: 'sending', dirty: false, revision: 0 }), 'Saved on this tablet only');
  });

  it('renders each state in the banner with the action that helps', async () => {
    for (const [state, label] of Object.entries(STATES)) {
      const html = await render('./CashClimbV3SyncBanner.jsx', { status: { state, message: '' }, mode: 'live' });
      assert.ok(html.includes(label), `${state} label`);
    }
    assert.match(await render('./CashClimbV3SyncBanner.jsx', { status: { state: 'offline' } }), /Try again now/);
    assert.match(await render('./CashClimbV3SyncBanner.jsx', { status: { state: 'conflict' } }), /Review both copies/);
    assert.match(await render('./CashClimbV3SyncBanner.jsx', { status: { state: 'missing' } }), /Send this tablet/);
    assert.match(await render('./CashClimbV3SyncBanner.jsx', { status: { state: 'synced' }, mode: 'isolated' }), /Isolated test cloud/);
  });
});

describe('Cash Climb (V3) conflict dialog', () => {
  it('shows differing results and earnings, and needs acknowledgment before using the cloud copy', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const b = device(cloud);
    const started = startedRecord('ui-c', 8);
    await a.sync.hydrate(started);
    await b.sync.hydrate(started);
    const id = firstReady(started);
    await a.confirm(post(started, id, { winnerSlot: 0 }));
    await b.confirm(post(started, id, { winnerSlot: 1 }));
    const html = await render('./CashClimbV3ConflictDialog.jsx', { conflict: b.sync.conflict, onUseCloud: () => ({ ok: true }), onUseTablet: async () => ({ ok: true }), onClose: () => {} });
    assert.match(html, /Results that differ/);
    assert.match(html, /Earnings that differ/);
    assert.match(html, /may need to be entered again/);
    assert.match(html, /<button[^>]*disabled=""[^>]*>Use the cloud copy/, 'disabled until acknowledged');
    assert.ok(!html.includes('Use this tablet'), 'a started tournament cannot replace the cloud copy');
  });
});

describe('Cash Climb (V3) hub listing with the cloud', () => {
  it('lists cloud-only tournaments, prefers the tablet copy, and labels sync state', async () => {
    const t = tabletOf();
    const local = setupRecord('hub-local', 8);
    t.store.save(local);
    t.syncStore.saveMeta(local.id, { revision: 3, dirty: false, state: 'synced' });
    const rows = [
      { id: 'hub-local', name: 'Cloud name', status: 'setup', event_date: '', updated_at: 'x' },
      { id: 'hub-cloud', name: 'Elsewhere', status: 'in-progress', event_date: '2026-11-06', updated_at: '2026-11-06T20:00:00Z' },
    ];
    const items = listCashClimbV3HubEvents(t.store, { cloudRows: rows, syncStore: t.syncStore });
    assert.deepEqual(items.map((i) => [i.id, Boolean(i.cloudOnly), i.syncLabel]), [
      ['hub-local', false, 'Synced'],
      ['hub-cloud', true, 'In the cloud (not on this tablet)'],
    ]);
    assert.equal(items[0].name, local.name, 'the tablet copy is listed, not the cloud summary');
    assert.match(hubEventDetailLine(items[1]), /^Cash Climb • .* • In the cloud \(not on this tablet\)$/);

    const failing = { list: async () => ({ data: null, error: new Error('ccv3:network'), code: 'network' }) };
    const offline = await listCashClimbV3ForHub({ cloud: failing, store: t.store, syncStore: t.syncStore });
    assert.deepEqual(offline.map((i) => i.id), ['hub-local'], 'an unreachable cloud lists the tablet alone');
  });

  it('removes only the tablet copy and never deletes the cloud copy', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const record = setupRecord('hub-rm', 8);
    a.tablet.save(record);
    await a.sync.hydrate(record);
    const prompts = [];
    const removed = removeCashClimbV3FromHub({ id: record.id, name: record.name }, {
      store: a.tablet, syncStore: a.store, confirm: (m) => { prompts.push(m); return true; }, alert: () => {},
    });
    assert.equal(removed, true);
    assert.match(prompts[0], /cloud copy is kept/);
    assert.equal(a.tablet.load(record.id).status, 'missing');
    assert.equal(a.store.meta(record.id).revision, 0, 'sync bookkeeping forgotten');
    assert.ok(cloud.rows.get(record.id) && !cloud.rows.get(record.id).deleted_at, 'cloud copy untouched');

    const alerts = [];
    assert.equal(removeCashClimbV3FromHub({ id: record.id, name: record.name, cloudOnly: true }, {
      store: a.tablet, syncStore: a.store, confirm: () => true, alert: (m) => alerts.push(m),
    }), false);
    assert.match(alerts[0], /not on this tablet/);
  });
});

describe('Cash Climb (V3) opening a cloud-only tournament', () => {
  it('saves a cloud copy that restores exactly, with its revision', async () => {
    const cloud = sharedCloud();
    const a = device(cloud);
    const started = startedRecord('open-1', 8);
    await a.confirm(started);
    const t = tabletOf();
    const api = createCashClimbV3CloudApi({ client: cloud.client(OPERATOR) });
    assert.deepEqual(await openCashClimbV3FromCloud({ cloud: api, store: t.store, syncStore: t.syncStore, id: 'open-1' }), { status: 'ok' });
    assert.deepEqual(t.store.load('open-1').record, started);
    assert.equal(t.syncStore.meta('open-1').revision, a.store.meta('open-1').revision);
    assert.equal(t.syncStore.meta('open-1').state, 'synced');
  });

  it('never saves a cloud copy that fails validation, and reports missing or deleted copies', async () => {
    const t = tabletOf();
    const bad = startedRecord('open-bad', 8);
    const tampered = { ...bad, event: { ...bad.event, ledger: { ...bad.event.ledger, entries: [{ key: 'x', playerId: 'p1', cents: 999999, type: 'bogus' }] } } };
    const fake = (data) => ({ load: async () => ({ data, error: null, code: '' }) });
    const invalid = await openCashClimbV3FromCloud({ cloud: fake({ id: 'open-bad', revision: 2, deleted: false, payload: tampered }), store: t.store, syncStore: t.syncStore, id: 'open-bad' });
    assert.equal(invalid.status, 'invalid');
    assert.equal(t.store.load('open-bad').status, 'missing', 'nothing saved on the tablet');
    assert.equal(t.syncStore.meta('open-bad').revision, 0);
    assert.deepEqual(await openCashClimbV3FromCloud({ cloud: fake(null), store: t.store, syncStore: t.syncStore, id: 'none' }), { status: 'missing' });
    const deleted = await openCashClimbV3FromCloud({ cloud: fake({ id: 'gone', revision: 2, deleted: true, payload: null }), store: t.store, syncStore: t.syncStore, id: 'gone' });
    assert.equal(deleted.status, 'error');
  });
});

describe('Cash Climb (V3) removal wording', () => {
  const record = setupRecord('rm-1', 8);
  it('warns about unsent changes and says when nothing is in the cloud', () => {
    assert.match(removalPrompt(record, { revision: 0, state: 'local-only' }), /not saved in the cloud/);
    assert.match(removalPrompt(record, { revision: 2, state: 'synced', dirty: false }), /cloud copy is kept/);
    assert.match(removalPrompt(record, { revision: 2, state: 'offline', dirty: true }), /not received yet; they will be lost/);
  });
  it('offers cloud deletion only for unstarted tournaments the cloud has', () => {
    assert.equal(canDeleteFromCloud(record, { revision: 1, state: 'synced' }), true);
    assert.equal(canDeleteFromCloud(record, { revision: 0, state: 'local-only' }), false);
    assert.equal(canDeleteFromCloud(record, { revision: 1, state: 'deleted' }), false);
    assert.equal(canDeleteFromCloud(startedRecord('rm-2', 8), { revision: 1, state: 'synced' }), false);
  });
});
