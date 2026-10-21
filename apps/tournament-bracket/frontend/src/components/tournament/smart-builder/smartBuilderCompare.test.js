import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from './builderRenderKit.test-support.mjs';
import { searchSync } from './builderSearch.js';
import { formatMinutes } from './builderExplain.js';
import { settingsText, formatName } from './builderNarrative.js';
import { shownOptions } from './builderRefine.js';
import { compareColumns, compareRows, bestIds } from './builderCompare.js';

const QUICK = { pass1Runs: 6, pass2Runs: 12 };
const finalFor = (raw) => ({ ...searchSync(raw, QUICK).final, status: 'final', preliminary: false });
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const result8 = finalFor({ entrants: 8, tables: 4, entryFee: 20, targetMin: 360 });

test('one column per shown option, in card order, with the same numbers the cards show', async () => {
  const rec = result8.recommendation;
  const cols = compareColumns(rec);
  assert.deepEqual(cols.map((c) => c.m.id), shownOptions(rec).map((m) => m.id));
  assert.equal(cols[0].role, 'Best overall');
  const html = await render('./SmartBuilderResults.jsx', { result: result8, onTry() {}, initialView: 'compare' });
  const body = text(html);
  assert.match(html, /<table class="sb-cmp">/);
  assert.match(html, /aria-pressed="true"[^>]*>Side by side/);
  assert.doesNotMatch(html, /class="sb-card /);
  shownOptions(rec).forEach((m) => {
    [settingsText(m), formatName(m), formatMinutes(m.p50), formatMinutes(m.p80), `${Math.round(100 * m.breakEvenShare)}%`]
      .forEach((s) => assert.ok(body.includes(s), `${m.id}: ${s}`));
  });
  assert.match(body, /Players winning back their \$20/);
  assert.match(body, /Champion's share of \$160/);
  assert.match(body, /All 99 settings checked/);
});

test('cards stay the default view and the toggle is offered', async () => {
  const html = await render('./SmartBuilderResults.jsx', { result: result8, onTry() {} });
  assert.match(html, /aria-pressed="true"[^>]*>Cards/);
  assert.match(html, /class="sb-card /);
  assert.doesNotMatch(html, /sb-cmp"/);
});

test('highlights the most of a measure, never times, and nothing when every option ties', () => {
  const options = [{ id: 'a', guaranteedGames: 6 }, { id: 'b', guaranteedGames: 9 }, { id: 'c', guaranteedGames: 9 }];
  const row = compareRows({ entrants: 8, entryFee: 20 }).find((r) => r.label === 'Guaranteed games per player');
  assert.deepEqual([...bestIds(row, options)], ['b', 'c']);
  assert.equal(bestIds(row, options.map((o) => ({ ...o, guaranteedGames: 6 }))).size, 0);
  compareRows({ entrants: 8, entryFee: 20 }).filter((r) => /finish|Cushion/.test(r.label)).forEach((r) => assert.ok(!r.best));
});

test('no entry fee: no payout rows', () => {
  const labels = compareRows({ entrants: 8, entryFee: 0 }).map((r) => r.label);
  assert.ok(!labels.some((l) => /winning|Champion's share/.test(l)));
});

test('"Use these settings" appears under each column only when offered, with the same blocked reasons', async () => {
  const rec = result8.recommendation;
  const blockedId = rec.primary.id;
  const props = { rec, inputs: result8.inputs, onUse() {}, useProblem: (m) => (m.id === blockedId ? 'Finish the open event first.' : ''), useNote: () => 'Fills in the setup screen.' };
  const html = await render('./SmartBuilderCompare.jsx', props);
  assert.equal((html.match(/Use these settings/g) || []).length, shownOptions(rec).length);
  assert.equal((html.match(/disabled=""/g) || []).length, 1);
  assert.match(html, /Finish the open event first\./);
  assert.doesNotMatch(await render('./SmartBuilderCompare.jsx', { rec, inputs: result8.inputs }), /Use these settings/);
});

test('nothing fits: no toggle and no comparison', async () => {
  const result = finalFor({ entrants: 24, tables: 4, entryFee: 20, targetMin: 300 });
  const html = await render('./SmartBuilderResults.jsx', { result, onTry() {}, initialView: 'compare' });
  assert.doesNotMatch(html, /sb-view-toggle|sb-cmp"/);
  assert.match(text(html), /Nothing fits in 5 hr/);
});
