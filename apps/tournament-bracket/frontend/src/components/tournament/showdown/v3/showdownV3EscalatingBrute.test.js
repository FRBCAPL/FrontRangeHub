/**
 * Champion-first for D10 plans by brute force, independent of the formula's own bounds code.
 *
 * The champion's total is worked out as pool − everyone else's earnings (everything goes to players at
 * completion), so the check covers the Champion Fund, unplayed games and bye credits without using them.
 * Every legal bracket pairing and every playoff score is enumerated. For qualifying, each pair of qualifier
 * ranks gets the largest possible gap in qualifying games, taken over every circle result (8 players) or over
 * every sorted result allowed by the game totals (larger fields; a superset, so the check is stricter).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildV3EscalatingPlan as buildV3Plan } from './showdownV3PlanEscalating.js';

function everyCircleResult(n, g, cb) {
  const a = new Array(n).fill(0);
  const wins = new Array(n);
  for (;;) {
    for (let i = 0; i < n; i += 1) wins[i] = a[i] + (g - a[(i + n - 1) % n]);
    cb([...wins].sort((x, y) => y - x));
    let i = 0;
    while (i < n && a[i] === g) { a[i] = 0; i += 1; }
    if (i === n) return;
    a[i] += 1;
  }
}

/** Sorted top Q+1 qualifying totals allowed by: 0..2G each, N·G games in all, the rest no higher than rank Q+1. */
function everySortedTop(n, g, Q, cb) {
  const t = new Array(Q + 1);
  const total = n * g;
  const walk = (i, max, sum) => {
    if (i > Q) {
      const rest = total - sum;
      if (rest >= 0 && rest <= (n - Q - 1) * t[Q]) cb(t);
      return;
    }
    for (let v = max; v >= 0; v -= 1) { t[i] = v; walk(i + 1, v, sum + v); }
  };
  walk(0, 2 * g, 0);
}

/** gap[j][c] = most qualifying games rank j can have above rank c (row Q: the best non-qualifier). */
function qualifyingGaps(n, g, Q) {
  const gap = Array.from({ length: Q + 1 }, () => new Array(Q).fill(-Infinity));
  const take = (top) => {
    for (let j = 0; j <= Q; j += 1) for (let c = 0; c < Q; c += 1) gap[j][c] = Math.max(gap[j][c], top[j] - top[c]);
  };
  if (n <= 8) everyCircleResult(n, g, take); else everySortedTop(n, g, Q, take);
  return gap;
}

const leaf = (i) => ({ i });
const match = (round, a, b) => ({ round, a, b });

function pairings(list) {
  if (!list.length) return [[]];
  const [first, ...rest] = list;
  return rest.flatMap((x) => pairings(rest.filter((y) => y !== x)).map((p) => [[first, x], ...p]));
}

/** Leaves are qualifier ranks (0 = top). Byes go to ranks 0..byes-1; the draw pairs everyone else at random. */
function brackets(qualifiers, byes) {
  if (qualifiers === 4) return pairings([0, 1, 2, 3]).map(([a, b]) => match('final', match('semifinal', leaf(a[0]), leaf(a[1])), match('semifinal', leaf(b[0]), leaf(b[1]))));
  const others = Array.from({ length: qualifiers - byes }, (_, i) => byes + i);
  const out = [];
  for (const pairs of pairings(others)) {
    const slots = [...Array.from({ length: byes }, (_, i) => leaf(i)), ...pairs.map(([a, b]) => match('quarterfinal', leaf(a), leaf(b)))];
    for (const [[a, b], [c, d]] of pairings(slots.map((_, i) => i))) {
      out.push(match('final', match('semifinal', slots[a], slots[b]), match('semifinal', slots[c], slots[d])));
    }
  }
  return out;
}

/** Every result of a subtree: who comes out and what each rank earned in it. */
function outcomes(node, plan, size) {
  if (!node.round) return [{ winner: node.i, adds: new Array(size).fill(0) }];
  const k = plan.playoffRaceTo;
  const rate = plan.rates.byRound[node.round];
  const out = [];
  for (const A of outcomes(node.a, plan, size)) for (const B of outcomes(node.b, plan, size)) {
    for (const [w, l] of [[A.winner, B.winner], [B.winner, A.winner]]) {
      for (let s = 0; s < k; s += 1) {
        const adds = A.adds.map((v, j) => v + B.adds[j]);
        adds[w] += k * rate;
        adds[l] += s * rate;
        out.push({ winner: w, adds });
      }
    }
  }
  return out;
}

