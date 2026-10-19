import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { circleMatches } from '../showdownQualifying.js';
import { v3RoundLabels, v3RoundLabelProblems } from './showdownV3Rounds.js';
import {
  v3QualifyingScoreProblem, v3PlayoffScoreProblem, v3PartialScoreProblem, v3PlayedResult, v3ForfeitResult,
} from './showdownV3Results.js';
import { v3CreditGames, v3Credits } from './showdownV3Credits.js';
import { v3QualifyingLedger } from './showdownV3Qualifying.js';
import { buildV3Plan } from './showdownV3Plan.js';
import { ids } from './showdownV3TestKit.js';

const NOW = 'now';

describe('V3 Round 1 / Round 2 labels', () => {
  for (let n = 3; n <= 31; n += 1) {
    it(`${n} players: one Round 1 and one Round 2 match each${n % 2 ? ', bridge on the last slot' : ''}`, () => {
      const matches = circleMatches(ids(n));
      const labels = v3RoundLabels(matches);
      assert.deepEqual(v3RoundLabelProblems(matches, labels), []);
      assert.equal(Object.values(labels).filter((l) => l.bridge).length, n % 2);
      if (n % 2) assert.deepEqual(labels[`q${n}`], { p1Round: 1, p2Round: 2, bridge: true });
    });
  }

  it('labels are fixed by slot, not by the order matches are played', () => {
    const matches = circleMatches(ids(9));
    const before = v3RoundLabels(matches);
    const played = matches.map((m) => v3PlayedResult(m, 4, 3, { games: 7 }, NOW)).reverse();
    assert.deepEqual(v3RoundLabels([...played].reverse()), before);
  });
});

describe('V3 score rules', () => {
  it('qualifying: every game played, ties allowed', () => {
    assert.equal(v3QualifyingScoreProblem(4, 3, 7), '');
    assert.equal(v3QualifyingScoreProblem(3, 3, 6), '');
    assert.equal(v3QualifyingScoreProblem(0, 7, 7), '');
    assert.match(v3QualifyingScoreProblem(4, 2, 7), /add up to 7/);
    assert.match(v3QualifyingScoreProblem(-1, 8, 7), /whole numbers/);
    const tie = v3PlayedResult(circleMatches(ids(8))[0], 3, 3, { games: 6 }, NOW);
    assert.equal(tie.winnerId, null);
    assert.equal(tie.result, 'played');
  });

  it('playoffs: a race to k for every k from 3 to 9', () => {
    for (let k = 3; k <= 9; k += 1) {
      assert.equal(v3PlayoffScoreProblem(k, k - 1, k), '');
      assert.equal(v3PlayoffScoreProblem(0, k, k), '');
      assert.ok(v3PlayoffScoreProblem(k, k, k));
      assert.ok(v3PlayoffScoreProblem(k - 1, k - 2, k));
      assert.ok(v3PlayoffScoreProblem(k + 1, 0, k));
    }
  });

  it('unfinished matches keep the games actually played', () => {
    assert.equal(v3PartialScoreProblem(2, 3, { phase: 'qualifying', games: 7 }), '');
    assert.ok(v3PartialScoreProblem(4, 3, { phase: 'qualifying', games: 7 }));
    assert.equal(v3PartialScoreProblem(4, 4, { phase: 'playoff', raceTo: 5 }), '');
    assert.ok(v3PartialScoreProblem(5, 1, { phase: 'playoff', raceTo: 5 }));
    const m = circleMatches(ids(8))[0];
    const f = v3ForfeitResult(m, [m.p1], 2, 1, { games: 7 }, NOW);
    assert.deepEqual([f.result, f.score1, f.score2, f.winnerId, f.loserId], ['forfeit', 2, 1, m.p2, m.p1]);
    const d = v3ForfeitResult(m, [m.p1, m.p2], 1, 1, { games: 7 }, NOW);
    assert.deepEqual([d.result, d.winnerId], ['double-forfeit', null]);
  });
});

