/**
 * Eligibility from the engines' own validators. The Builder never re-implements a rule it can call.
 *   Showdown V1/V2/V3: setupProblems() on an in-memory event, then v3FeasibilityProblems() for V3.
 *   Cash Climb:        requireRaceTo() for both races; the 2-player and table checks live in
 *                      CashClimbSetup.jsx and are mirrored here (builderEligibility.test.js pins them).
 */
import { createShowdownWithFormat, setupProblems, formatFor } from '../showdown/showdownEngine.js';
import { v3FeasibilityProblems } from '../showdown/v3/showdownV3Plan.js';
import { requireRaceTo } from '../cash-climb/cashClimbRace.js';

const players = (n) => Array.from({ length: n }, (_, i) => ({ id: `P${i + 1}`, name: `Player ${i + 1}` }));

/** Builder input checks (not engine rules): whole players and tables, a fee that is a number. */
export function inputProblems({ entrants, tables, entryFee, targetMin }) {
  const problems = [];
  if (!Number.isInteger(entrants) || entrants < 0) problems.push('Players must be a whole number.');
  if (!Number.isInteger(tables) || tables < 1) problems.push('Tables must be a whole number of at least 1.');
  if (!Number.isFinite(entryFee) || entryFee < 0) problems.push('Entry fee must be $0 or more.');
  if (targetMin !== undefined && !(targetMin > 0)) problems.push('Target time must be more than 0 minutes.');
  return problems;
}

function cashClimbProblems(c, { entrants, tables }) {
  const problems = [];
  [c.raceTo, c.kohRaceTo].forEach((r) => {
    try { requireRaceTo(r); } catch (err) { problems.push(err.message); }
  });
  if (!(tables >= 1)) problems.push('Enter a table count of at least 1.');
  if (entrants < 2) problems.push('Add at least 2 players.');
  return problems;
}

function showdownProblems(c, { entrants, tables, entryFee }) {
  const settings = c.version === 3
    ? { qualifyingGames: c.qualifyingGames, playoffRaceTo: c.playoffRaceTo }
    : { qualifyingRaceTo: c.qualifyingRaceTo, playoffRaceTo: c.playoffRaceTo };
  let state;
  try {
    state = createShowdownWithFormat(
      { payoutVersion: c.version, confirmed: true, name: 'Builder', entryFee, tableCount: tables, players: players(entrants), ...settings },
      { now: '2026-01-01T00:00:00.000Z', by: 'smart-builder' },
    );
  } catch (err) {
    return [err.message];
  }
  const problems = [...setupProblems(state)];
  const fmt = formatFor(c.version);
  if (fmt?.usesRaces && !fmt.fixedRaces && (c.qualifyingRaceTo !== 3 || c.playoffRaceTo !== 5)) {
    problems.push('The setup screen has no race inputs for this format.');
  }
  if (c.version === 3 && !problems.length) {
    problems.push(...v3FeasibilityProblems({ entrants, entryFee, qualifyingGames: c.qualifyingGames, playoffRaceTo: c.playoffRaceTo }));
  }
  return [...new Set(problems)];
}

/** Problems that block a candidate. Empty means the engines would accept it. */
export function eligibilityProblems(c, inputs) {
  return c.family === 'cash-climb' ? cashClimbProblems(c, inputs) : showdownProblems(c, inputs);
}
