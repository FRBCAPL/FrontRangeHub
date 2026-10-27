/**
 * TEST-ONLY independent oracle for the Cash Climb V3 optimizer. Shares no search code with production:
 * it enumerates every ladder directly, measures the reference deviation with exact BigInt fractions via
 * the weighted median (production uses the minimum over breakpoints), and sorts candidates by the stated
 * priorities. Exponential; use for small budgets only.
 */
const gcd = (a, b) => { let x = a < 0n ? -a : a; let y = b; while (y) [x, y] = [y, x % y]; return x; };
const frac = (n, d = 1n) => { const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
const add = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
const sub = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
const mul = (a, b) => frac(a.n * b.n, a.d * b.d);
const cmp = (a, b) => { const l = a.n * b.d; const r = b.n * a.d; return l < r ? -1 : l > r ? 1 : 0; };
const abs = (a) => (a.n < 0n ? { n: -a.n, d: a.d } : a);
const gPow = (i) => (i >= 0 ? frac(49n ** BigInt(i), 20n ** BigInt(i)) : frac(20n ** BigInt(-i), 49n ** BigInt(-i)));

/** Exact D(p) = min_a sum c_i |p_i - a g^i| as a fraction, via the weighted median of p_i / g^i. */
export function bruteDeviation(counts, p) {
  const pts = p.map((v, i) => ({ x: mul(frac(BigInt(v)), gPow(-i)), w: mul(frac(BigInt(counts[i])), gPow(i)) }));
  pts.sort((a, b) => cmp(a.x, b.x));
  const total = pts.reduce((s, t) => add(s, t.w), frac(0n));
  let run = frac(0n);
  let med = pts[0].x;
  for (const t of pts) {
    run = add(run, t.w);
    if (cmp(mul(run, frac(2n)), total) >= 0) { med = t.x; break; }
  }
  return pts.reduce((s, t) => add(s, mul(t.w, abs(sub(t.x, med)))), frac(0n));
}

function allLadders({ counts, total, minFirst, ceiling }) {
  const out = [];
  const K = counts.length;
  const fits = (prev, next) => BigInt(next) * 10000n <= BigInt(ceiling.units) * BigInt(prev);
  const walk = (i, prev, spent, acc) => {
    if (i === K) { if (spent === total) out.push(acc); return; }
    for (let q = i === 0 ? minFirst : prev + 1; spent + counts[i] * q <= total; q += 1) {
      if (i > 0 && !fits(prev, q)) break;
      walk(i + 1, q, spent + counts[i] * q, [...acc, q]);
    }
  };
  walk(0, 0, 0, []);
  return out;
}

const lex = (a, b) => { for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return a[i] - b[i]; return 0; };
const champion = (p) => p.slice(0, -1).reduce((s, v) => s + v, 0) + Math.round((4 * p[p.length - 1]) / 5);
const cumulative = (p) => p.slice(0, -1).map((_, j) => p.slice(0, j + 1).reduce((s, v) => s + v, 0));

/** Production rule: p[i+1] / p[i] >= (num / den) x ref[i+1] / ref[i] at every transition. */
export const BRUTE_RETENTION = Object.freeze({ num: 9n, den: 10n });
const keepsGrowth = (p, ref, { num, den }) => p.every((v, i) => i === 0
  || den * BigInt(v) * BigInt(ref[i - 1]) >= num * BigInt(p[i - 1]) * BigInt(ref[i]));

/**
 * `retention` { num, den } (BigInt) is the growth-retention rule; production uses BRUTE_RETENTION and
 * analysis may pass null to drop it. Analysis-only options: `growthFloor` { num, den } restricts the
 * optimized candidates to p[i+1] den >= num p[i]; `accept(p, reference)` is any further predicate.
 */
export function bruteForceSelect(input, { retention = BRUTE_RETENTION, growthFloor = null, accept = null } = {}) {
  const ladders = allLadders(input);
  if (!ladders.length) return { status: 'none', ladderCount: 0 };
  const scored = ladders.map((p) => ({ p, dev: bruteDeviation(input.counts, p) }));
  scored.sort((a, b) => cmp(a.dev, b.dev) || lex(a.p, b.p));
  const reference = scored[0].p;
  const tiedReferences = scored.filter((s) => cmp(s.dev, scored[0].dev) === 0).map((s) => s.p);
  const referenceTies = tiedReferences.length;
  const hr = champion(reference);
  const cr = cumulative(reference);
  const grows = (p) => !growthFloor || p.every((v, i) => i === 0 || v * growthFloor.den >= growthFloor.num * p[i - 1]);
  const ok = ladders.filter((p) => p[0] >= reference[0]
    && grows(p)
    && (!retention || keepsGrowth(p, reference, retention))
    && (!accept || accept(p, reference))
    && champion(p) * 100 >= hr * 99
    && cumulative(p).every((c, j) => c * 100 >= cr[j] * 98));
  const key = (p) => ({ p, h: champion(p), d: p.reduce((s, v, i) => s + input.counts[i] * Math.abs(v - reference[i]), 0) });
  const ranked = ok.map(key).sort((a, b) => b.p[0] - a.p[0] || b.h - a.h || a.d - b.d || lex(a.p, b.p));
  const top = ranked[0];
  if (!top) return { status: 'infeasible', ladderCount: ladders.length, reference, referenceTies, ladder: null, optimizedTies: 0 };
  const optimizedTies = ranked.filter((r) => r.p[0] === top.p[0] && r.h === top.h && r.d === top.d).length;
  return { status: 'found', ladderCount: ladders.length, reference, referenceTies, tiedReferences, ladder: top.p, optimizedTies };
}
