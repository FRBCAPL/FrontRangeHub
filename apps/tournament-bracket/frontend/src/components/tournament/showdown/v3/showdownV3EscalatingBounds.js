/**
 * Worst-case finishing-order bounds for an escalating (D10) V3 plan. Integer cents throughout.
 *
 * Champion first (hard rule). The champion is paid what is left of the pool after everyone else, so
 *   champion − X = initial fund + champion's earnings − X's earnings + every reserved cent nobody earned.
 * Unearned reserve is never negative, and a walkover or vacated position leaves at least the k games the
 * champion would have needed in that match unearned, so the worst case is every playoff match played out:
 *   champion: their qualifying + k games at each stage they played (+ the bye credit on a bye path);
 *   X eliminated at stage i: at most 2G qualifying games, k games at each earlier stage, k − 1 at stage i
 *   (+ the bye credit on a bye path).
 * A non-qualifier is covered by an opening-round loser with the same qualifying games. Qualifying credits
 * never take a player past G games in a match, and every uncredited unplayed game stays in the fund.
 *
 * Qualifying floor. Without withdrawals the player ranked r holds at least
 * minWinsAtRank(r) = ⌈(N·G − (r−1)·2G) / (N−r+1)⌉ games (showdownV3Bounds.js). Players who withdraw during
 * qualifying keep their games but rank after everyone else, so with enough such withdrawals a qualifier can
 * hold none; the hard rule then assumes the champion won no qualifying game. A bye holder still outranks
 * every non-bye qualifier, so against a non-bye opponent a bye-holding champion's qualifying cancels out.
 *
 * The other relationships (runner-up over a semifinal loser, semifinal loser over a quarterfinal loser) are
 * reported, not required, and use the no-withdrawal floor with every playoff match played to completion.
 */
import { minWinsAtRank } from './showdownV3Bounds.js';
import { V3_ESCALATING } from './showdownV3Rules.js';

/** Bye credit: byeCreditPct of a full opening-round win (k games at that stage's rate), to the nearest 25¢, halves up. */
export function v3ByeCreditCents(raceTo, openingRateCents, pct = V3_ESCALATING.byeCreditPct) {
  return Math.floor((raceTo * openingRateCents * pct + 1250) / 2500) * 25;
}

function stagePaths({ rates, k, byes, byeCreditCents: B }) {
  const won = (from, to) => { let s = 0; for (let i = from; i < to; i += 1) s += k * rates[i]; return s; };
  const R = rates.length;
  const champion = [{ bye: false, min: won(0, R) }];
  if (byes) champion.push({ bye: true, min: won(1, R) + B });
  const lostAt = (i) => {
    const out = [{ bye: false, min: won(0, i), max: won(0, i) + (k - 1) * rates[i] }];
    if (byes && i >= 1) out.push({ bye: true, min: won(1, i) + B, max: won(1, i) + (k - 1) * rates[i] + B });
    return out;
  };
  return { champion, lostAt };
}

function worstPair({ q, G, byes, floor }, upper, lower, extra = 0) {
  let worst = null;
  upper.forEach((u) => lower.forEach((l) => {
    if (u.bye && l.bye && byes < 2) return;
    const upperQ = (u.bye ? floor.wBye : floor.wLast) * q;
    const lowerQ = u.bye && !l.bye ? upperQ : 2 * G * q;
    const marginCents = extra + u.min + upperQ - (l.max + lowerQ);
    if (!worst || marginCents < worst.marginCents) {
      worst = { marginCents, upperPath: u.bye ? 'bye' : 'opening', lowerPath: l.bye ? 'bye' : 'opening' };
    }
  }));
  return worst;
}

const rankedFloor = (N, G, qualifiers, byes) => ({
  wLast: minWinsAtRank(N, G, qualifiers),
  wBye: byes ? minWinsAtRank(N, G, byes) : 0,
});

/**
 * stageKeys/rates: playoff stages in order with their per-game rates. Returns
 * { champion: { marginCents, byStage, minTotalCents }, runnerUp, semifinalOverQuarterfinal | null }.
 * A positive marginCents means the order holds in every case the bound covers.
 */
export function v3EscalatingBounds({
  entrants: N, qualifyingGames: G, playoffRaceTo: k, qualifiers, byes, q, stageKeys, rates, byeCreditCents, fundCents,
  coversQualifyingWithdrawals = V3_ESCALATING.coversQualifyingWithdrawals,
}) {
  const ranked = rankedFloor(N, G, qualifiers, byes);
  const hardFloor = coversQualifyingWithdrawals ? { wLast: 0, wBye: 0 } : ranked;
  const p = stagePaths({ rates, k, byes, byeCreditCents });
  const hard = { q, G, byes, floor: hardFloor };
  const byStage = {};
  stageKeys.forEach((key, i) => { byStage[key] = worstPair(hard, p.champion, p.lostAt(i), fundCents); });
  const marginCents = Math.min(...Object.values(byStage).map((w) => w.marginCents));
  const minTotalCents = Math.min(...p.champion.map((c) => fundCents + c.min + (c.bye ? hardFloor.wBye : hardFloor.wLast) * q));
  const soft = { q, G, byes, floor: ranked };
  const R = rates.length;
  return {
    champion: { marginCents, byStage, minTotalCents },
    runnerUp: worstPair(soft, p.lostAt(R - 1), p.lostAt(R - 2)),
    semifinalOverQuarterfinal: R >= 3 ? worstPair(soft, p.lostAt(R - 2), p.lostAt(R - 3)) : null,
  };
}
