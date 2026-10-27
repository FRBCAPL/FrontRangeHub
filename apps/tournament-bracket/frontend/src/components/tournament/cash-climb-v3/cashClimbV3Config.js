/**
 * Cash Climb V3 tournament configuration. Independent of Cash Climb King of the Hill ('cash-climb') and
 * Cash Climb Showdown ('showdown').
 *
 * Money is integer cents. Entry fee and added money must be whole dollars so the prize pool, the
 * reserves and every payout stay whole dollars.
 */
import { CENTS_PER_DOLLAR, isWholeDollarCents } from './cashClimbV3Money.js';

export const CASH_CLIMB_V3_FORMAT = 'cash-climb-v3';

export const CASH_CLIMB_V3_LIMITS = Object.freeze({
  minEntrants: 8,
  minEntryFeeCents: 10 * CENTS_PER_DOLLAR,
  minAddedMoneyCents: 0,
  minRaceTo: 1,
});

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Plain-English reasons the configuration cannot be used. Empty when valid. */
export function cashClimbV3ConfigProblems(config) {
  if (!isPlainObject(config)) return ['Tournament settings are missing.'];
  const { entrants, entryFeeCents, addedMoneyCents = 0, raceTo, rules = {} } = config;
  const L = CASH_CLIMB_V3_LIMITS;
  const problems = [];
  if (!Number.isSafeInteger(entrants) || entrants < L.minEntrants) {
    problems.push(`Cash Climb needs a whole number of entrants, at least ${L.minEntrants}.`);
  }
  if (!Number.isSafeInteger(entryFeeCents) || entryFeeCents < L.minEntryFeeCents) {
    problems.push('The entry fee must be at least $10.');
  } else if (!isWholeDollarCents(entryFeeCents)) {
    problems.push('The entry fee must be a whole number of dollars.');
  }
  if (!Number.isSafeInteger(addedMoneyCents) || addedMoneyCents < L.minAddedMoneyCents) {
    problems.push('Added money cannot be negative.');
  } else if (!isWholeDollarCents(addedMoneyCents)) {
    problems.push('Added money must be a whole number of dollars.');
  }
  if (!Number.isSafeInteger(raceTo) || raceTo < L.minRaceTo) {
    problems.push('The race length must be a whole number of racks, at least 1.');
  }
  if (!isPlainObject(rules)) problems.push('Playing rules must be a settings object.');
  if (!problems.length && !Number.isSafeInteger(entrants * entryFeeCents + addedMoneyCents)) {
    problems.push('The prize pool is too large to calculate exactly.');
  }
  return problems;
}

/** Validated, normalized configuration. Throws with every problem when invalid. */
export function cashClimbV3Config(input) {
  const problems = cashClimbV3ConfigProblems(input);
  if (problems.length) throw new Error(problems.join(' '));
  return Object.freeze({
    format: CASH_CLIMB_V3_FORMAT,
    entrants: input.entrants,
    entryFeeCents: input.entryFeeCents,
    addedMoneyCents: input.addedMoneyCents || 0,
    raceTo: input.raceTo,
    rules: Object.freeze({ ...(input.rules || {}) }),
  });
}

/** P = N x E + A, in cents. */
export const prizePoolCents = (config) => config.entrants * config.entryFeeCents + config.addedMoneyCents;
