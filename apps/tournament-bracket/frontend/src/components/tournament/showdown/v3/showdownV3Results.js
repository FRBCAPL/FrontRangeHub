/**
 * V3 score rules and result shapes. Scores are games won; Showdown never knows which game is played.
 *   Qualifying, played: both scores 0…G and adding up to exactly G (all games played, ties allowed).
 *   Playoffs, played:   a race to k — one player has exactly k, the other fewer.
 *   Forfeits keep the games actually played (never filled in to G or k), so real wins stay separate
 *   from administrative credits. One forfeiting player: 'forfeit' (qualifying) or 'walkover' (playoffs).
 *   Both forfeiting: 'double-forfeit', no winner. 'interrupted': the event stopped with the match unfinished.
 */

function asScore(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 ? n : null;
}

const BOTH = 'Enter both players\u2019 game scores as whole numbers.';

export function v3QualifyingScoreProblem(score1, score2, games) {
  const a = asScore(score1); const b = asScore(score2);
  if (a === null || b === null) return BOTH;
  if (a + b !== games) return `A qualifying match is ${games} games, all played: the scores must add up to ${games}.`;
  return '';
}

export function v3PlayoffScoreProblem(score1, score2, raceTo) {
  const a = asScore(score1); const b = asScore(score2);
  if (a === null || b === null) return BOTH;
  const hit = (a === raceTo ? 1 : 0) + (b === raceTo ? 1 : 0);
  if (hit !== 1 || a > raceTo || b > raceTo) return `One player must reach exactly ${raceTo} and the other must have fewer.`;
  return '';
}

/** Score of an unfinished match (forfeit, double forfeit or interruption). */
export function v3PartialScoreProblem(score1, score2, { phase, games, raceTo }) {
  const a = asScore(score1); const b = asScore(score2);
  if (a === null || b === null) return BOTH;
  if (phase === 'qualifying' && a + b >= games) return `An unfinished qualifying match has fewer than ${games} games played.`;
  if (phase === 'playoff' && (a >= raceTo || b >= raceTo)) return `In an unfinished race to ${raceTo}, neither player has ${raceTo} games yet.`;
  return '';
}

function base(match, now) {
  return { ...match, status: 'completed', table: null, completedAt: now, auto: undefined, forfeitedBy: [] };
}

export function v3PlayedResult(match, score1, score2, { games, raceTo }, now) {
  const qualifying = match.phase === 'qualifying';
  const problem = qualifying ? v3QualifyingScoreProblem(score1, score2, games) : v3PlayoffScoreProblem(score1, score2, raceTo);
  if (problem) throw new Error(problem);
  const a = Number(score1); const b = Number(score2);
  const winnerId = a === b ? null : (a > b ? match.p1 : match.p2);
  const loserId = winnerId ? (winnerId === match.p1 ? match.p2 : match.p1) : null;
  return { ...base(match, now), result: 'played', score1: a, score2: b, winnerId, loserId };
}

/** Forfeit after the games already played. Both players keep the games they actually won. */
export function v3ForfeitResult(match, forfeitingIds, score1, score2, limits, now) {
  const ids = [...new Set(forfeitingIds)].filter((id) => id === match.p1 || id === match.p2);
  if (!ids.length) throw new Error('Pick which player forfeits.');
  const problem = v3PartialScoreProblem(score1, score2, { phase: match.phase, ...limits });
  if (problem) throw new Error(problem);
  const scores = { score1: Number(score1), score2: Number(score2) };
  if (ids.length === 2) return { ...base(match, now), result: 'double-forfeit', ...scores, winnerId: null, loserId: null, forfeitedBy: ids };
  const loser = ids[0];
  const winner = loser === match.p1 ? match.p2 : match.p1;
  if (!winner) throw new Error('The opponent for this match is not known yet.');
  const result = match.phase === 'qualifying' ? 'forfeit' : 'walkover';
  return { ...base(match, now), result, ...scores, winnerId: winner, loserId: loser, forfeitedBy: ids };
}

/** The event stopped with this match unfinished. Games already played still pay; nobody wins the match. */
export function v3InterruptedResult(match, score1, score2, limits, now) {
  const problem = v3PartialScoreProblem(score1, score2, { phase: match.phase, ...limits });
  if (problem) throw new Error(problem);
  return { ...base(match, now), result: 'interrupted', score1: Number(score1), score2: Number(score2), winnerId: null, loserId: null };
}

export function gamesPlayed(match) {
  return (Number(match.score1) || 0) + (Number(match.score2) || 0);
}
