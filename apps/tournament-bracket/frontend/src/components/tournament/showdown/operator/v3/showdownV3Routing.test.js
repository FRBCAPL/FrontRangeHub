import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { render, fakeLocalStorage, loadComponent } from '../showdownRenderKit.js';
import { makeOperator, setUpEvent, workBoard } from '../showdownOperatorKit.js';
import { SHOWDOWN_STORAGE_KEY } from '../showdownStore.js';
import { createV3, startV3, startNext, runV3 } from '../../v3/showdownV3WorkflowKit.js';
import { v3PreviewAvailable, v3PreviewOn, V3_PREVIEW_FLAG } from './showdownV3Preview.js';
import { cloudMessage, V3_LOCAL_ONLY_MESSAGE } from '../../cloud/showdownCloudApi.js';
import { createShowdownSync } from '../../cloud/showdownSync.js';
import { V3_STARTS_ENABLED } from '../../v3/showdownV3Format.js';
import { interruptShowdown } from '../../showdownEngine.js';

function clean(html) {
  assert.ok(!/\\u[0-9a-f]{4}/i.test(html), 'no escaped unicode shown as text');
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), 'no broken values');
  return html;
}

async function app(state) {
  fakeLocalStorage({ [SHOWDOWN_STORAGE_KEY]: JSON.stringify(state) });
  return clean(await render('ShowdownApp.jsx', { onLeave() {} })).replace(/<!-- -->/g, '');
}

const states = {};
const tabsOf = async (state) => (await loadComponent('ShowdownHeader.jsx')).showdownTabs(state).map((t) => t.key);
before(() => {
  for (const v of [1, 2]) {
    const o = makeOperator(v);
    states[`v${v}`] = workBoard(o, setUpEvent(o, 8, { payoutVersion: v }), 'qualifying', () => [3, 1]);
  }
  const st = startV3(8, { seed: 4 });
  [states.v3] = startNext(st.s, st.op, 'qualifying');
  states.v3done = runV3(8, { seed: 4 }).s;
});
after(() => fakeLocalStorage());

describe('format-specific operator routing', () => {
  it('a V3 event opens the V3 header, tabs and views; never V1/V2 presentation', async () => {
    const html = await app(states.v3);
    for (const t of ['Cash Climb Showdown V3 · Qualifying', 'End &amp; settle', 'Run event', 'Round 1', 'all played (ties allowed)', 'Qualifying $', 'Pool $160']) {
      assert.ok(html.includes(t), t);
    }
    for (const t of ['Player page', 'TV 16:9', 'How V3 works TV']) assert.ok(html.includes(t), t);
    for (const t of ['Race to 3', 'Qualifying win pays', 'How it works TV']) assert.ok(!html.includes(t), `no ${t}`);
    assert.ok((await tabsOf(states.v3)).includes('settle'));
  });

  it('V1 and V2 events keep their unchanged screens and tabs', async () => {
    for (const v of ['v1', 'v2']) {
      const html = await app(states[v]);
      assert.ok(html.includes('Cash Climb Showdown · Qualifying'), v);
      for (const t of ['End &amp; settle', 'Cash Climb Showdown V3', 'Payout reconciliation', 'ties allowed']) assert.ok(!html.includes(t), `${v}: no ${t}`);
      assert.ok(!(await tabsOf(states[v])).includes('settle'));
    }
  });

  it('a completed V3 event shows V3 results with cent amounts', async () => {
    const html = await app(states.v3done);
    for (const t of ['Cash Climb Showdown V3', 'Final results', 'Payout reconciliation', 'Every cent of the']) assert.ok(html.includes(t), t);
    assert.ok((await tabsOf(states.v3done)).includes('bracket'));
  });

  it('an event interrupted before any bracket was drawn has no Bracket tab', async () => {
    const m = states.v3.matches.find((x) => x.status === 'on-table');
    const end = interruptShowdown(states.v3, { scores: { [m.id]: { noGamesPlayed: true } } }, 'RESET', { by: 'op' });
    const tabs = await tabsOf(end);
    assert.ok(!tabs.includes('bracket') && tabs.includes('results') && tabs.includes('settle'));
    const html = await app(end);
    assert.ok(html.includes('Interrupted. Every cent of the $160 pool is accounted for.'));
  });

  it('a V3 setup in a non-development build can be started', async () => {
    const html = await app(createV3(10));
    assert.doesNotMatch(html, /disabled=""[^>]*>Start qualifying/);
    assert.ok(!html.includes('Development preview'));
  });
});

