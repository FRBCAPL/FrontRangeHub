import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from './builderRenderKit.test-support.mjs';
import { searchSync } from './builderSearch.js';
import { formatMinutes } from './builderExplain.js';
import { settingsText, nothingFitsAdvice, FAR_OVER_MIN } from './builderNarrative.js';
import { FORM_DEFAULTS } from './builderForm.js';
import { UNCALIBRATED_NOTE } from './builderFlags.js';

const QUICK = { pass1Runs: 6, pass2Runs: 12 };
const finalFor = (raw) => ({ ...searchSync(raw, QUICK).final, status: 'final', preliminary: false });
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

/** Every duration, dollar amount and percentage on the screen must come from the result or the inputs. */
function assertNoInventedNumbers(html, result) {
  const { inputs, recommendation: rec } = result;
  const rows = rec.rows;
  const mins = new Set([inputs.targetMin, inputs.targetMin + FAR_OVER_MIN, FAR_OVER_MIN]);
  if (rec.nothingFits) mins.add(nothingFitsAdvice(result).tryMin);
  rows.forEach((a) => {
    [a.p50, a.p80, Math.abs(a.marginMin)].forEach((x) => mins.add(x));
    rows.forEach((b) => mins.add(Math.abs(Math.round(a.p80 - b.p80))));
  });
  const allowedTimes = new Set([...mins].map(formatMinutes));
  const pool = inputs.entrants * inputs.entryFee;
  const dollars = new Set([inputs.entryFee, pool, ...rows.map((r) => Math.round(r.championShare * pool))].map((d) => `$${d}`));
  const pcts = new Set(rows.flatMap((r) => [r.breakEvenShare, r.cashShare, r.championShare]).map((x) => `${Math.round(100 * x)}%`));
  const body = text(html);
  const times = body.match(/\b\d+ hr \d+ min\b|\b\d+ hr\b|\b\d+ min\b/g) || [];
  assert.ok(times.length > 0);
  times.forEach((t) => assert.ok(allowedTimes.has(t), `unexplained time "${t}"`));
  (body.match(/\$\d+/g) || []).forEach((d) => assert.ok(dollars.has(d), `unexplained amount ${d}`));
  (body.match(/\b\d+%/g) || []).forEach((p) => assert.ok(pcts.has(p), `unexplained percentage ${p}`));
}

test('final results: best overall with settings, times, guarantees, payouts, reasons and trade-offs', async () => {
  const result = finalFor({ entrants: 8, tables: 4, entryFee: 20, targetMin: 360 });
  const rec = result.recommendation;
  const html = await render('./SmartBuilderResults.jsx', { result, onTry() {} });
  const body = text(html);
  assert.match(body, /8 players · 4 tables · 6 hr available/);
  assert.match(body, /Best overall/);
  assert.ok(body.includes(settingsText(rec.primary)));
  assert.ok(body.includes(`Typical ${formatMinutes(rec.primary.p50)}`));
  assert.ok(body.includes(`Conservative ${formatMinutes(rec.primary.p80)}`));
  assert.match(body, /Why this one/);
  assert.match(body, /Every player gets at least \d+ matches and \d+ games, if every match is played\./);
  assert.match(body, /of players win back at least their \$20 entry fee/);
  if (rec.fullerEvent) assert.match(body, /Fuller event, less cushion/);
  rec.alternatives.forEach((m) => assert.ok(body.includes(settingsText(m)), m.id));
  assert.ok(rec.alternatives.length > 0);
  assert.match(body, /Best of each other format/);
  assert.match(body, /All 85 settings checked/);
  assertNoInventedNumbers(html, result);
});

test('16 players, 6 hours: the fuller-event card explains the championship-versus-cushion trade-off', async () => {
  const result = finalFor({ entrants: 16, tables: 4, entryFee: 20, targetMin: 360 });
  const body = text(await render('./SmartBuilderResults.jsx', { result, onTry() {} }));
  assert.match(body, /Comfortable fit/);
  assert.match(body, /Tight fit/);
  assert.match(body, /KOH 2 offers a longer championship race \(race to 2 instead of 1\), but takes about .+ longer, leaving only .+ of cushion\./);
  assert.match(body, /Short championship: King of the Hill race 1/);
  assert.match(body, /Showdown V1: No setting of this format fits your time limit\./);
});

test('nothing fits: a clear explanation and real what-if suggestions, never a fitting card', async () => {
  const result = finalFor({ entrants: 24, tables: 4, entryFee: 20, targetMin: 300 });
  assert.equal(result.recommendation.nothingFits, true);
  const html = await render('./SmartBuilderResults.jsx', { result, onTry() {} });
  const body = text(html);
  assert.match(body, /Nothing fits in 5 hr/);
  assert.match(body, /Try \d+ hr/);
  assert.match(body, /Try 6 tables/);
  assert.match(body, /These run a new calculation/);
  assert.doesNotMatch(body, /Best overall|Comfortable fit|Tight fit|Fuller event/);
  assertNoInventedNumbers(html, result);
});

test('progress states never show recommendation cards', async () => {
  const states = [
    { status: 'pending', simulations: 0 },
    { status: 'running', simulations: 125 },
    { status: 'refining', simulations: 900 },
  ];
  for (const state of states) {
    const html = await render('./SmartBuilderStatus.jsx', { state, onStop() {}, onRetry() {} });
    assert.doesNotMatch(html, /sb-card|Best overall|Fuller event|Comfortable|Tight fit/);
    assert.match(html, /role="status"/);
  }
  const refining = text(await render('./SmartBuilderStatus.jsx', { state: states[2], onStop() {}, onRetry() {} }));
  assert.match(refining, /Refining recommendations…/);
  assert.match(refining, /900 simulated events so far/);
  assert.match(refining, /Stop/);
  assert.match(text(await render('./SmartBuilderStatus.jsx', { state: states[1] })), /Checking every format…/);
});

test('errors and stops offer a way to continue', async () => {
  const err = text(await render('./SmartBuilderStatus.jsx', { state: { status: 'error', error: { message: 'The Smart Builder stopped unexpectedly. Try again.' } } }));
  assert.match(err, /stopped unexpectedly\. Try again\. Try again/);
  assert.match(text(await render('./SmartBuilderStatus.jsx', { state: { status: 'stopped' } })), /Calculate again/);
  assert.match(text(await render('./SmartBuilderStatus.jsx', { state: { status: 'invalid' } })), /Fix the entries above/);
});

test('inputs show every field and the core problems', async () => {
  const body = text(await render('./SmartBuilderInputs.jsx', { form: FORM_DEFAULTS, problems: ['Tables must be a whole number of at least 1.'], onChange() {} }));
  ['Players', 'Pool tables', 'Time available (hours)', 'Entry fee ($)', 'Minutes per game'].forEach((label) => assert.ok(body.includes(label), label));
  assert.match(body, /Tables must be a whole number of at least 1\./);
});

test('the screen opens with defaults, a calculating state, the estimate warning and a way back, and starts no worker while rendering', async () => {
  let created = 0;
  const html = await render('./SmartBuilderApp.jsx', { onBack() {}, createSession: () => { created += 1; return {}; } });
  const body = text(html);
  assert.match(body, /Help me choose/);
  assert.match(body, /Nothing is saved and no tournament is created/);
  assert.match(body, /Getting ready…/);
  assert.ok(body.includes(UNCALIBRATED_NOTE));
  assert.match(body, /Back to tournament formats/);
  assert.match(html, /value="16"/);
  assert.equal(created, 0);
});
