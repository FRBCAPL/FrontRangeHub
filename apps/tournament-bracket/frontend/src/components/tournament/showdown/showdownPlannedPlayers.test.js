import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from './showdownEngine.js';
import { normalizePlannedPlayers, previewEntrants, usingPlannedPlayers } from './showdownPlannedPlayers.js';
import { createV3, v3Op } from './v3/showdownV3WorkflowKit.js';
import { v3PlanPreview } from './operator/v3/showdownV3PlanView.js';
import { prefillPlanned, prefillConfig } from './operator/showdownPrefill.js';
import { render } from './operator/showdownRenderKit.js';

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const setup = (state) => render('ShowdownSetup.jsx', { state, act: () => true, onStart() {}, onDiscard() {}, onLeave() {}, onChangeFormat() {} });
const withPlanned = (state, n, op = v3Op()) => E.updateDetails(state, { plannedPlayers: n }, op());

test('expected players: blank clears it; only whole numbers in the supported field range', () => {
  assert.equal(normalizePlannedPlayers(''), null);
  assert.equal(normalizePlannedPlayers(null), null);
  assert.equal(normalizePlannedPlayers('12'), 12);
  [5, 25, 8.5, 'abc'].forEach((v) => assert.throws(() => normalizePlannedPlayers(v), /Expected players must be a whole number from 8 to 24/));
});

test('new events have no expected players unless given; setup details set and clear it; locked after the start', () => {
  const plain = createV3(0);
  assert.equal('plannedPlayers' in plain, false);
  assert.equal(E.createShowdown({ payoutVersion: 3, plannedPlayers: 8 }).plannedPlayers, 8);
  const set = withPlanned(plain, '10');
  assert.equal(set.plannedPlayers, 10);
  assert.equal(set.audit.at(-1).action, 'details');
  assert.equal(withPlanned(set, '').plannedPlayers, null);
  const op = v3Op();
  const started = E.startShowdown(createV3(8, {}, op), op());
  assert.throws(() => withPlanned(started, 10), /only matters before the start/);
});

test('the preview uses the expected number until that many players are entered, and never after the start', () => {
  const s = withPlanned(createV3(3), 8);
  assert.equal(previewEntrants(s), 8);
  assert.equal(usingPlannedPlayers(s), true);
  const full = withPlanned(createV3(10), 8);
  assert.equal(previewEntrants(full), 10);
  assert.equal(usingPlannedPlayers(full), false);
  assert.equal(previewEntrants({ ...s, status: 'qualifying' }), 3);
});

test('a V3 preview for 8 expected players is exactly the plan 8 entered players would lock', () => {
  const planned = v3PlanPreview(withPlanned(createV3(0), 8), { entrants: 8 }).view;
  const real = v3PlanPreview(createV3(8)).view;
  assert.ok(planned);
  assert.deepEqual(planned, real);
});

test('starting locks the plan for the players actually entered, not the expected number', () => {
  const op = v3Op();
  const s = withPlanned(createV3(9, {}, op), 12, op);
  const started = E.startShowdown(s, op());
  assert.equal(started.payoutPlan.entrants, 9);
  assert.equal(started.payoutPlan.poolCents, 9 * 20 * 100);
});

test('the setup screen shows the expected players field and sizes the money by it', async () => {
  const body = text(await setup(withPlanned(createV3(0), 8)));
  assert.match(body, /Expected players \(optional, 8–24\)/);
  assert.ok(body.indexOf('Expected players') < body.indexOf('Entry fee'));
  assert.match(body, /Entrants 0 of 8 expected/);
  assert.match(body, /Entry pool \$160/);
  assert.match(body, /Money shown for 8 expected players \(0 entered so far\)/);
  assert.match(body, /Proposed V3 payout plan/);
  assert.doesNotMatch(body, /The payout plan appears once there are/);
  const none = text(await setup(createV3(0)));
  assert.match(none, /The payout plan appears once there are/);
  assert.doesNotMatch(none, /expected players \(/);
});

test('V1 setup sizes the payout schedule by the expected players too', async () => {
  const s = E.updateDetails(E.createShowdown({ payoutVersion: 1, entryFee: 20 }), { plannedPlayers: 12 });
  const body = text(await setup(s));
  assert.match(body, /Prize pool \$240/);
  assert.match(body, /Payout schedule for 12 expected entrants/);
});

test('a Help me choose prefill carries its player count for its own format only', () => {
  const prefill = { family: 'showdown', version: 3, plannedPlayers: 8, settings: { entryFee: 20, tableCount: 4, qualifyingGames: 9, playoffRaceTo: 3 } };
  assert.deepEqual(prefillPlanned(prefill, 3), { plannedPlayers: 8 });
  assert.deepEqual(prefillPlanned(prefill, 2), {});
  assert.deepEqual(prefillPlanned({ ...prefill, plannedPlayers: 40 }, 3), {});
  assert.equal('plannedPlayers' in prefillConfig(prefill, 3), false);
});
