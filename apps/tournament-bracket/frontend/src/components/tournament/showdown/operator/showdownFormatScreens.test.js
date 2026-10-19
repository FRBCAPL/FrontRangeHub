import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { render, fakeLocalStorage } from './showdownRenderKit.js';
import { makeOperator } from './showdownOperatorKit.js';
import { SHOWDOWN_STORAGE_KEY } from './showdownStore.js';
import { createShowdownWithFormat, formatChangePreview } from '../showdownEngine.js';
import { startedEvent } from '../showdownTestKit.js';

afterEach(() => fakeLocalStorage());

function clean(html) {
  assert.ok(!/\\u[0-9a-f]{4}/i.test(html), 'no escaped unicode shown as text');
  assert.ok(!/undefined|NaN|\[object Object\]/.test(html), 'no broken values');
  return html;
}

function setupEvent(version, players = 8) {
  const o = makeOperator(version);
  let s = createShowdownWithFormat({ presetId: 'legends', payoutVersion: version, confirmed: true }, o.op());
  for (let i = 1; i <= players; i += 1) s = o.tap(s, 'addPlayer', { name: `Player ${i}` });
  return s;
}

const setupScreen = (state) => render('ShowdownSetup.jsx', { state, act: () => true, onStart() {}, onDiscard() {}, onLeave() {}, onChangeFormat() {} });

describe('format picker', () => {
  it('new event: V3 preselected and recommended, V1 and V2 selectable, Create disabled until confirmed', async () => {
    const html = clean(await render('ShowdownFormatPicker.jsx', { onConfirm() {}, onCancel() {} }));
    for (const text of ['Choose a tournament format', 'V1 · Win pay with qualifier top-ups', 'V2 · Per-game pay with a playoff reserve', 'V3 · Fixed-length qualifying with per-game pay', 'Recommended', 'I confirm this tournament will use V3', 'Tick the box to confirm V3']) {
      assert.ok(html.includes(text), text);
    }
    assert.ok(!html.includes('cannot be started yet'), 'V3 is startable');
    assert.match(html, /checked="" value="3"/);
    assert.doesNotMatch(html, /checked="" value="[12]"/);
    assert.match(html, /type="checkbox"(?![^>]*checked)/);
    assert.match(html, /disabled=""[^>]*>Create tournament/);
  });

  it('format change: the current format is marked and cannot be re-chosen', async () => {
    const html = clean(await render('ShowdownFormatPicker.jsx', { current: 1, resetsFor: () => [], onConfirm() {}, onCancel() {} }));
    for (const text of ['Change tournament format', 'Current format', 'already uses V1']) assert.ok(html.includes(text), text);
    assert.match(html, /checked="" value="1"/);
    assert.match(html, /disabled=""[^>]*>Change to V1/);
  });
});

describe('setup screen shows the format', () => {
  it('V3: format panel, recommended, change button, ready to start, fixed games per match, plan preview, no game rules', async () => {
    const html = clean(await setupScreen(setupEvent(3)));
    for (const text of ['Cash Climb Showdown · Setup · V3', 'Format', 'V3 · Fixed-length qualifying', 'Recommended', 'Change format', 'games per match, all played, ties allowed', 'Games per qualifying match', 'Playoff race', 'Showdown only records who wins each game', 'Proposed V3 payout plan']) {
      assert.ok(html.includes(text), text);
    }
    assert.ok(!html.includes('cannot be started yet'));
    assert.doesNotMatch(html, /disabled=""[^>]*>Start qualifying/);
    assert.ok(!/9-Ball|Texas|Qualifying race|payout schedule is not available/.test(html), 'no game, no qualifying race, no V1/V2 schedule text on V3 setup');
  });

  for (const [version, name] of [[1, 'Win pay with qualifier top-ups'], [2, 'Per-game pay with a playoff reserve']]) {
    it(`V${version}: format panel plus the unchanged setup, ready to start`, async () => {
      const html = clean(await setupScreen(setupEvent(version)));
      for (const text of [`Setup · V${version}`, `V${version} · ${name}`, 'Change format', 'Race to 3', 'race to 5', 'Payout schedule for 8 entrants', 'Ready to start', 'Showdown only records who wins each game']) {
        assert.ok(html.includes(text), text);
      }
      assert.ok(!/9-ball|texas|ruleset|\brack|<dt>Game<\/dt>/i.test(html.replace(/class="[^"]*"/g, '')), 'no game selection or playing rules');
      assert.doesNotMatch(html, /disabled=""[^>]*>Start qualifying/);
      assert.ok(!html.includes('Recommended'), 'only V3 is marked recommended');
    });
  }
});

describe('no Showdown screen requires a game', () => {
  it('changing V3 to V1 lists only the match lengths it resets, and no game or ruleset', async () => {
    const s = setupEvent(3);
    const resets = formatChangePreview(s, 1).resets;
    assert.deepEqual(resets.map((r) => r.label), ['Qualifying race', 'Qualifying games']);
    const html = clean(await render('ShowdownFormatPicker.jsx', { current: 3, resetsFor: () => resets, onConfirm() {}, onCancel() {} }));
    assert.ok(!/9-ball|texas|ruleset|any game/i.test(html));
  });
});

describe('unsupported events on the operator screens', () => {
  const { s: live } = startedEvent(8, { seed: 4 });

  for (const [label, state] of [['unknown version', { ...live, payoutVersion: 9 }], ['started V3', { ...live, payoutVersion: 3 }], ['newer engine', { ...live, minEngine: 99 }]]) {
    it(`${label}: the app shows a read-only update notice and no event controls`, async () => {
      fakeLocalStorage({ [SHOWDOWN_STORAGE_KEY]: JSON.stringify(state) });
      const html = clean(await render('ShowdownApp.jsx', { onLeave() {} }));
      for (const text of ['Update required', 'read-only', 'Reload to update', 'Nothing on this tablet or in the cloud has been changed']) assert.ok(html.includes(text), text);
      for (const text of ['Run event', 'Start qualifying', 'Lock qualifying', 'Corrections']) assert.ok(!html.includes(text), `hides ${text}`);
    });
  }

  it('an unsupported setup event cannot be edited from the setup screen', async () => {
    fakeLocalStorage({ [SHOWDOWN_STORAGE_KEY]: JSON.stringify({ ...setupEvent(1), payoutVersion: 9 }) });
    const html = clean(await render('ShowdownApp.jsx', { onLeave() {} }));
    assert.ok(html.includes('Update required'));
    assert.ok(!html.includes('Change format') && !html.includes('Start qualifying'));
  });

  it('past events list the format and flag ones that need an update', async () => {
    const html = clean(await render('ShowdownStart.jsx', { archive: [live, { ...live, id: 'x', payoutVersion: 9 }], onNew() {}, onOpen() {}, onRemove() {}, onLeave() {} }));
    assert.ok(html.includes('· V1'));
    assert.ok(html.includes('Unknown format') && html.includes('Needs an app update (read-only)'));
    assert.ok(html.includes('You choose and confirm the format next'));
  });
});