describe('the V3 preview stays development-only', () => {
  it('the preview needs a development build and the device flag', () => {
    assert.equal(V3_STARTS_ENABLED, true);
    const store = fakeLocalStorage();
    assert.equal(v3PreviewAvailable(undefined), false);
    assert.equal(v3PreviewAvailable({ DEV: false, PROD: true }), false);
    assert.equal(v3PreviewAvailable({ DEV: true, PROD: true }), false);
    assert.equal(v3PreviewOn({ DEV: true, PROD: false }), false, 'flag off');
    store.set(V3_PREVIEW_FLAG, 'on');
    assert.equal(v3PreviewOn({ DEV: true, PROD: false }), true);
    assert.equal(v3PreviewOn({ DEV: false, PROD: true }), false, 'a production build ignores the flag');
  });
});

describe('V3 cloud and local-only messaging', () => {
  it('a V3 event that the cloud cannot store says so plainly; V1/V2 wording is unchanged', () => {
    assert.equal(cloudMessage('unavailable', states.v3), V3_LOCAL_ONLY_MESSAGE);
    assert.match(V3_LOCAL_ONLY_MESSAGE, /saved on this tablet only/);
    assert.equal(cloudMessage('unavailable', states.v1), cloudMessage('unavailable'));
    assert.equal(cloudMessage('stale-version', states.v3), cloudMessage('stale-version'));
  });

  it('the sync reports local-only with the V3 message and never "saved"', async () => {
    fakeLocalStorage();
    const seen = [];
    const api = { save: async () => ({ data: null, error: new Error('showdown:unavailable'), code: 'unavailable' }), load: async () => ({ data: null, error: null, code: '' }) };
    const sync = createShowdownSync({ api, onStatus: (s) => seen.push(s.status), setTimer: () => 0, clearTimer: () => {} });
    const status = await sync.queue(states.v3);
    assert.equal(status.status, 'local-only');
    assert.equal(status.message, V3_LOCAL_ONLY_MESSAGE);
    assert.ok(!seen.includes('saved'));
  });

  it('the cloud bar: local-only and conflict states; V3 links open the V3 player page, TV and guide', async () => {
    const local = clean(await render('ShowdownCloudBar.jsx', { eventId: 'e1', status: 'qualifying', v3: true, sync: { status: 'local-only', message: V3_LOCAL_ONLY_MESSAGE }, onRetry() {}, onReupload() {}, onOpenConflict() {} }));
    for (const t of ['Saved on this tablet only', 'saved on this tablet only', 'Player page', 'TV 16:9', 'How V3 works TV']) assert.ok(local.includes(t), t);
    for (const t of ['Saved to the cloud', 'How it works TV', 'Isolated test cloud']) assert.ok(!local.includes(t), `no ${t}`);
    const isolated = clean(await render('ShowdownCloudBar.jsx', { eventId: 'e1', status: 'qualifying', v3: true, isolated: true, sync: { status: 'saved' }, onRetry() {}, onReupload() {}, onOpenConflict() {} }));
    assert.ok(isolated.includes('Saved to the isolated test cloud') && isolated.includes('Nothing is sent to the live database'), isolated);
    assert.ok(!isolated.includes('Saved to the cloud'), 'never claims a live cloud save');
    const conflict = clean(await render('ShowdownCloudBar.jsx', { eventId: 'e1', status: 'qualifying', v3: true, sync: { status: 'conflict', message: cloudMessage('stale-version') }, onRetry() {}, onReupload() {}, onOpenConflict() {} }));
    for (const t of ['Two different copies of this event', 'Choose a copy', 'Another device saved a newer copy']) assert.ok(conflict.includes(t), t);
    const v1 = clean(await render('ShowdownCloudBar.jsx', { eventId: 'e1', status: 'qualifying', sync: { status: 'saved' }, onRetry() {}, onReupload() {}, onOpenConflict() {} }));
    assert.ok(v1.includes('Player page') && v1.includes('TV 16:9') && v1.includes('How it works TV'), 'V1/V2 links unchanged');
    for (const n of [1, 2]) {
      const bar = clean(await render('ShowdownCloudBar.jsx', { eventId: 'e1', status: 'qualifying', guideVersion: n, sync: { status: 'saved' }, onRetry() {}, onReupload() {}, onOpenConflict() {} }));
      assert.ok(bar.includes(`How V${n} works TV`), `V${n} guide button`);
    }
  });
});
