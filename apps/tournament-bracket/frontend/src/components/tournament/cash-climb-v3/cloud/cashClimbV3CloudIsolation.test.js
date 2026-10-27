import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCashClimbV3CloudRouter } from './cashClimbV3CloudGuard.js';
import { cashClimbV3DevBuild, cashClimbV3IsolationOn, cashClimbV3LocalHost, CASH_CLIMB_V3_ISOLATED_FLAG } from './cashClimbV3CloudMode.js';
import { createCashClimbV3IsolatedCloud, clearCashClimbV3IsolatedCloud, CASH_CLIMB_V3_ISOLATED_KEY, CASH_CLIMB_V3_ISOLATED_OFFLINE_FLAG } from './cashClimbV3IsolatedCloud.js';
import { setupRecord } from './cashClimbV3CloudTestKit.js';
import { memoryStorage } from '../app/cashClimbV3AppTestKit.js';

const here = dirname(fileURLToPath(import.meta.url));
const METHODS = ['save', 'load', 'list', 'remove'];

function spyApi(name, log) {
  return Object.fromEntries(METHODS.map((m) => [m, async () => { log.push(`${name}.${m}`); return { data: null, error: new TypeError('Failed to fetch'), code: 'network' }; }]));
}

function router({ dev, isolation, enabled, local = false, localHost }) {
  const log = [];
  const r = createCashClimbV3CloudRouter({
    live: () => { log.push('live-created'); return spyApi('live', log); },
    isolated: () => { log.push('isolated-created'); return spyApi('isolated', log); },
    devBuild: () => dev, isolationOn: () => isolation, liveEnabled: () => enabled,
    ...(localHost === undefined ? { localHost: () => local } : localHost === null ? {} : { localHost }),
  });
  return { r, log };
}

const at = (url) => { const u = new URL(url); return { protocol: u.protocol, hostname: u.hostname }; };

const callAll = async (r) => Promise.all([r.save(setupRecord('iso'), 0), r.load('iso'), r.list(), r.remove('iso', 1)]);

