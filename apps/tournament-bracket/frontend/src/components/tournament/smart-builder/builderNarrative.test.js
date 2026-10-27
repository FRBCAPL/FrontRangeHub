import test from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from './builderRank.js';
import {
  tradeoffSentence, whyRecommended, nothingFitsAdvice, formatCoverage, payoutLines, slackText, settingsText, FAR_OVER_MIN,
} from './builderNarrative.js';

const T = 360;
const cc = (over) => ({
  family: 'cash-climb', id: 'cc', raceTo: 1, kohRaceTo: 1, p50: 260, p80: 277, guaranteedGames: 3, guaranteedMatches: 3,
  finalRace: 1, minOpponents: 3, breakEvenShare: 0.3, cashShare: 0.83, championShare: 0.26, tableUse: 0.6, flags: [], refined: true, ...over,
});

test('the fuller-event trade-off is one plain sentence about the championship and the cushion', () => {
  const rec = recommend([cc({ id: 'cc-1-1' }), cc({ id: 'cc-1-2', kohRaceTo: 2, finalRace: 2, p80: 350 })], T);
  assert.equal(rec.fullerEvent.id, 'cc-1-2');
  assert.equal(
    tradeoffSentence(rec.primary, rec.fullerEvent),
    'Cash Climb King of the Hill race 1 / KOH 2 offers a longer championship race (race to 2 instead of 1), but takes about 1 hr 13 min longer, leaving only 10 min of cushion.',
  );
});

test('trade-offs cover more play, fewer winners, earlier finishes and running over', () => {
  const [base] = recommend([cc({ p80: 300 })], T).rows;
  const [v3] = recommend([{ ...cc(), family: 'showdown', version: 3, qualifyingGames: 6, playoffRaceTo: 3, guaranteedGames: 12, guaranteedMatches: 2, finalRace: 3, breakEvenShare: 0.2, p80: 250 }], T).rows;
  assert.equal(tradeoffSentence(base, v3),
    'Showdown V3 (6 games / race 3) offers 9 more guaranteed games per player, a longer championship race (race to 3 instead of 1) and an earlier finish (about 50 min sooner), but has 1 fewer guaranteed match and has fewer players winning back their entry fee (20% instead of 30%).');
  const [over] = recommend([cc({ kohRaceTo: 3, finalRace: 3, p80: 380 })], T).rows;
  assert.match(tradeoffSentence(base, over), /takes about 1 hr 20 min longer and runs about 20 min past your time limit\.$/);
  assert.match(tradeoffSentence(base, base), /about the same/);
});

test('why the primary was chosen: fit, what it leads on, and that shorter is not automatically better', () => {
  const rec = recommend([
    cc({ id: 'short', p80: 200, guaranteedGames: 3 }),
    cc({ id: 'full', family: 'showdown', version: 1, qualifyingRaceTo: 3, playoffRaceTo: 5, p80: 320, guaranteedGames: 6, finalRace: 5, guaranteedMatches: 2 }),
  ], T);
  assert.equal(rec.primary.id, 'full');
  const why = whyRecommended(rec);
  assert.equal(why[0], 'It fits with room to spare: even the conservative estimate leaves 40 min before your time limit.');
  assert.match(why[1], /^Compared with the other 1 option that fit comfortably, it has the most guaranteed games per player, the longest championship race/);
  assert.match(why[2], /^Cash Climb King of the Hill race 1 \/ KOH 1 would finish about 2 hr sooner, but it scores lower/);
  const tightOnly = recommend([cc({ p80: 345 })], T);
  assert.match(whyRecommended(tightOnly)[0], /^Nothing fits with a 30-minute cushion/);
  assert.equal(whyRecommended(tightOnly)[1], 'It is the only option that would fit.');
});

test('nothing fits: the quickest closely measured option, or "far over" when none was measured closely', () => {
  const rows = [cc({ id: 'a', p80: 400 }), cc({ id: 'b', p80: 372 }), cc({ id: 'c', p80: 300, refined: false, earlyStop: true })];
  const near = nothingFitsAdvice({ recommendation: recommend(rows.slice(0, 2), T), inputs: { targetMin: T } });
  assert.equal(near.quickest.id, 'b');
  assert.equal(near.extraMin, 12);
  assert.equal(near.tryMin, 375);
  const far = nothingFitsAdvice({ recommendation: recommend([cc({ p80: 500, refined: false, earlyStop: true })], T), inputs: { targetMin: T } });
  assert.deepEqual([far.allFarOver, far.quickest, far.tryMin], [true, null, 420]);
  assert.equal(FAR_OVER_MIN, 45);
});

test('every format is accounted for: shown, over, or not allowed with the engine reason', () => {
  const v1 = { family: 'showdown', version: 1, id: 'v1' };
  const result = {
    evaluated: [cc({ id: 'cc-1-1' }), { ...cc(), ...v1 }],
    skipped: [{ candidate: { family: 'showdown', version: 3, id: 'v3-9-9' } }],
    ineligible: [{ candidate: { family: 'showdown', version: 2, id: 'v2' }, problems: ['Showdown needs at least 8 players.'] }],
  };
  assert.deepEqual(formatCoverage(result, [cc({ id: 'cc-1-1' })]), [
    { family: 'Cash Climb King of the Hill', status: 'shown' },
    { family: 'Showdown V1', status: 'over', reason: 'No setting of this format fits your time limit.' },
    { family: 'Showdown V2', status: 'ineligible', reason: 'Showdown needs at least 8 players.' },
    { family: 'Showdown V3', status: 'over', reason: 'No setting of this format fits your time limit.' },
  ]);
});

test('payout, slack and settings lines only restate Builder values and the operator inputs', () => {
  assert.deepEqual(payoutLines(cc(), { entrants: 16, entryFee: 20 }), [
    '30% of players win back at least their $20 entry fee.',
    '83% of players win some money.',
    'The champion takes about 26% of the $320 prize pool (about $83).',
  ]);
  assert.deepEqual(payoutLines(cc(), { entrants: 16, entryFee: 0 }), ['No entry fee, so there is no prize pool.']);
  assert.equal(slackText({ marginMin: 83.3 }), 'Leaves about 1 hr 23 min before your time limit (conservative estimate).');
  assert.equal(slackText({ marginMin: -12 }), 'Runs about 12 min past your time limit (conservative estimate).');
  assert.equal(settingsText(cc({ kohRaceTo: 2 })), 'Round robin race to 1 \u00b7 King of the Hill race to 2');
});