describe('V3 forfeit credits', () => {
  it('own win rate, half up, capped at the unplayed games, 50% with no games played', () => {
    assert.equal(v3CreditGames(5, 3, 6), 3); // 2.5 → 3 (half up)
    assert.equal(v3CreditGames(4, 1, 6), 1); // 0.67 → 1
    assert.equal(v3CreditGames(4, 0, 6), 0);
    assert.equal(v3CreditGames(4, 6, 6), 4);
    assert.equal(v3CreditGames(7, 0, 0), 4); // 3.5 → 4
    assert.equal(v3CreditGames(6, 0, 0), 3);
    assert.equal(v3CreditGames(0, 3, 3), 0);
  });

  it('every partial score at 5–15 games, both sides of normal and bridge matches, stays within budget', () => {
    let cases = 0;
    for (let g = 5; g <= 15; g += 1) for (const gap of [50, 100]) {
      const base = buildV3Plan({ entrants: 9, entryFee: 200, qualifyingGames: g, playoffRaceTo: 5 });
      const plan = { ...base, rates: { r1: 150, r2: 150 + gap, playoff: 150 + gap } };
      const matches = circleMatches(ids(9));
      for (const slot of [0, 1, 8]) for (const quitter of ['p1', 'p2']) {
        for (let a = 0; a < g; a += 1) for (let b = 0; a + b < g; b += 1) {
          const ms = matches.map((m, i) => (i === slot ? v3ForfeitResult(m, [m[quitter]], a, b, { games: g }, NOW) : m));
          const ledger = v3QualifyingLedger(plan, ids(9), ms);
          const check = ledger.matches[0];
          assert.ok(check.withinBudget, `g=${g} slot=${slot} ${a}-${b}`);
          const credit = ledger.credits[0];
          assert.ok(credit.games <= g - a - b);
          assert.equal(credit.provisional, true);
          cases += 1;
        }
      }
    }
    assert.equal(cases, 7920);
  });

  it('actual wins and credits are tracked separately, credits use the recipient\u2019s other match too', () => {
    const plan = buildV3Plan({ entrants: 8, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 5 });
    const ms = circleMatches(ids(8));
    // P2 plays q2 (Round 2) 6–1, then P1 quits q1 (Round 1) at 1–1: P2 rate = 7/9, credit round(5 × 7/9) = 4.
    ms[1] = v3PlayedResult(ms[1], 6, 1, { games: 7 }, NOW);
    ms[0] = v3ForfeitResult(ms[0], ['P1'], 1, 1, { games: 7 }, NOW);
    const ledger = v3QualifyingLedger(plan, ids(8), ms, { final: true });
    const p2 = ledger.rows.P2;
    assert.equal(p2.actualWins, 7);
    assert.equal(p2.actualRound2Wins, 6);
    assert.equal(p2.creditWins, 4);
    assert.equal(p2.creditCents, 4 * plan.rates.r1);
    assert.equal(p2.actualCents, plan.rates.r1 + 6 * plan.rates.r2);
    assert.equal(ledger.rows.P1.actualCents, plan.rates.r1, 'the quitter keeps the game they won');
    assert.equal(ledger.credits[0].provisional, false);
  });

  it('credits stay when the recipient later withdraws; double forfeits give none', () => {
    const ms = circleMatches(ids(8));
    ms[0] = v3ForfeitResult(ms[0], ['P1'], 0, 0, { games: 7 }, NOW);
    ms[1] = v3ForfeitResult(ms[1], ['P2'], 0, 0, { games: 7 }, NOW);
    ms[2] = v3ForfeitResult(ms[2], ['P3', 'P4'], 2, 1, { games: 7 }, NOW);
    const credits = v3Credits(ms, 7, { final: true });
    assert.equal(credits.length, 2);
    assert.deepEqual(credits.find((c) => c.matchId === 'q1'), {
      matchId: 'q1', playerId: 'P2', forfeitedBy: 'P1', unplayed: 7, rate: { wins: 0, played: 0, fallback: true }, games: 4, provisional: false,
    });
  });

  it('bridge forfeits pay each side at its own fixed round rate', () => {
    const plan = buildV3Plan({ entrants: 9, entryFee: 50, qualifyingGames: 7, playoffRaceTo: 5 });
    const ms = circleMatches(ids(9));
    ms[8] = v3ForfeitResult(ms[8], ['P1'], 2, 0, { games: 7 }, NOW); // bridge: P9 Round 1, P1 Round 2
    const ledger = v3QualifyingLedger(plan, ids(9), ms);
    assert.equal(ledger.rows.P9.actualCents, 2 * plan.rates.r1);
    assert.equal(ledger.credits[0].round, 1);
    assert.equal(ledger.rows.P9.creditCents, ledger.credits[0].games * plan.rates.r1);
  });
});
