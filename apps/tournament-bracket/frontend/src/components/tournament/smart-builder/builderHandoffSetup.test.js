import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { render } from './builderRenderKit.test-support.mjs';
import { searchSync } from './builderSearch.js';
import { createHandoff, handoffNote, offeredOptions } from './builderHandoff.js';
import { cashClimbSetupStart } from '../cash-climb/cashClimbSetupStart.js';
import { defaultKohRaceTo, defaultRrRaceTo } from '../cash-climb/cashClimbRace.js';
import { OPEN_TOURNAMENT_STRUCTURE } from '../cash-climb/openTournamentStructure.js';
import { createOpenTournament, startTournament } from '../cash-climb/cashClimbEngine.js';
import { prefillConfig, prefillPickerNote, prefillSetupNote, isShowdownPrefill } from '../showdown/operator/showdownPrefill.js';
import { initialPick, pickProblem, confirmPick } from '../showdown/operator/showdownFormatPick.js';
import { createShowdownWithFormat, setupProblems } from '../showdown/showdownEngine.js';
import { makeOperator } from '../showdown/operator/showdownOperatorKit.js';
import { operator } from '../showdown/showdownTestKit.js';
import { freshStorage } from '../showdown/cloud/showdownCloudTestKit.js';

const QUICK = { pass1Runs: 6, pass2Runs: 12 };
const finalFor = (raw) => ({ ...searchSync(raw, QUICK).final, status: 'final', preliminary: false });
const RESULT = finalFor({ entrants: 8, tables: 4, entryFee: 20, targetMin: 360 });
const handoffFor = (family, version) => {
  const m = offeredOptions(RESULT.recommendation).find((o) => o.family === family && (version === undefined || o.version === version));
  return { m, handoff: createHandoff(m, RESULT).handoff };
};
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const selectHtml = (html, id) => html.match(new RegExp(`<select id="${id}"[^>]*>.*?</select>`))[0];
const players = (n) => Array.from({ length: n }, (_, i) => ({ name: `Player ${i + 1}` }));
const createShowdown = (handoff, version) => createShowdownWithFormat(
  { ...prefillConfig(handoff, version), presetId: 'legends', payoutVersion: version, confirmed: true }, operator(1)(),
);
const src = (rel) => readFileSync(new URL(rel, import.meta.url), 'utf8');

test('Cash Climb setup starts exactly as before without a handoff', () => {
  const defaults = {
    fromBuilder: false, raceToMode: String(defaultRrRaceTo()), otherRaceTo: '', kohRaceToMode: String(defaultKohRaceTo()), otherKohRaceTo: '',
    tableCountMode: '4', otherTableCount: '', entryFee: String(OPEN_TOURNAMENT_STRUCTURE.entryFee), plannedPlayers: null,
  };
  assert.deepEqual(cashClimbSetupStart(), defaults);
  assert.deepEqual(cashClimbSetupStart(null), defaults);
  assert.deepEqual(cashClimbSetupStart(handoffFor('showdown', 1).handoff), defaults, 'a Showdown handoff never fills Cash Climb');
  assert.deepEqual(cashClimbSetupStart({ family: 'cash-climb' }), defaults);
});

test('a Cash Climb handoff fills the races, tables and fee; odd values fall back to the defaults', () => {
  const { m, handoff } = handoffFor('cash-climb');
  const start = cashClimbSetupStart(handoff);
  assert.equal(start.fromBuilder, true);
  assert.equal(start.raceToMode, String(m.raceTo));
  assert.equal(start.kohRaceToMode, String(m.kohRaceTo));
  assert.equal(start.tableCountMode, '4');
  assert.equal(start.entryFee, '20');
  assert.equal(start.plannedPlayers, 8);
  const big = cashClimbSetupStart({ family: 'cash-climb', settings: { raceTo: 9, kohRaceTo: 2, tableCount: 14, entryFee: 0 } });
  assert.deepEqual([big.raceToMode, big.otherRaceTo, big.tableCountMode, big.otherTableCount, big.entryFee], ['other', '9', 'other', '14', '0']);
  const bad = cashClimbSetupStart({ family: 'cash-climb', settings: { raceTo: 0, kohRaceTo: 'x', tableCount: 2.5, entryFee: -1 } });
  assert.deepEqual([bad.raceToMode, bad.kohRaceToMode, bad.tableCountMode, bad.entryFee], [String(defaultRrRaceTo()), String(defaultKohRaceTo()), '4', String(OPEN_TOURNAMENT_STRUCTURE.entryFee)]);
});

