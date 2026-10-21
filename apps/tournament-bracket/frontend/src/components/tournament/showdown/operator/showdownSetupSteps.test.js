import test from 'node:test';
import assert from 'node:assert/strict';
import * as E from '../showdownEngine.js';
import { stepIssues, initialStep, SETUP_STEPS } from './showdownSetupSteps.js';
import { render } from './showdownRenderKit.js';

const v3 = (players = 0, extra = {}) => E.createShowdown({
  payoutVersion: 3, entryFee: 20, tableCount: 4, qualifyingGames: 9, playoffRaceTo: 3,
  players: Array.from({ length: players }, (_, i) => ({ name: `P${i + 1}` })), ...extra,
});
const props = (state) => ({ state, act: () => true, onStart() {}, onDiscard() {}, onLeave() {}, onChangeFormat() {} });
/** Whether each step wrapper (event, settings, players, review) is shown. */
const shown = (html) => ['event', 'settings', 'players', 'review'].map((k) => {
  const m = html.match(new RegExp(`<div data-step="${k}"( hidden="")?>`));
  assert.ok(m, k);
  return !m[1];
});

test('four steps, in order', () => {
  assert.deepEqual(SETUP_STEPS.map((s) => s.label), ['Event', 'Settings', 'Players', 'Review & start']);
});

test('setup opens where the operator left off: new event, some players, or a full field', () => {
  assert.equal(initialStep(v3(0)), 'event');
  assert.equal(initialStep(v3(3)), 'players');
  assert.equal(initialStep(v3(8)), 'review');
});

test('each step lists what is still missing in it', () => {
  const issues = stepIssues(v3(5));
  assert.deepEqual(issues.event, []);
  assert.deepEqual(issues.settings, []);
  assert.deepEqual(issues.players, ['Add 3 more players (minimum 8).']);
  const badFee = { ...v3(8), settings: { ...v3(8).settings, entryFee: '' } };
  assert.ok(stepIssues(badFee).settings.length > 0);
  assert.deepEqual(stepIssues({ ...v3(0), name: ' ' }).event, ['Enter an event name.']);
});

test('only the current step is shown; every step stays on the page so typed values are kept', async () => {
  const fresh = await render('ShowdownSetup.jsx', props(v3(0)));
  assert.deepEqual(shown(fresh), [true, false, false, false]);
  assert.match(fresh, /aria-label="Setup steps"/);
  assert.match(fresh, /aria-current="step"[^>]*>.*?Event/);
  assert.match(fresh, /Next: Settings/);
  assert.match(fresh, /Add 8 more players|Needs attention/);
  const full = await render('ShowdownSetup.jsx', props(v3(8)));
  assert.deepEqual(shown(full), [false, false, false, true]);
  assert.match(full, /Review and start/);
  assert.match(full, /← Players/);
  assert.match(full, /Start qualifying/);
  ['Expected players', 'Estimated time', 'Add player', 'Proposed V3 payout plan'].forEach((t) => assert.ok(full.includes(t), t));
  assert.match(full, /Cash Climb Showdown · Setup · V3/);
  assert.doesNotMatch(fresh + full, /Â|â€/, 'no mis-encoded characters');
});

test('review shows what the start locks: the players entered, not the expected number', async () => {
  const text = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const html = await render('ShowdownSetup.jsx', props(v3(12, { plannedPlayers: 16 })));
  const settings = text(html.slice(html.indexOf('data-step="settings"'), html.indexOf('data-step="players"')));
  const review = text(html.slice(html.indexOf('data-step="review"')));
  assert.match(settings, /Entry pool \$320/);
  assert.match(review, /Entry pool \$240/);
  assert.match(review, /You expected 16 players and 12 are entered\. The money here is for the 12 entered, which is what starting locks\./);
  assert.match(review, /12 entrants at \$20/);
  assert.doesNotMatch(review, /Money shown for 16 expected/);
});

test('the settings step shows time and money beside the settings', async () => {
  const html = await render('ShowdownSetup.jsx', props(v3(0, { plannedPlayers: 8 })));
  const start = html.indexOf('aria-label="Event settings"');
  const end = html.indexOf('aria-label="Entrants"');
  const settings = html.slice(start, end);
  ['Entry fee', 'Games per qualifying match', 'What these settings mean', 'Estimated time', 'Entry pool', 'Money shown for 8 expected players'].forEach((t) => assert.ok(settings.includes(t), t));
});
