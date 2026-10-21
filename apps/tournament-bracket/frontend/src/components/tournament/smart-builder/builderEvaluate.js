/**
 * Evaluates one candidate: plays `runs` seeded events and summarizes duration (P50 typical, P80
 * conservative), participation, table use and the engine-settled payouts. Same inputs → same result.
 */
import { simulateShowdown } from './builderSimShowdown.js';
import { simulateCashClimb } from './builderSimCashClimb.js';
import { guarantees, candidateFlags } from './builderCandidates.js';
import { percentile, seedFor } from './builderTiming.js';
import { DEFAULT_RUNS, UNCALIBRATED_NOTE } from './builderFlags.js';

const avg = (xs) => xs.reduce((t, x) => t + x, 0) / xs.length;
const CENT = 0.005;

export function simulateOnce(c, { entrants, tables, entryFee }, a, seed) {
  return c.family === 'cash-climb'
    ? simulateCashClimb({ entrants, tables, entryFee, raceTo: c.raceTo, kohRaceTo: c.kohRaceTo, seed }, a)
    : simulateShowdown({
      version: c.version, entrants, tables, entryFee,
      qualifyingRaceTo: c.qualifyingRaceTo, qualifyingGames: c.qualifyingGames, playoffRaceTo: c.playoffRaceTo, seed,
    }, a);
}

/** Run `i` of a candidate always uses the same seed, so a longer evaluation extends a shorter one. */
export const runSeed = (c, { entrants, tables, entryFee }, i) => seedFor(c.id, entrants, tables, entryFee, i);

export function evaluateCandidate(c, inputs, a, { runs = DEFAULT_RUNS } = {}) {
  return summarize(c, inputs, Array.from({ length: runs }, (_, i) => simulateOnce(c, inputs, a, runSeed(c, inputs, i))));
}

/** Metrics from simulated runs `rs` (in run order). */
export function summarize(c, { entrants, tables, entryFee }, rs) {
  const g = guarantees(c);
  const totals = rs.map((r) => r.total);
  return {
    ...c,
    runs: rs.length,
    p50: percentile(totals, 50),
    p80: percentile(totals, 80),
    calibrated: false,
    estimateNote: UNCALIBRATED_NOTE,
    guaranteedGames: g.games,
    guaranteedMatches: g.matches,
    finalRace: g.finalRace,
    flags: candidateFlags(c),
    minOpponents: avg(rs.map((r) => Math.min(...r.perPlayer.map((p) => p.opponents)))),
    avgGames: avg(rs.map((r) => avg(r.perPlayer.map((p) => p.games)))),
    breakEvenShare: avg(rs.map((r) => r.payouts.filter((x) => x >= entryFee - CENT).length / entrants)),
    cashShare: avg(rs.map((r) => r.payouts.filter((x) => x > CENT).length / entrants)),
    championShare: avg(rs.map((r) => (r.pool ? Math.max(...r.payouts) / r.pool : 0))),
    tableUse: avg(rs.map((r) => (r.total ? r.tableMin / (tables * r.total) : 0))),
    reconciled: rs.every((r) => Math.abs(r.payouts.reduce((t, x) => t + x, 0) - r.pool) < 0.01),
    guaranteesHeld: rs.every((r) => r.perPlayer.every((p) => p.matches >= g.matches && p.games >= g.games)),
  };
}
