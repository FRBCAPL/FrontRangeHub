/**
 * Plays one original Cash Climb event in memory through the real engine with a simulated clock. The engine
 * pairs every round, gives byes, starts King of the Hill and settles every payout. Within a round, matches
 * roll onto free tables; the next round waits for the whole round plus a transition allowance. No chop is
 * taken (the longest ending). Nothing is saved anywhere.
 */
import {
  createOpenTournament, startTournament, getCurrentRound, getRoundMatches, recordMatchResult,
  roundReadyToContinue, continueCashClimb,
} from '../cash-climb/cashClimbEngine.js';
import { makeSkills, playMatch, seededRandom } from './builderTiming.js';

const isKoh = (round) => round?.round_number >= 999;

/**
 * The Cash Climb engine shuffles with Math.random. For repeatable runs it is swapped for a seeded generator
 * for the length of this synchronous call only, and always restored.
 */
export function withSeededMathRandom(random, fn) {
  const original = Math.random;
  Math.random = random;
  try {
    return fn();
  } finally {
    Math.random = original;
  }
}

/**
 * The engine stamps results with new Date() and later picks "the last King of the Hill match" by that stamp.
 * A simulation records many results in the same millisecond, so the clock is swapped (same synchronous
 * scope, always restored) for one that moves forward one second per reading: later results stay later.
 */
export function withSimulatedClock(fn, startMs = Date.UTC(2026, 0, 1, 18, 0, 0)) {
  const RealDate = Date;
  let ticks = 0;
  const now = () => startMs + 1000 * (ticks += 1);
  class SimDate extends RealDate {
    constructor(...args) {
      if (args.length) super(...args); else super(now());
    }

    static now() { return now(); }
  }
  globalThis.Date = SimDate;
  try {
    return fn();
  } finally {
    globalThis.Date = RealDate;
  }
}

export function simulateCashClimb({ entrants, tables, entryFee, raceTo, kohRaceTo, seed }, a) {
  const random = seededRandom(seed);
  const engineRandom = seededRandom(seed ^ 0x9e3779b9);
  return withSimulatedClock(() => withSeededMathRandom(engineRandom, () => play({ entrants, tables, entryFee, raceTo, kohRaceTo }, a, random)));
}

function play({ entrants, tables, entryFee, raceTo, kohRaceTo }, a, random) {
  const players = Array.from({ length: entrants }, (_, i) => ({ id: `P${i + 1}`, name: `Player ${i + 1}` }));
  const skills = makeSkills(players.map((p) => p.id), a, random);
  let s = startTournament(createOpenTournament({ players, entryFee, raceTo, kohRaceTo, tableCount: tables, gameType: '8-Ball' }));
  let clock = 0;
  const out = { rrRounds: 0, kohMatches: 0, kohStart: null, games: 0, tableMin: 0 };
  const per = Object.fromEntries(players.map((p) => [p.id, { matches: 0, games: 0, opponents: new Set() }]));

  for (let guard = 0; guard < 400 && s.status !== 'completed'; guard += 1) {
    const round = getCurrentRound(s);
    if (!round) break;
    const koh = isKoh(round);
    if (koh && out.kohStart === null) out.kohStart = clock;
    const pending = getRoundMatches(s, round.id).filter((m) => m.status === 'pending');
    pending.filter((m) => m.is_bye || !m.player2_id).forEach((m) => { s = recordMatchResult(s, m.id, m.player1_id); });
    const free = Array.from({ length: koh ? 1 : tables }, () => clock);
    const done = pending.filter((m) => !m.is_bye && m.player2_id).map((m) => {
      const t = free.indexOf(Math.min(...free));
      const r = playMatch({ p1: m.player1_id, p2: m.player2_id, raceTo: koh ? kohRaceTo : raceTo }, skills, a, random);
      free[t] += r.minutes;
      return { m, r, end: free[t] };
    }).sort((x, y) => x.end - y.end);
    done.forEach(({ m, r }) => {
      s = recordMatchResult(s, m.id, r.s1 > r.s2 ? m.player1_id : m.player2_id, `${r.s1}-${r.s2}`);
      out.games += r.s1 + r.s2;
      out.tableMin += r.minutes;
      [[m.player1_id, m.player2_id], [m.player2_id, m.player1_id]].forEach(([me, opp]) => {
        per[me].matches += 1; per[me].games += r.s1 + r.s2; per[me].opponents.add(opp);
      });
    });
    clock = Math.max(clock, ...done.map((d) => d.end));
    if (koh) out.kohMatches += done.length; else out.rrRounds += 1;
    if (s.status === 'completed') break;
    if (!roundReadyToContinue(s)) throw new Error('Cash Climb simulation: a round did not finish.');
    if (!koh) clock += a.roundTransitionMin;
    s = continueCashClimb(s);
  }
  if (s.status !== 'completed') throw new Error('Cash Climb simulation did not finish.');
  const paid = Object.fromEntries((s.stats || []).map((p) => [p.player_id, p.total_payout || 0]));
  return {
    ...out,
    total: clock,
    pool: entrants * entryFee,
    payouts: players.map((p) => paid[p.id] || 0),
    perPlayer: players.map((p) => ({ matches: per[p.id].matches, games: per[p.id].games, opponents: per[p.id].opponents.size })),
  };
}
