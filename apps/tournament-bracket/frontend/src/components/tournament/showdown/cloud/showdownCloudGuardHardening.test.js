import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { startedEvent } from '../showdownTestKit.js';
import { startV3 } from '../v3/showdownV3WorkflowKit.js';
import { createGuardedCloud, DEV_ISOLATION_REQUIRED } from './showdownCloudGuard.js';
import { createIsolatedCloud, ISOLATED_CLOUD_KEY } from './showdownIsolatedCloud.js';
import { DEV_LIVE_WRITE_NOTE } from './showdownCloudApi.js';
import { publicShowdown } from './showdownPublicState.js';
import { loadSyncMeta, saveSyncMeta, savedToIsolatedCloud, SHOWDOWN_SYNC_KEY, ISOLATED_SUFFIX } from './showdownSyncStore.js';
import { freshStorage } from './showdownCloudTestKit.js';
import { v3PreviewOn, v3PreviewAvailable, V3_PREVIEW_FLAG } from '../operator/v3/showdownV3Preview.js';
import { render } from '../operator/showdownRenderKit.js';

const METHODS = ['save', 'load', 'list', 'remove', 'pending', 'decide', 'publicList', 'publicGet', 'publicPending', 'submit', 'submissionStatus'];
const ok = (data = null) => ({ data, error: null, code: '' });

function spyLive(reply = () => ok()) {
  const calls = [];
  const api = Object.fromEntries(METHODS.map((m) => [m, async (...args) => { calls.push(m); return reply(m, args); }]));
  return { api, calls };
}

const DEV = { DEV: true, PROD: false };
const PROD = { DEV: false, PROD: true };

function guarded({ live, env, flag = false }) {
  if (flag) localStorage.setItem(V3_PREVIEW_FLAG, 'on');
  return createGuardedCloud({
    live, isolated: () => createIsolatedCloud(), isolationOn: () => v3PreviewOn(env), devBuild: () => v3PreviewAvailable(env),
    isolatedOrigin: savedToIsolatedCloud,
  });
}

const markIsolated = (id) => localStorage.setItem(SHOWDOWN_SYNC_KEY + ISOLATED_SUFFIX, JSON.stringify({ [id]: { version: 2, dirty: false } }));

beforeEach(() => freshStorage());

describe('development isolation hardening: preview flag off', () => {
  it('an event this device tested with the isolated cloud is never saved or deleted live, even V1/V2', async () => {
    const s = startedEvent(8).s;
    markIsolated(s.id);
    const { api, calls } = spyLive();
    const cloud = guarded({ live: api, env: DEV });
    assert.equal((await cloud.save(s, 0)).code, DEV_ISOLATION_REQUIRED);
    assert.equal((await cloud.remove(s.id)).code, DEV_ISOLATION_REQUIRED);
    assert.equal((await cloud.pending(s.id)).code, DEV_ISOLATION_REQUIRED);
    assert.deepEqual(calls, []);
  });

  it('deleting an event this tab has not opened checks the live copy first; V3 or unknown is refused', async () => {
    const v3 = { ...startV3(8).s, id: 'live-v3' };
    const v1 = { ...startedEvent(8).s, id: 'live-v1' };
    const replies = { [v3.id]: ok({ payload: v3 }), [v1.id]: ok({ payload: v1 }), gone: ok(null), broken: { data: null, error: new Error('Failed to fetch'), code: 'network' } };
    const { api, calls } = spyLive((m, [id]) => (m === 'load' ? replies[id] : ok()));
    const cloud = guarded({ live: api, env: DEV });
    assert.equal((await cloud.remove(v3.id)).code, DEV_ISOLATION_REQUIRED);
    assert.equal((await cloud.remove('broken')).code, DEV_ISOLATION_REQUIRED);
    assert.deepEqual(calls, ['load', 'load'], 'nothing was deleted');
    assert.equal((await cloud.remove(v1.id)).code, '');
    assert.equal((await cloud.remove('gone')).code, '');
    assert.deepEqual(calls.slice(2), ['load', 'remove', 'load', 'remove']);
    assert.equal((await cloud.remove(v3.id)).code, DEV_ISOLATION_REQUIRED);
    assert.equal(calls.length, 6, 'a V3 id once seen is refused without another lookup');
  });

  it('a phone score for an event this tab has not read is checked through the public copy first', async () => {
    const s = startV3(8).s;
    const { api, calls } = spyLive((m) => (m === 'publicGet' ? ok({ event: publicShowdown(s) }) : ok()));
    const cloud = guarded({ live: api, env: DEV });
    const m = s.matches[0];
    assert.equal((await cloud.submit({ eventId: s.id, matchId: m.id, p1: m.p1, p2: m.p2, score1: 4, score2: 3 })).code, DEV_ISOLATION_REQUIRED);
    assert.deepEqual(calls, ['publicGet']);
  });

  it('says when V1/V2 saves are real live-database writes (development build, preview off only)', () => {
    assert.equal(guarded({ live: spyLive().api, env: DEV }).writesLive(), true);
    assert.equal(guarded({ live: spyLive().api, env: PROD }).writesLive(), false);
    assert.equal(guarded({ live: spyLive().api, env: DEV, flag: true }).writesLive(), false);
  });

  it('a production build is unchanged: no lookups, no refusals', async () => {
    const s = startedEvent(8).s;
    markIsolated(s.id);
    const { api, calls } = spyLive();
    const cloud = guarded({ live: api, env: PROD });
    await cloud.save(s, 0);
    await cloud.remove(s.id);
    assert.deepEqual(calls, ['save', 'remove']);
  });
});

