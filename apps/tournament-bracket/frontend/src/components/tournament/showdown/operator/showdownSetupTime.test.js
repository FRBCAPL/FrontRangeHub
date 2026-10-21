import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { createSetupEstimateClient } from './showdownSetupEstimateClient.js';
import { setupEstimateSettings, formatMinutes } from './showdownSetupTimeView.js';
import { render } from './showdownRenderKit.js';

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const v3 = (players = 0, extra = {}) => E.createShowdown({
  payoutVersion: 3, entryFee: 20, tableCount: 4, qualifyingGames: 9, playoffRaceTo: 3,
  players: Array.from({ length: players }, (_, i) => ({ name: `P${i + 1}` })), ...extra,
});

function fakeWorkers() {
  const made = [];
  const create = () => {
    const w = { sent: [], terminated: false, postMessage(m) { this.sent.push(m); }, terminate() { this.terminated = true; } };
    made.push(w);
    return w;
  };
  return { made, create };
}

test('estimate settings: the expected or entered players, the current match lengths and a stand-in for a blank fee', () => {
  assert.match(setupEstimateSettings(v3(0), 10).problem, /appears once there are 8–24 players entered or expected/);
  const planned = setupEstimateSettings(v3(0, { plannedPlayers: 12 }), 10).settings;
  assert.deepEqual({ ...planned, qualifyingRaceTo: undefined }, {
    version: 3, entrants: 12, tables: 4, entryFee: 20, qualifyingRaceTo: undefined, qualifyingGames: 9, playoffRaceTo: 3, minutesPerGame: 10,
  });
  assert.equal(setupEstimateSettings(v3(10), 12).settings.entrants, 10);
  const blankFee = { ...v3(10), settings: { ...v3(10).settings, entryFee: '' } };
  assert.equal(setupEstimateSettings(blankFee, 10).settings.entryFee, 20);
  assert.equal(formatMinutes(323), '5 hr 23 min');
  assert.equal(formatMinutes(45), '45 min');
});

test('client: a newer request replaces the running one; results are cached; failures reject', async () => {
  const { made, create } = fakeWorkers();
  const client = createSetupEstimateClient({ createWorker: create });
  const first = client.estimate({ a: 1 });
  const second = client.estimate({ a: 2 });
  assert.equal(await first, null);
  assert.equal(made[0].terminated, true);
  const w = made[1];
  w.onmessage({ data: { id: w.sent[0].id, result: { p50: 300 } } });
  assert.deepEqual(await second, { p50: 300 });
  assert.deepEqual(await client.estimate({ a: 2 }), { p50: 300 });
  assert.equal(w.sent.length, 1);
  const failing = client.estimate({ a: 3 });
  w.onmessage({ data: { id: w.sent[1].id, error: 'Bad settings.' } });
  await assert.rejects(failing, /Bad settings\./);
  const crashed = client.estimate({ a: 4 });
  w.onerror({});
  await assert.rejects(crashed, /stopped unexpectedly/);
  client.dispose();
});

test('the setup screen shows the estimate panel with the pace choice and who it is for', async () => {
  const props = (state) => ({ state, act: () => true, onStart() {}, onDiscard() {}, onLeave() {}, onChangeFormat() {} });
  const body = text(await render('ShowdownSetup.jsx', props(v3(0, { plannedPlayers: 8 }))));
  assert.match(body, /Estimated time/);
  assert.match(body, /Minutes per game \(for the estimate\)/);
  assert.match(body, /For 8 expected players at 10 minutes a game, the same simulation Help me choose uses\./);
  assert.match(text(await render('ShowdownSetup.jsx', props(v3(0)))), /The time estimate appears once there are 8–24 players entered or expected\./);
  const started = text(await render('ShowdownSetupTime.jsx', { state: v3(9), createClient: () => ({ estimate: () => new Promise(() => {}), dispose() {} }) }));
  assert.match(started, /For 9 players at 10 minutes a game/);
});
