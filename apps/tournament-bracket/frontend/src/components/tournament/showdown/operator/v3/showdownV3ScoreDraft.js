/**
 * Score entry rules for the V3 operator modals, using the engine's own checks so the screen and the engine
 * can never disagree. A partial score (forfeit, withdrawal, interruption) is either the games already
 * played or an explicit "no games were played" — a blank is never treated as 0–0.
 */
import { v3QualifyingScoreProblem, v3PlayoffScoreProblem, v3PartialScoreProblem } from '../../v3/showdownV3Results.js';
import { V3_PARTIAL_SCORE_MESSAGE } from '../../v3/showdownV3Matches.js';

export const V3_VOLUNTARY_MESSAGE = 'Choose whether this was the player\u2019s own choice or an emergency, venue closure or operator decision.';

export const emptyPartial = () => ({ score1: null, score2: null, noGamesPlayed: false, voluntary: null });

export function v3LimitsOf(state, phase) {
  return { phase, games: state.payoutPlan.qualifyingGames, raceTo: state.payoutPlan.playoffRaceTo };
}

/** Highest score a player can have in an unfinished match. */
export function partialMax(limits) {
  return limits.phase === 'qualifying' ? limits.games - 1 : limits.raceTo - 1;
}

/** '' when a finished-match score is valid. Ties are valid in qualifying. */
export function v3ScoreProblem(limits, s1, s2) {
  if (s1 === null || s2 === null) return 'Pick both players\u2019 scores.';
  return limits.phase === 'qualifying' ? v3QualifyingScoreProblem(s1, s2, limits.games) : v3PlayoffScoreProblem(s1, s2, limits.raceTo);
}

/** '' when a partial score is complete. `needVoluntary`: the voluntary/involuntary choice is required. */
export function v3PartialProblem(limits, draft, { needVoluntary = false } = {}) {
  const d = draft || emptyPartial();
  if (d.noGamesPlayed) {
    if ((d.score1 ?? 0) !== 0 || (d.score2 ?? 0) !== 0) return 'The score says games were played, but no games played was also confirmed. Check the score.';
  } else if (d.score1 === null || d.score2 === null) {
    return V3_PARTIAL_SCORE_MESSAGE;
  } else {
    const problem = v3PartialScoreProblem(d.score1, d.score2, limits);
    if (problem) return problem;
  }
  if (needVoluntary && d.voluntary === null) return V3_VOLUNTARY_MESSAGE;
  return '';
}

/** The engine entry for a complete draft: { score1, score2 } or { noGamesPlayed: true }, plus `voluntary`. */
export function v3PartialEntry(draft) {
  const base = draft.noGamesPlayed ? { noGamesPlayed: true } : { score1: draft.score1, score2: draft.score2 };
  return draft.voluntary === null ? base : { ...base, voluntary: draft.voluntary === true };
}

export function scoreText(draft) {
  if (draft.noGamesPlayed) return 'no games played';
  return `${draft.score1}\u2013${draft.score2}`;
}
