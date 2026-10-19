/**
 * Operator corrections of recorded V3 results. A correction is checked against the score rules and every
 * budget before it is accepted, and produces an audit record with the old and new result.
 * Once any playoff result exists, a qualifying correction that would change who qualified or who holds a
 * bye is refused: playoff money already earned would no longer match the bracket.
 */
import { v3QualifyingScoreProblem, v3PlayoffScoreProblem, v3PartialScoreProblem } from './showdownV3Results.js';
import { v3QualifyingLedger } from './showdownV3Qualifying.js';
import { v3PlayoffLedger } from './showdownV3Playoffs.js';
import { rankV3Standings, resolveV3Qualifiers } from './showdownV3Standings.js';

function scoreRuleProblem(plan, m) {
  if (m.status !== 'completed' || m.score1 == null) return '';
  const limits = { phase: m.phase, games: plan.qualifyingGames, raceTo: plan.playoffRaceTo };
  if (m.result === 'played') {
    return m.phase === 'qualifying'
      ? v3QualifyingScoreProblem(m.score1, m.score2, plan.qualifyingGames)
      : v3PlayoffScoreProblem(m.score1, m.score2, plan.playoffRaceTo);
  }
  return v3PartialScoreProblem(m.score1, m.score2, limits);
}

function qualifiers(plan, playerIds, qualifying, ctx) {
  const ledger = v3QualifyingLedger(plan, playerIds, qualifying, { final: true });
  const standings = rankV3Standings(ledger, playerIds, qualifying, { excludedIds: ctx.withdrawnIds });
  const r = resolveV3Qualifiers(plan, standings, ctx);
  return r.status === 'resolved' ? `${[...r.qualifierIds].sort()}|${[...r.byeIds].sort()}` : r.status;
}

/**
 * '' when `corrected` may replace the match with the same id.
 * ctx: { withdrawnIds, shootouts, byeIds } as used for the current bracket.
 */
export function v3CorrectionProblem(plan, playerIds, matches, corrected, ctx = {}) {
  const before = matches.find((m) => m.id === corrected.id);
  if (!before) return 'That match is not part of this event.';
  const rule = scoreRuleProblem(plan, corrected);
  if (rule) return rule;
  const after = matches.map((m) => (m.id === corrected.id ? corrected : m));
  const q = after.filter((m) => m.phase === 'qualifying');
  if (v3QualifyingLedger(plan, playerIds, q).matches.some((m) => !m.withinBudget)) return 'The correction would pay a qualifying match more than its budget.';
  const playoff = v3PlayoffLedger(plan, after.filter((m) => m.phase === 'playoff'), { byeIds: ctx.byeIds || [] });
  if (playoff.problems.length) return playoff.problems[0];
  const playoffStarted = matches.some((m) => m.phase === 'playoff' && m.status === 'completed');
  if (corrected.phase === 'qualifying' && playoffStarted) {
    const was = qualifiers(plan, playerIds, matches.filter((m) => m.phase === 'qualifying'), ctx);
    if (was !== qualifiers(plan, playerIds, q, ctx)) {
      return 'Playoff results exist, so this qualifying correction cannot change who qualified or who has a bye.';
    }
  }
  return '';
}

export function v3CorrectionAudit(before, after, { by, at, reason }) {
  if (!String(reason || '').trim() || !by || !at) throw new Error('A correction needs a reason, who made it and when.');
  const pick = (m) => ({ result: m.result, score1: m.score1, score2: m.score2, winnerId: m.winnerId, forfeitedBy: m.forfeitedBy || [] });
  return {
    type: 'v3-result-correction',
    playerIds: [after.p1, after.p2].filter(Boolean),
    details: { matchId: after.id, phase: after.phase, before: pick(before), after: pick(after), reason, by, at },
  };
}
