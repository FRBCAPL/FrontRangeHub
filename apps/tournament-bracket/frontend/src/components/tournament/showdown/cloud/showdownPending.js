/** Waiting phone scores as the operator sees them, checked against the current event. */
import { phoneSubmissionProblem } from '../showdownPhoneActions.js';
import { nameOf, matchLabel } from '../operator/showdownView.js';

export function submissionFromRow(row) {
  return {
    id: row.id,
    matchId: row.match_id,
    p1: row.p1,
    p2: row.p2,
    score1: Number(row.score1),
    score2: Number(row.score2),
    submittedName: row.submitted_name || '',
    createdAt: row.created_at || '',
  };
}

function recordedAsSubmitted(m, sub) {
  return Boolean(m) && m.status === 'completed' && m.result === 'played' && m.p1 === sub.p1 && m.p2 === sub.p2
    && m.score1 === sub.score1 && m.score2 === sub.score2;
}

export function pendingView(state, rows = []) {
  return rows.map((row) => {
    const sub = submissionFromRow(row);
    const match = state.matches.find((m) => m.id === sub.matchId);
    const recorded = recordedAsSubmitted(match, sub);
    return {
      ...sub,
      label: match ? matchLabel(state, match) : 'Unknown match',
      p1Name: nameOf(state, sub.p1),
      p2Name: nameOf(state, sub.p2),
      recorded,
      problem: recorded ? '' : phoneSubmissionProblem(state, sub),
    };
  });
}

/**
 * Submissions the tablet can settle on its own once its copy is safely in the cloud:
 * the match now has a result, either the submitted one (approved) or a different one (rejected).
 */
export function settledSubmissions(state, rows = []) {
  return rows.map(submissionFromRow).flatMap((sub) => {
    const m = state.matches.find((x) => x.id === sub.matchId);
    if (!m || m.status !== 'completed') return [];
    const same = recordedAsSubmitted(m, sub);
    return [{ id: sub.id, decision: same ? 'approved' : 'rejected', reason: same ? '' : 'The director recorded a different result for this match.' }];
  });
}
