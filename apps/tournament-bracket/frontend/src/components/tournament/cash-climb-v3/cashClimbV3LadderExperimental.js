/**
 * EXPERIMENTAL later-round ladder optimizer. Not approved for production payouts.
 *
 * Aims each stage at a geometric progression with growth g = min(2.45, r) fitted to the remaining
 * budget, then uses the exact search to land on a ladder that meets every mandatory constraint. It does
 * not apply the ceil(0.30 E) first-win preference or the 99% / 98% reference protections, because the
 * reference objective is not yet defined.
 */
import { searchLadder } from './cashClimbV3LadderSearch.js';

export const EXPERIMENTAL_GEOMETRIC_OPTIMIZER = Object.freeze({
  id: 'experimental-geometric-2026-10',
  experimental: true,
  solve({ counts, total, minFirst, ceiling, referenceGrowth }) {
    const g = Math.min(referenceGrowth, ceiling.value);
    const weight = counts.map((_, i) => counts.slice(i).reduce((s, c, j) => s + c * g ** j, 0));
    const ideal = (i, remaining) => remaining / weight[i];
    const r = searchLadder({ counts, total, minFirst, ceiling, ideal });
    return r.status === 'found' ? r.ladder : null;
  },
});