describe('isolated test cloud bookkeeping and tabs', () => {
  it('isolated sync bookkeeping is kept apart from the live bookkeeping', () => {
    saveSyncMeta('live-1', { version: 3 });
    assert.equal(savedToIsolatedCloud('live-1'), false);
    markIsolated('iso-1');
    assert.equal(savedToIsolatedCloud('iso-1'), true);
    assert.deepEqual(loadSyncMeta('iso-1'), { version: 0, dirty: false, syncedAt: '' }, 'live mode does not see the isolated version');
  });

  it('a save in one tab keeps an event another tab stored in the meantime', async () => {
    const tab = createIsolatedCloud();
    const other = createIsolatedCloud();
    const a = startV3(8, { seed: 11 }).s;
    const b = { ...startV3(8, { seed: 12 }).s, id: 'other-tab-event' };
    await other.save(a, 0);
    const store = globalThis.localStorage;
    let injected = false;
    globalThis.localStorage = {
      ...store,
      getItem: (k) => {
        const value = store.getItem(k);
        if (k === ISOLATED_CLOUD_KEY && !injected) {
          injected = true;
          const data = JSON.parse(value);
          data.events.push({ ...data.events[0], id: b.id, payload: b });
          store.setItem(k, JSON.stringify(data));
        }
        return value;
      },
    };
    const cloud = createIsolatedCloud({ storage: globalThis.localStorage });
    assert.equal((await cloud.save({ ...a, name: 'Renamed' }, 1)).data.version, 2);
    globalThis.localStorage = store;
    const ids = JSON.parse(store.getItem(ISOLATED_CLOUD_KEY)).events.map((e) => e.id).sort();
    assert.deepEqual(ids, [a.id, b.id].sort(), 'the other tab\u2019s event survived');
    assert.equal((await tab.load(a.id)).data.payload.name, 'Renamed');
  });
});

describe('operator cloud bar: live-write notice', () => {
  const bar = (props) => render('ShowdownCloudBar.jsx', { eventId: 'e1', status: 'qualifying', sync: { status: 'saved' }, onRetry() {}, onReupload() {}, onOpenConflict() {}, ...props });
  it('shows the live-database notice only for V1/V2 in a development build with the preview off', async () => {
    assert.ok((await bar({ writesLive: true })).includes(DEV_LIVE_WRITE_NOTE));
    assert.ok(!(await bar({})).includes(DEV_LIVE_WRITE_NOTE), 'production');
    assert.ok(!(await bar({ writesLive: true, v3: true })).includes(DEV_LIVE_WRITE_NOTE), 'V3 never writes live in development');
    assert.ok(!(await bar({ writesLive: true, isolated: true })).includes(DEV_LIVE_WRITE_NOTE));
  });
});
