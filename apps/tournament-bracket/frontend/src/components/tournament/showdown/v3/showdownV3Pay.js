/**
 * What a locked V3 plan pays, whatever formula locked it. Escalating plans pay a rate per playoff stage,
 * no match-win pay and a bye credit; earlier plans pay one playoff rate plus their match-win ladder and bye pay.
 */
import { gamesPlayed } from './showdownV3Results.js';
import { isEscalatingPlan } from './showdownV3Rules.js';

export function v3PlayoffRateCents(plan, roundKey) {
  return isEscalatingPlan(plan) ? plan.rates.byRound[roundKey] || 0 : plan.rates.playoff;
}

export function v3MatchWinCents(plan, roundKey) {
  return isEscalatingPlan(plan) ? 0 : (plan.ladder?.perRound?.[roundKey] || 0) * 100;
}

/** Pay for one confirmed opening-round bye. */
export function v3ByeCents(plan) {
  return isEscalatingPlan(plan) ? plan.byeCreditCents : (plan.ladder?.bye || 0) * 100;
}

/**
 * The Champion Fund of an escalating plan: the initial fund plus the reserve that completed matches did not
 * pay out (unplayed qualifying games nobody was credited, unplayed playoff games). Null for other formulas.
 * `qualifying`: the event's qualifying ledger (v3QualifyingLedger).
 */
export function v3ChampionFund(plan, qualifying, playoffMatches) {
  if (!isEscalatingPlan(plan)) return null;
  const perQualifyingMatch = plan.qualifyingGames * plan.rates.r1;
  const fromQualifying = qualifying.matches.reduce((s, m) => s + (perQualifyingMatch - m.paid), 0);
  const fromPlayoffs = playoffMatches.filter((m) => m.status === 'completed').reduce((s, m) => {
    const rate = v3PlayoffRateCents(plan, m.roundKey);
    return s + (plan.reserves.playoffGamesPerMatch - gamesPlayed(m)) * rate;
  }, 0);
  const startCents = plan.reserves.championFund;
  return { startCents, transferredCents: fromQualifying + fromPlayoffs, currentCents: startCents + fromQualifying + fromPlayoffs };
}
