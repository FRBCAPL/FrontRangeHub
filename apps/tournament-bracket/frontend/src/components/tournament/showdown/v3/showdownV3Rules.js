/**
 * V3 money and format limits. All V3 money is in cents. Percentages are whole numbers so every comparison
 * stays in integer arithmetic. Each locked plan records its money unit: plans locked by the original formula
 * have none and use 50¢; equal-rate plans use 25¢ (docs/showdown/SHOWDOWN_V3_PAYOUT_SPEC.md).
 */
export const V3_QUALIFYING_GAMES = { min: 5, max: 15 };
export const V3_PLAYOFF_RACE_TO = { min: 3, max: 9 };

/** Money unit of plans locked by the original formula. */
export const V3_UNIT_CENTS = 50;
/** Round 2 pays this much more per game than Round 1. Playoff games pay the Round 2 rate. */
export const V3_ROUND2_STEPS_CENTS = [50, 100];

export const V3_QUALIFYING_SHARE_PCT = { min: 30, max: 55 };
export const V3_OPENING_MIN_PCT = 50;
/** Championship match-win target, graded down 5% at a time to the minimum. */
export const V3_CHAMPIONSHIP_PCT = { target: 150, min: 100, step: 5 };

/** Equal-rate formula: one game rate everywhere, in 25¢ steps. */
export const V3_EQUAL_RATE_FORMULA = 'equal-rate-2026-10';
export const V3_EQUAL_RATE = {
  unitCents: 25,
  qualifyingCapPct: 60,
  championTargetPct: 400,
  championshipMinPct: 100,
  openingMinPct: V3_OPENING_MIN_PCT,
  standardSemifinalWeight: 120,
  rebalanceSemifinalWeights: [130, 140, 150],
};

export function v3ChampionshipTiers() {
  const out = [];
  for (let p = V3_CHAMPIONSHIP_PCT.target; p >= V3_CHAMPIONSHIP_PCT.min; p -= V3_CHAMPIONSHIP_PCT.step) out.push(p);
  return out;
}

/** Most games a race-to-k match can last. The playoff reserve covers this for every match. */
export function maxPlayoffGames(raceTo) {
  return 2 * raceTo - 1;
}

export const isHalfUnit = (cents) => Number.isInteger(cents) && cents % V3_UNIT_CENTS === 0;

export const isEqualRatePlan = (plan) => plan?.formula === V3_EQUAL_RATE_FORMULA;

/** The money unit a locked plan pays in: 25¢ for equal-rate plans, 50¢ for plans without a formula marker. */
export function v3UnitCents(plan) {
  return isEqualRatePlan(plan) ? V3_EQUAL_RATE.unitCents : V3_UNIT_CENTS;
}

export const isUnitMultiple = (cents, unit) => Number.isInteger(cents) && cents % unit === 0;

/** "50¢" / "25¢" for messages. */
export const unitText = (unit) => `${unit}\u00a2`;

export function formatCents(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}${abs % 100 ? `.${String(abs % 100).padStart(2, '0')}` : ''}`;
}