test('the Cash Climb setup form shows the handed-over values in its normal, editable controls', async () => {
  const props = { onStart() {}, onCancel() {} };
  const plain = await render('../cash-climb/CashClimbSetup.jsx', props);
  assert.equal(await render('../cash-climb/CashClimbSetup.jsx', { ...props, prefill: null }), plain);
  assert.equal(await render('../cash-climb/CashClimbSetup.jsx', { ...props, prefill: handoffFor('showdown', 2).handoff }), plain);
  assert.doesNotMatch(plain, /Help me choose/);
  const handoff = { family: 'cash-climb', plannedPlayers: 12, settings: { raceTo: 2, kohRaceTo: 3, tableCount: 6, entryFee: 25 } };
  const html = await render('../cash-climb/CashClimbSetup.jsx', { ...props, prefill: handoff });
  assert.match(selectHtml(html, 'cc-rr-race'), /<option value="2" selected="">/);
  assert.match(selectHtml(html, 'cc-koh-race'), /<option value="3" selected="">/);
  assert.match(html, /<option value="6" selected="">6<\/option>/);
  assert.match(html, /type="number" min="0" step="1" value="25"/);
  assert.match(text(html), /filled in from Help me choose, planned for 12 players\. Review and change anything, add your players, then start\./);
  assert.match(html, /Start tournament/);
  assert.doesNotMatch(html, /disabled/);
});

test('a Cash Climb started from handed-over settings goes through the normal engine start unchanged', () => {
  const { handoff } = handoffFor('cash-climb');
  const s = handoff.settings;
  const config = { name: 'Cash Climb', tournamentDate: '2026-10-20', gameType: OPEN_TOURNAMENT_STRUCTURE.gameRules.gameType, ...s, players: players(8) };
  const started = startTournament(createOpenTournament(config));
  assert.deepEqual([started.raceTo, started.kohRaceTo, started.tableCount, started.entryFee], [s.raceTo, s.kohRaceTo, s.tableCount, s.entryFee]);
  const plain = startTournament(createOpenTournament({ ...config, raceTo: s.raceTo, kohRaceTo: s.kohRaceTo }));
  assert.equal(started.totalPrizePool, plain.totalPrizePool);
  assert.throws(() => startTournament(createOpenTournament({ ...config, players: players(1) })), /at least 2 players/);
});

test('Showdown prefill: only the confirmed format gets settings, and only setting keys', () => {
  const v3 = handoffFor('showdown', 3).handoff;
  assert.ok(isShowdownPrefill(v3));
  assert.deepEqual(prefillConfig(v3, 3), { ...v3.settings });
  assert.deepEqual(prefillConfig(v3, 1), {}, 'picking another format starts from its normal settings');
  assert.deepEqual(prefillConfig(handoffFor('cash-climb').handoff, 1), {});
  const sneaky = { family: 'showdown', version: 1, settings: { entryFee: 30, tableCount: 5, players: players(8), id: 'x', status: 'live', qualifyingRaceTo: 9 } };
  assert.deepEqual(prefillConfig(sneaky, 1), { entryFee: 30, tableCount: 5 });
  assert.match(prefillPickerNote(v3), /suggested V3\. Confirm V3/);
  assert.match(prefillSetupNote(v3), /match lengths/);
  assert.doesNotMatch(prefillSetupNote(handoffFor('showdown', 1).handoff), /match lengths/);
});

test('the format picker preselects the suggestion but still needs the confirmation tick', async () => {
  assert.deepEqual(initialPick(null, 1), { selected: 1, confirmed: false });
  assert.match(pickProblem(initialPick(null, 1)), /Tick the box to confirm V1/);
  assert.equal(pickProblem(confirmPick(initialPick(null, 1), true)), '');
  assert.deepEqual(initialPick(2, 1), { selected: 2, confirmed: false }, 'a format change ignores suggestions');
  assert.deepEqual(initialPick(null, 9), initialPick(), 'an unknown suggestion falls back to the recommended format');
  const props = { onConfirm() {}, onCancel() {} };
  const html = await render('../showdown/operator/ShowdownFormatPicker.jsx', { ...props, suggested: 2, note: prefillPickerNote(handoffFor('showdown', 2).handoff) });
  assert.match(html, /checked="" value="2"/);
  assert.doesNotMatch(html, /type="checkbox" checked=""/);
  assert.match(html, /disabled="">Create tournament/);
  assert.match(text(html), /Help me choose suggested V2/);
  assert.equal(await render('../showdown/operator/ShowdownFormatPicker.jsx', props), await render('../showdown/operator/ShowdownFormatPicker.jsx', { ...props, suggested: null, note: '' }));
});

test('V1, V2 and V3 events created from a handoff hold its settings, stay editable and still need every start check', () => {
  const store = freshStorage();
  for (const version of [1, 2, 3]) {
    const { m, handoff } = handoffFor('showdown', version);
    const created = createShowdown(handoff, version);
    assert.equal(created.status, 'setup');
    assert.equal(created.payoutVersion, version);
    assert.deepEqual([created.players, created.matches, created.payoutPlan], [[], [], null]);
    assert.equal(created.settings.entryFee, 20);
    assert.equal(created.settings.tableCount, 4);
    if (version === 3) assert.deepEqual([created.settings.qualifyingGames, created.settings.playoffRaceTo], [m.qualifyingGames, m.playoffRaceTo]);
    else assert.deepEqual([created.settings.qualifyingRaceTo, created.settings.playoffRaceTo], [m.qualifyingRaceTo, m.playoffRaceTo]);
    assert.ok(setupProblems(created).some((p) => /at least 8 entrants/.test(p)), 'start stays blocked until players are added');
    const o = makeOperator(version);
    const edited = o.tap(created, 'updateSettings', { entryFee: '30', tableCount: '5' });
    assert.deepEqual([edited.settings.entryFee, edited.settings.tableCount], [30, 5]);
    let ready = created;
    players(8).forEach((p) => { ready = o.tap(ready, 'addPlayer', p); });
    assert.deepEqual(setupProblems(ready), []);
    const started = o.tap(ready, 'start', {});
    assert.notEqual(started.status, 'setup');
    assert.equal(started.settings.entryFee, 20);
  }
  assert.equal(store.size, 0, 'nothing was written to browser storage');
});