/** Smallest (champion − best other player) over every qualifying gap, pairing and playoff score. */
function bruteChampionMargin(plan) {
  const { entrants: n, qualifyingGames: g, qualifiers: Q, byes: B, poolCents: pool, byeCreditCents: credit } = plan;
  const q = plan.rates.r1;
  const k = plan.playoffRaceTo;
  const finalRate = plan.rates.byRound.final;
  const gap = qualifyingGaps(n, g, Q);
  const bye = (j) => (j < B ? credit : 0);
  let worst = Infinity;
  for (const root of brackets(Q, B)) {
    const left = outcomes(root.a, plan, Q);
    const right = outcomes(root.b, plan, Q);
    for (const A of left) for (const R of right) {
      for (const [c, l] of [[A.winner, R.winner], [R.winner, A.winner]]) {
        for (let s = 0; s < k; s += 1) {
          const adds = A.adds.map((v, j) => v + R.adds[j]);
          adds[c] += k * finalRate;
          adds[l] += s * finalRate;
          let others = (B - (c < B ? 1 : 0)) * credit;
          let best = gap[Q][c] * q;
          for (let j = 0; j < Q; j += 1) {
            if (j === c) continue;
            others += adds[j];
            best = Math.max(best, adds[j] + bye(j) + gap[j][c] * q);
          }
          // champion − best = (pool − all qualifying + champion's qualifying − others) − (best's qualifying + playoffs)
          const margin = pool - n * g * q - others - best;
          if (margin < worst) worst = margin;
        }
      }
    }
  }
  return worst;
}

const CASES = [
  { n: 8, g: 3, races: [3, 5, 9], fees: [20, 250] },
  { n: 8, g: 4, races: [4, 7], fees: [20, 37] },
  { n: 11, g: 3, races: [3, 6], fees: [20, 100] },
  { n: 12, g: 3, races: [3, 5, 7], fees: [20, 100] },
  { n: 13, g: 5, races: [3, 5], fees: [25, 250] },
  { n: 14, g: 3, races: [3, 4], fees: [20, 100] },
  { n: 15, g: 7, races: [3], fees: [20, 60] },
  { n: 16, g: 3, races: [3], fees: [20, 60] },
  { n: 17, g: 3, races: [3], fees: [20] },
];

describe('D10 champion-first by brute force (every pairing and score; bye credits and the Champion Fund included)', () => {
  for (const { n, g, races, fees } of CASES) {
    for (const k of races) {
      for (const fee of fees) {
        it(`${n} players, ${g}-game matches, race to ${k}, $${fee}`, () => {
          const plan = buildV3Plan({ entrants: n, entryFee: fee, qualifyingGames: g, playoffRaceTo: k });
          const worst = bruteChampionMargin(plan);
          assert.ok(worst > 0, `the champion can finish behind someone: ${worst}`);
          assert.ok(worst >= plan.guarantees.margins.championCents, `brute ${worst} < plan ${plan.guarantees.margins.championCents}`);
        });
      }
    }
  }

  it('the search finds a violation when one exists (bye credit or semifinal rate raised past the fund)', () => {
    const plan = buildV3Plan({ entrants: 12, entryFee: 20, qualifyingGames: 3, playoffRaceTo: 5 });
    assert.ok(bruteChampionMargin(plan) > 0);
    assert.ok(bruteChampionMargin({ ...plan, byeCreditCents: plan.byeCreditCents + 1000 }) < 0);
    const semifinal = plan.rates.byRound.semifinal * 3;
    assert.ok(bruteChampionMargin({ ...plan, rates: { ...plan.rates, byRound: { ...plan.rates.byRound, semifinal } } }) < 0);
  });

  it('covers every playoff layout with byes (3, 2 and 1 bye) and without', () => {
    const layouts = new Set(CASES.map(({ n, g, races, fees }) => buildV3Plan({ entrants: n, entryFee: fees[0], qualifyingGames: g, playoffRaceTo: races[0] }).templateId));
    for (const id of ['p4', 'p5', 'p6', 'p7']) assert.ok(layouts.has(id), id);
  });
});
