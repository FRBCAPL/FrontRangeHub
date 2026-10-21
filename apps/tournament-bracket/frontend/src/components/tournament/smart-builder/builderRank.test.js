import test from 'node:test';
import assert from 'node:assert/strict';
import { fitClass, isBorderline, recommend, meaningfulGain, score } from './builderRank.js';
import { fitLabel, warnings, tradeoff, formatMinutes } from './builderExplain.js';
import { candidateFlags } from './builderCandidates.js';

const T = 360;

const metric = (over) => ({
  id: 'x', family: 'cash-climb', label: 'x', p50: 0, p80: 0,
  guaranteedGames: 3, guaranteedMatches: 3, finalRace: 2, minOpponents: 3,
  breakEvenShare: 0.3, cashShare: 0.5, championShare: 0.3, tableUse: 0.7, flags: [],
  ...over,
});

test('fit classes at the exact P80 boundaries', () => {
  assert.equal(fitClass(330, T), 'comfortable');
  assert.equal(fitClass(330.01, T), 'tight');
  assert.equal(fitClass(331, T), 'tight');
  assert.equal(fitClass(360, T), 'tight');
  assert.equal(fitClass(360.01, T), 'close');
  assert.equal(fitClass(361, T), 'close');
  assert.equal(fitClass(390, T), 'close');
  assert.equal(fitClass(390.01, T), 'over');
  assert.equal(fitClass(391, T), 'over');
  assert.equal(fitClass(0, T), 'comfortable');
});

test('borderline is within 5 minutes of any class boundary', () => {
  [325, 330, 335, 355, 360, 365, 385, 390, 395].forEach((p) => assert.equal(isBorderline(p, T), true, String(p)));
  [324, 336, 345, 354, 366, 375, 384, 396].forEach((p) => assert.equal(isBorderline(p, T), false, String(p)));
});

test('the primary pick is never Close or Over, and nothing fitting means no primary', () => {
  const r = recommend([metric({ id: 'a', p80: 370 }), metric({ id: 'b', p80: 420 })], T);
  assert.equal(r.primary, null);
  assert.equal(r.nothingFits, true);
  assert.equal(r.fullerEvent, null);
  assert.deepEqual(r.alternatives, []);
  assert.deepEqual(r.close.map((m) => m.id), ['a']);
  assert.deepEqual(r.rows.map((m) => m.fit), ['close', 'over']);
});

test('a Tight option is the primary only when nothing is Comfortable', () => {
  const r = recommend([metric({ id: 'tight', p80: 350 }), metric({ id: 'close', p80: 365, guaranteedGames: 20 })], T);
  assert.equal(r.primary.id, 'tight');
  assert.equal(r.primary.fit, 'tight');
  assert.ok(warnings(r.primary).some((w) => w.startsWith('Little room')));
  assert.equal(r.fullerEvent, null);
});

test('Comfortable is preferred over a higher-scoring Tight option, which is shown as the fuller event', () => {
  const comfy = metric({ id: 'comfy', p80: 280, finalRace: 1 });
  const tight = metric({ id: 'tight', p80: 350, finalRace: 2 });
  assert.ok(score(tight) > score(comfy));
  const r = recommend([tight, comfy], T);
  assert.equal(r.primary.id, 'comfy');
  assert.equal(r.fullerEvent.id, 'tight');
  assert.match(tradeoff(r.primary, r.fullerEvent), /championship race 1 \u2192 2/);
});

test('the fuller-event card needs a meaningful gain', () => {
  const comfy = metric({ id: 'comfy', p80: 280 });
  const small = metric({ id: 'small', p80: 350, guaranteedGames: 4, tableUse: 1 });
  assert.equal(meaningfulGain(small, comfy), false);
  assert.equal(recommend([comfy, small], T).fullerEvent, null);
  assert.equal(meaningfulGain(metric({ guaranteedGames: 5 }), comfy), true);
  assert.equal(meaningfulGain(metric({ guaranteedMatches: 4 }), comfy), true);
  assert.equal(meaningfulGain(metric({ finalRace: 3 }), comfy), true);
});

test('duration earns nothing inside a class, so the shortest option is not picked by default', () => {
  const short = metric({ id: 'short', p80: 120, guaranteedGames: 3 });
  const fuller = metric({ id: 'fuller', p80: 320, guaranteedGames: 9 });
  assert.equal(recommend([short, fuller], T).primary.id, 'fuller');
  assert.equal(score({ ...short, p80: 1 }), score(short));
});

test('alternatives are the best fitting option of each other family; Close options are never alternatives', () => {
  const rows = [
    metric({ id: 'cc', p80: 250 }),
    metric({ id: 'v1', family: 'showdown', version: 1, p80: 340 }),
    metric({ id: 'v3a', family: 'showdown', version: 3, p80: 300, guaranteedGames: 10 }),
    metric({ id: 'v3b', family: 'showdown', version: 3, p80: 310, guaranteedGames: 12 }),
    metric({ id: 'v2', family: 'showdown', version: 2, p80: 365 }),
  ];
  const r = recommend(rows, T);
  assert.equal(r.primary.id, 'v3b');
  assert.deepEqual(r.alternatives.map((m) => m.id).sort(), ['cc', 'v1']);
  assert.deepEqual(r.close.map((m) => m.id), ['v2']);
});

test('labels say estimate, flag borderline and never call Close a fit', () => {
  const [close] = recommend([metric({ p80: 362 })], T).rows;
  assert.equal(fitLabel(close), 'Close: about 2 min over \u00b7 borderline (estimate)');
  const [tight] = recommend([metric({ p80: 345 })], T).rows;
  assert.equal(fitLabel(tight), 'Fits, with little room (15 min to spare) (estimate)');
  assert.equal(formatMinutes(359.6), '6 hr');
  assert.equal(formatMinutes(344), '5 hr 44 min');
});

test('King of the Hill race 1 is labelled a short championship but stays eligible', () => {
  assert.deepEqual(candidateFlags({ family: 'cash-climb', raceTo: 1, kohRaceTo: 1 }).map((f) => f.key), ['short-championship']);
  assert.deepEqual(candidateFlags({ family: 'cash-climb', raceTo: 1, kohRaceTo: 2 }), []);
  const m = metric({ p80: 200, flags: candidateFlags({ family: 'cash-climb', kohRaceTo: 1 }) });
  assert.equal(recommend([m], T).primary.id, 'x');
  assert.ok(warnings(recommend([m], T).primary).includes('Short championship: King of the Hill race 1'));
});