test('a Showdown event created without a handoff is unchanged', () => {
  for (const version of [1, 2, 3]) {
    const a = createShowdown(null, version);
    const b = createShowdownWithFormat({ presetId: 'legends', payoutVersion: version, confirmed: true }, operator(1)());
    assert.deepEqual(a.settings, b.settings);
  }
});

test('the handoff lives in memory once: cleared after it is read, after a start, and on cancel', () => {
  const app = src('../TournamentBracketApp.jsx');
  assert.match(app, /useEffect\(\(\) => \{\s*if \(handoff\) setHandoff\(null\);\s*\}, \[handoff\]\);/);
  assert.match(app, /prefill=\{handoff\?\.family === 'cash-climb' \? handoff : null\}/);
  assert.match(app, /prefill=\{handoff\?\.family === 'showdown' \? handoff : null\}/);
  assert.doesNotMatch(app, /saveShowdown|archiveShowdown/, 'the tournament app never replaces a Showdown itself');
  const cash = src('../cash-climb/CashClimbApp.jsx');
  assert.match(cash, /persist\(startTournament\(created\)\);\s*setSetupPrefill\(null\);/);
  assert.match(cash, /useState\(\(\) => \(intent === 'new' \? prefill : null\)\)/);
  const sd = src('../showdown/operator/ShowdownApp.jsx');
  assert.match(sd, /useState\(\(\) => \(isShowdownPrefill\(prefill\) \? prefill : null\)\)/);
  assert.match(sd, /if \(state\.status === 'setup'\) ask\(DISCARD_COPY, \(\) => \{ discard\(\); setPicker\('create'\); return true; \}, drop\);/);
  assert.match(sd, /else ask\(newShowdownCopy\(state\), \(\) => \{ setPicker\('create'\); return true; \}, drop\);/);
  assert.match(sd, /onDiscard=\{\(\) => ask\(DISCARD_COPY, discard\)\}/, 'the Builder uses the same discard confirmation as the setup screen');
  assert.match(sd, /onNew=\{\(\) => ask\(newShowdownCopy\(state\), /, 'and the same new-Showdown confirmation as the header');
  assert.match(sd, /const closeConfirm = \(\) => \{ confirm\?\.onNo\?\.\(\);/);
  assert.match(sd, /setHandoff\(null\);\s*commit\(created\);/);
  assert.match(sd, /onCancel=\{\(\) => \{ setPicker\(null\); setHandoff\(null\); setError\(''\); \}\}/);
  ['./builderHandoff.js', '../showdown/operator/showdownPrefill.js', '../cash-climb/cashClimbSetupStart.js'].forEach((rel) => {
    const code = src(rel);
    assert.doesNotMatch(code, /localStorage|sessionStorage|indexedDB|fetch\(|supabase/i, rel);
    assert.doesNotMatch(code, /from '[^']*(cloud|store|sync|persist|archive)[^']*'/i, rel);
  });
});

test('result cards offer "Use these settings" only when asked, only on recommended cards, and say why when blocked', async () => {
  const props = { result: RESULT, onTry() {} };
  const count = (html) => (html.match(/Use these settings/g) || []).length;
  assert.equal(count(await render('./SmartBuilderResults.jsx', props)), 0, 'M3 read-only rendering is unchanged');
  const offered = offeredOptions(RESULT.recommendation).length;
  const open = await render('./SmartBuilderResults.jsx', { ...props, onUse() {}, useProblem: () => '', useNote: (m) => handoffNote(m) });
  assert.equal(count(open), offered);
  assert.doesNotMatch(open, /sb-use-btn" disabled/);
  assert.match(text(open), /Nothing starts until you start it there\./);
  const blocked = await render('./SmartBuilderResults.jsx', { ...props, onUse() {}, useProblem: (m) => (m.family === 'showdown' ? 'A Showdown event is already open on this tablet.' : '') });
  const showdownCards = offeredOptions(RESULT.recommendation).filter((m) => m.family === 'showdown').length;
  assert.equal((blocked.match(/disabled="">Use these settings/g) || []).length, showdownCards);
  const none = finalFor({ entrants: 24, tables: 4, entryFee: 20, targetMin: 300 });
  assert.equal(none.recommendation.nothingFits, true);
  assert.equal(count(await render('./SmartBuilderResults.jsx', { result: none, onTry() {}, onUse() {}, useProblem: () => '' })), 0);
});
