/**
 * ANALYSIS ONLY (Task 2C). Finds every ladder tied for the minimum reference deviation, and the reference
 * each alternative tie-break would choose. Production keeps the lexicographic tie-break.
 *
 * Alternative orders (each falls back to lexicographic):
 *   growth     higher minimum adjacent growth p[i+1]/p[i]
 *   ratio      smaller maximum |p[i+1]/p[i] - 2.45|
 *   champion   higher champion fixed earnings
 * Ratios are compared as exact fractions (cross-multiplication).
 */
import { ladderSpace } from '../cashClimbV3LadderSpace.js';
import { findReferenceLadder, lowerBound, referenceDeviation } from '../cashClimbV3Reference.js';
import { championEarnings } from '../cashClimbV3Protection.js';

const EPS = 1e-6;

export function collectReferenceTies(input, limit = 1000) {
  const best = findReferenceLadder(input);
  if (best.status !== 'found') return [];
  const space = ladderSpace(input);
  const { K, counts } = space;
  const target = best.deviation.scaled;
  const targetFloat = best.deviation.dollars;
  const out = [];
  const p = new Array(K);
  const go = (i, prev, rem) => {
    if (out.length >= limit) return;
    if (i === K - 1) {
      const q = space.last(prev, rem);
      if (q === null) return;
      p[i] = q;
      if (referenceDeviation(counts, p).scaled === target) out.push([...p]);
      return;
    }
    for (const q of space.choices(i, prev, rem)) {
      p[i] = q;
      const left = rem - counts[i] * q;
      if (lowerBound(space, p, i, left) > targetFloat + EPS) continue;
      go(i + 1, q, left);
    }
  };
  go(0, 0, input.total);
  return out;
}

/** Ratio a/b as a fraction; compare(x, y) < 0 when x < y. */
const ratio = (a, b) => ({ n: a, d: b });
const compare = (x, y) => x.n * y.d - y.n * x.d;
const minGrowth = (p) => p.slice(1).map((v, i) => ratio(v, p[i])).reduce((m, r) => (compare(r, m) < 0 ? r : m));
const maxRatioGap = (p) => p.slice(1).map((v, i) => {
  const gap = { n: Math.abs(20 * v - 49 * p[i]), d: 20 * p[i] };
  return gap;
}).reduce((m, r) => (compare(r, m) > 0 ? r : m));
const lex = (a, b) => { for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };

export const TIE_BREAKS = Object.freeze({
  lexicographic: (a, b) => lex(a, b),
  growth: (a, b) => -compare(minGrowth(a), minGrowth(b)) || lex(a, b),
  ratio: (a, b) => compare(maxRatioGap(a), maxRatioGap(b)) || lex(a, b),
  champion: (a, b) => championEarnings(b) - championEarnings(a) || lex(a, b),
});

export function referenceUnder(ties, rule) {
  return [...ties].sort(TIE_BREAKS[rule])[0] || null;
}
