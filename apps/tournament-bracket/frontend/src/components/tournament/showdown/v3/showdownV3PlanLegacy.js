/**
 * The original V3 payout plan (Round 2 pays 50¢–$1 more than Round 1, 50¢ units, championship tiers).
 * New events no longer use it; it stays unchanged so a plan locked by it can be re-derived and checked
 * exactly as it was locked. Plans it builds carry no `formula` marker.
 */
import { SHOWDOWN_PAYOUT_V3 } from '../showdownRules.js';
import { selectV3Rates } from './showdownV3Rates.js';
import { v3FinishOrderChecks } from './showdownV3Guarantees.js';
import { maxPlayoffGames } from './showdownV3Rules.js';

/** Builds the original-formula plan. Throws when the configuration cannot meet its payout rules. */
export function buildV3LegacyPlan(settings) {
  const sel = selectV3Rates(settings);
  if (!sel.ok) throw new Error(sel.problems[0]);
  const { settings: s, field, choice } = sel;
  const rates = { r1: choice.r1, r2: choice.r2, playoff: choice.playoffRate };
  const guarantees = v3FinishOrderChecks({
    template: field.template, ladder: choice.ladder, rates, qualifyingGames: s.qualifyingGames, playoffRaceTo: s.playoffRaceTo,
  });
  return {
    payoutVersion: SHOWDOWN_PAYOUT_V3,
    entrants: s.entrants,
    entryFee: s.entryFee,
    qualifyingGames: s.qualifyingGames,
    playoffRaceTo: s.playoffRaceTo,
    templateId: field.templateId,
    qualifiers: field.qualifiers,
    byes: field.byes,
    playoffMatches: field.playoffMatches,
    poolCents: choice.pool,
    rates,
    reserves: {
      qualifying: choice.qualifying,
      playoffGames: choice.playoffGames,
      playoffGamesPerMatch: maxPlayoffGames(s.playoffRaceTo),
      ladder: choice.ladderCents,
      leftover: choice.leftoverCents,
    },
    ladder: choice.ladder,
    championshipTierPct: sel.tierPct,
    guarantees,
    trace: sel.trace,
  };
}
