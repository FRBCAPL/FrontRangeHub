/**
 * V3 money and format limits. All V3 money is in cents; every rate and payout is a multiple of 50¢.
 * Percentages are whole numbers so every comparison stays in integer arithmetic.
 */
export const V3_QUALIFYING_GAMES = { min: 5, max: 15 };
export const V3_PLAYOFF_RACE_TO = { min: 3, max: 9 };

export const V3_UNIT_CENTS = 50;
/** Round 2 pays this much more per game than Round 1. Playoff games pay the Round 2 rate. */
export const V3_ROUND2_STEPS_CENTS = [50, 100];

export const V3_QUALIFYING_SHARE_PCT = { min: 30, max: 55 };
export const V3_OPENING_MIN_PCT = 50;
/** Championship match-win target, graded down 5% at a time to the minimum. */
export const V3_CHAMPIONSHIP_PCT = { target: 150, min: 100, step: 5 };

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

export function formatCents(cents) {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}$${Math.floor(abs / 100)}${abs % 100 ? `.${String(abs % 100).padStart(2, '0')}` : ''}`;
}
