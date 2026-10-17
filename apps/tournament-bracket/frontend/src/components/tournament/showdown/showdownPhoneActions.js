/**
 * Phone score submissions. A submission is only a request: it changes the event only when an
 * operator approves it, and approval records the result through the normal engine path.
 * The same checks run in the database (cash_climb_showdown_submit) so a phone cannot skip them.
 */
import { context, withAudit } from './showdownState.js';
import { recordResult } from './showdownResultActions.js';

export const PHONE_PROBLEMS = {
  'event-not-active': 'This event is not taking scores right now.',
  'match-not-found': 'That match is not part of this event. Refresh and try again.',
  'match-not-eligible': 'Scores for that match cannot be sent from a phone.',
  'match-finished': 'This match already has a result.',
  'match-not-started': 'This match has not started yet. Scores can be sent once it is on a table.',
  'stale-match': 'This match changed since you opened it. Refresh and try again.',
  'player-withdrawn': 'A player in this match has withdrawn. Ask the director.',
  duplicate: 'A score for this match is already waiting for the director.',
  'rate-limited': 'Too many submissions. Wait a few minutes or ask the director.',
};

function raceFor(state, phase) {
  return Number(phase === 'qualifying' ? state.settings.qualifyingRaceTo : state.settings.playoffRaceTo);
}

export function invalidScoreMessage(race) {
  return `Scores must be whole numbers from 0 to ${race}, and exactly one player must reach ${race}.`;
}

/** Problem code for a submission against the current event, or '' if it may be sent. */
export function phoneSubmissionCode(state, sub) {
  if (!state || !['qualifying', 'playoffs'].includes(state.status)) return 'event-not-active';
  const m = (state.matches || []).find((x) => x.id === sub.matchId);
  if (!m) return 'match-not-found';
  if (!['qualifying', 'playoff'].includes(m.phase)
    || (m.phase === 'qualifying' && state.status !== 'qualifying')
    || (m.phase === 'playoff' && state.status !== 'playoffs')) return 'match-not-eligible';
  if (m.status === 'completed') return 'match-finished';
  if (m.status !== 'on-table') return 'match-not-started';
  if (m.p1 !== sub.p1 || m.p2 !== sub.p2) return 'stale-match';
  if ((state.players || []).some((p) => [sub.p1, sub.p2].includes(p.id) && p.withdrawnAt)) return 'player-withdrawn';
  const race = raceFor(state, m.phase);
  const ok = [sub.score1, sub.score2].every((n) => Number.isInteger(n) && n >= 0 && n <= race)
    && ((sub.score1 === race) !== (sub.score2 === race));
  if (!ok) return 'invalid-score';
  return '';
}

export function phoneSubmissionProblem(state, sub) {
  const code = phoneSubmissionCode(state, sub);
  if (!code) return '';
  if (code === 'invalid-score') {
    const m = state.matches.find((x) => x.id === sub.matchId);
    return invalidScoreMessage(raceFor(state, m.phase));
  }
  return PHONE_PROBLEMS[code];
}

/** Operator approval: re-validates against the current event, then records the result. */
export function approvePhoneResult(state, sub, ctxIn) {
  const c = context(ctxIn);
  const problem = phoneSubmissionProblem(state, sub);
  if (problem) throw new Error(`This phone score cannot be approved: ${problem}`);
  const next = recordResult(state, sub.matchId, { score1: sub.score1, score2: sub.score2 }, c);
  return withAudit(next, c, 'phone-approve', [sub.matchId], {
    submissionId: sub.id, submittedName: sub.submittedName || '', score1: sub.score1, score2: sub.score2,
  });
}

/** Operator rejection: the event is unchanged except for the audit entry. */
export function rejectPhoneResult(state, sub, reason, ctxIn) {
  const c = context(ctxIn);
  return withAudit(state, c, 'phone-reject', [sub.matchId], {
    submissionId: sub.id, submittedName: sub.submittedName || '', score1: sub.score1, score2: sub.score2, reason: String(reason || '').slice(0, 200),
  });
}