describe('Cash Climb (V3) cloud isolation: development can never reach the live cloud', () => {
  for (const enabled of [false, true]) {
    it(`development, isolation off (live saving ${enabled ? 'on' : 'off'}): every call is refused and the live cloud is never created`, async () => {
      const { r, log } = router({ dev: true, isolation: false, enabled });
      const results = await callAll(r);
      results.forEach((res) => assert.equal(res.code, 'dev-isolation-required'));
      assert.deepEqual(log, []);
      assert.equal(r.mode(), 'dev-blocked');
    });

    it(`development, isolation on (live saving ${enabled ? 'on' : 'off'}): every call goes to the isolated cloud, failures are not retried live`, async () => {
      const { r, log } = router({ dev: true, isolation: true, enabled });
      const results = await callAll(r);
      results.forEach((res) => assert.equal(res.code, 'network'));
      assert.ok(log.every((l) => l.startsWith('isolated')), log.join(', '));
      assert.ok(!log.includes('live-created'));
    });
  }

  it('production with live saving off: refused as cloud-disabled, the live cloud is never created', async () => {
    const { r, log } = router({ dev: false, isolation: true, enabled: false });
    (await callAll(r)).forEach((res) => assert.equal(res.code, 'cloud-disabled'));
    assert.deepEqual(log, []);
  });

  it('production with live saving on: calls go to the live cloud only', async () => {
    const { r, log } = router({ dev: false, isolation: true, enabled: true });
    await callAll(r);
    assert.ok(log.every((l) => l.startsWith('live')), log.join(', '));
  });

  it('production build on this computer or a private network: refused even with live saving on', async () => {
    const { r, log } = router({ dev: false, isolation: true, enabled: true, local: true });
    (await callAll(r)).forEach((res) => assert.equal(res.code, 'local-host-blocked'));
    assert.deepEqual(log, [], 'the live cloud is never created');
    assert.equal(r.mode(), 'local-blocked');
  });

  it('fails closed: no host check, or a host check that throws, refuses the live cloud', async () => {
    for (const localHost of [null, () => { throw new Error('no location'); }]) {
      const { r, log } = router({ dev: false, isolation: false, enabled: true, localHost });
      (await callAll(r)).forEach((res) => assert.equal(res.code, 'local-host-blocked'));
      assert.deepEqual(log, []);
    }
  });

  it('recognizes local and private addresses, and unreadable ones, as local', () => {
    ['http://localhost:5173/', 'http://127.0.0.1:4173/', 'http://[::1]:5173/', 'http://0.0.0.0:5173/', 'http://app.localhost/',
      'http://192.168.1.20:5173/', 'http://10.0.0.5/', 'http://172.20.1.1/', 'http://tablet.local/', 'file:///C:/dist/index.html',
    ].forEach((url) => assert.equal(cashClimbV3LocalHost(at(url)), true, url));
    assert.equal(cashClimbV3LocalHost(null), true);
    assert.equal(cashClimbV3LocalHost({ protocol: 'https:', hostname: '' }), true);
    ['https://frontrangepool.com/', 'https://www.frontrangepool.com/#/tournament-bracket', 'https://172.15.0.1/']
      .forEach((url) => assert.equal(cashClimbV3LocalHost(at(url)), false, url));
  });

  it('a development build on localhost still uses the isolated test cloud', async () => {
    const { r, log } = router({ dev: true, isolation: true, enabled: true, local: true });
    await callAll(r);
    assert.equal(r.mode(), 'isolated');
    assert.ok(log.every((l) => l.startsWith('isolated')), log.join(', '));
  });

  it('the app wiring passes the real host check to the router', () => {
    const src = readFileSync(join(here, 'cashClimbV3Cloud.js'), 'utf8');
    assert.match(src, /localHost: \(\) => cashClimbV3LocalHost\(\)/);
  });

  it('the isolation flag only works in a development build', () => {
    const flag = memoryStorage({ [CASH_CLIMB_V3_ISOLATED_FLAG]: 'on' });
    assert.equal(cashClimbV3DevBuild({ DEV: true, PROD: false }), true);
    assert.equal(cashClimbV3DevBuild({ DEV: false, PROD: true }), false);
    assert.equal(cashClimbV3DevBuild({ DEV: true, PROD: true }), false);
    assert.equal(cashClimbV3IsolationOn({ DEV: true, PROD: false }, flag), true);
    assert.equal(cashClimbV3IsolationOn({ DEV: false, PROD: true }, flag), false);
    assert.equal(cashClimbV3IsolationOn({ DEV: true, PROD: false }, memoryStorage()), false);
  });

  it('the live V3 cloud switch is a plain true/false constant passed straight to the router', () => {
    const src = readFileSync(join(here, 'cashClimbV3Cloud.js'), 'utf8');
    assert.match(src, /export const CASH_CLIMB_V3_LIVE_CLOUD_ENABLED = (true|false);/);
    assert.match(src, /liveEnabled: \(\) => CASH_CLIMB_V3_LIVE_CLOUD_ENABLED,/);
  });

  it('only the wiring module imports Supabase; no V3 cloud module touches King of the Hill or Showdown storage', () => {
    const files = readdirSync(here).filter((f) => f.endsWith('.js') && !f.endsWith('.test.js'));
    files.forEach((f) => {
      const src = readFileSync(join(here, f), 'utf8');
      if (f !== 'cashClimbV3Cloud.js') assert.doesNotMatch(src, /@shared\/config\/supabase|createClient\(/, f);
      assert.doesNotMatch(src, /cash_climb_events|cash_climb_showdown|showdownCloud/, f);
    });
  });
});

describe('Cash Climb (V3) isolated test cloud', () => {
  it('is shared by every tab of the browser and persists in its own key', async () => {
    const storage = memoryStorage();
    const tab1 = createCashClimbV3IsolatedCloud({ storage });
    const tab2 = createCashClimbV3IsolatedCloud({ storage });
    assert.equal((await tab1.save(setupRecord('iso-1'), 0)).data.revision, 1);
    assert.equal((await tab2.load('iso-1')).data.revision, 1);
    assert.equal((await tab2.save(setupRecord('iso-1'), 0)).data.replayed, true, 'an identical create is a replay');
    assert.equal((await tab2.save({ ...setupRecord('iso-1'), name: 'Tab 2' }, 0)).code, 'stale-revision');
    assert.ok(storage.getItem(CASH_CLIMB_V3_ISOLATED_KEY));
    assert.deepEqual(storage.keys(), [CASH_CLIMB_V3_ISOLATED_KEY]);
    clearCashClimbV3IsolatedCloud(storage);
    assert.equal(storage.getItem(CASH_CLIMB_V3_ISOLATED_KEY), null);
  });

  it('can simulate a lost connection', async () => {
    const storage = memoryStorage({ [CASH_CLIMB_V3_ISOLATED_OFFLINE_FLAG]: 'on' });
    const cloud = createCashClimbV3IsolatedCloud({ storage });
    assert.equal((await cloud.save(setupRecord('iso-2'), 0)).code, 'network');
    storage.removeItem(CASH_CLIMB_V3_ISOLATED_OFFLINE_FLAG);
    assert.equal((await cloud.save(setupRecord('iso-2'), 0)).code, '');
  });
});
