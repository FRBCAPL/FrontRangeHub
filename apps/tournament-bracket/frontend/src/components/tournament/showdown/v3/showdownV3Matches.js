/**
 * V3 match results built from the locked plan: fixed-length qualifying (ties allowed), race playoffs,
 * forfeits that keep the games actually played, and automatic withdrawal forfeits.
 * A match that may have had games played needs the real score, or an explicit confirmation that no games
 * were played; a missing score is refused, never assumed to be 0–0.
 */
import { v3PlayedResult, v3ForfeitResult, v3QualifyingScoreProblem, v3PlayoffScoreProblem } from './showdownV3Results.js';

export const V3_PARTIAL_SCORE_MESSAGE = 'Enter the games already played in this match, or confirm that no games were played.';

export function v3Limits(state) {
  return { games: state.payoutPlan.qualifyingGames, raceTo: state.payoutPlan.playoffRaceTo };
}

const blank = (v) => v === undefined || v === null || v === '';

/** entry: { score1, score2 } or { noGamesPlayed: true }. Returns the games played, or throws. */
export function v3PartialScore(entry) {
  if (entry?.noGamesPlayed === true) {
    if ((!blank(entry.score1) && Number(entry.score1) !== 0) || (!blank(entry.score2) && Number(entry.score2) !== 0)) {
      throw new Error('The score says games were played, but no games played was also confirmed. Check the score.');
    }
    return { score1: 0, score2: 0 };
  }
  if (!entry || blank(entry.score1) || blank(entry.score2)) throw new Error(V3_PARTIAL_SCORE_MESSAGE);
  return { score1: entry.score1, score2: entry.score2 };
}

export function v3PlayedFor(state, match, score1, score2, now) {
  return v3PlayedResult(match, score1, score2, v3Limits(state), now);
}

/**
 * Operator forfeit. `entry` holds the games already played (or noGamesPlayed) and `voluntary`: the operator
 * confirmed the forfeiting player chose to forfeit, as opposed to an emergency or an operator decision.
 */
export function v3ForfeitFor(state, match, forfeitingIds, entry, now) {
  const { score1, score2 } = v3PartialScore(entry);
  const result = v3ForfeitResult(match, forfeitingIds, score1, score2, v3Limits(state), now);
  return typeof entry?.voluntary === 'boolean' ? { ...result, voluntaryForfeit: entry.voluntary } : result;
}

/**
 * Automatic forfeit for withdrawn players. A match that never reached a table had no games; a match on a
 * table needs `scoresSoFar[matchId]` with the real score or noGamesPlayed.
 */
export function v3AutoForfeit(state, match, goneIds, scoresSoFar = {}, now) {
  const entry = match.status === 'on-table' ? scoresSoFar[match.id] : { noGamesPlayed: true };
  const { score1, score2 } = v3PartialScore(entry);
  return { ...v3ForfeitResult(match, goneIds, score1, score2, v3Limits(state), now), auto: 'withdrawal' };
}

/** Score problem for a phone submission against a V3 match, or ''. */
export function v3PhoneScoreProblem(state, match, score1, score2) {
  const { games, raceTo } = v3Limits(state);
  return match.phase === 'qualifying' ? v3QualifyingScoreProblem(score1, score2, games) : v3PlayoffScoreProblem(score1, score2, raceTo);
}
