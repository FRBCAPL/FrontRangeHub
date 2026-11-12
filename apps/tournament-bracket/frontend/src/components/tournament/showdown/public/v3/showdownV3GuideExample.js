/**
 * Worked example for the Showdown guide, from the plan an event with that formula would lock: 16 players,
 * $20 entry, 7 qualifying games, playoff races to 5.
 */
import { buildV3Plan } from '../../v3/showdownV3Plan.js';
import { v3PlayoffRateCents, v3MatchWinCents, v3ByeCents } from '../../v3/showdownV3Pay.js';
import {
  isEscalatingPlan, formatCents, V3_ESCALATING_FORMULA, V3_EQUAL_RATE_FORMULA,
} from '../../v3/showdownV3Rules.js';
import { showdownFieldTable } from '../../showdownNewPlayerGuide.js';

export const SHOWDOWN_GUIDE_EXAMPLE = { entrants: 16, entryFee: 20, qualifyingGames: 7, playoffRaceTo: 5 };

const ROUNDS = [['quarterfinal', 'Quarterfinal'], ['semifinal', 'Semifinal'], ['final', 'Final']];

export function showdownV3GuideExample({ d10 = true, example = SHOWDOWN_GUIDE_EXAMPLE } = {}) {
  let plan;
  try {
    plan = buildV3Plan(example, d10 ? V3_ESCALATING_FORMULA : V3_EQUAL_RATE_FORMULA);
  } catch {
    return null;
  }
  if (!plan?.rates) return null;
  const { qualifyingGames: games, playoffRaceTo: raceTo } = example;
  const gameCents = plan.rates.r1;
  const rounds = ROUNDS.map(([key, name]) => ({
    key, name, gameCents: v3PlayoffRateCents(plan, key), winCents: v3MatchWinCents(plan, key),
  })).filter((r) => r.gameCents || r.winCents);
  const escalating = isEscalatingPlan(plan);
  return {
    ...example,
    plan,
    usd: formatCents,
    escalating,
    pool: plan.poolCents,
    gameCents,
    qualifiers: plan.qualifiers,
    byes: plan.byes,
    rounds,
    byeCents: v3ByeCents(plan),
    championFundCents: escalating ? plan.reserves.championFund : null,
    maxPlayoffGames: plan.reserves?.playoffGamesPerMatch ?? raceTo * 2 - 1,
    closeQualifier: { score: `${Math.ceil(games / 2)}\u2013${Math.floor(games / 2)}`, won: Math.ceil(games / 2), lost: Math.floor(games / 2) },
    fieldTable: showdownFieldTable(),
  };
}
