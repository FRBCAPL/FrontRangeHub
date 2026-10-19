/**
 * V3 standings for the operator: ranked by qualifying dollars, with actual game wins and administrative
 * credits always in separate columns. Status (playoffs, cutoff tie, bye) uses the same qualification
 * rules and shootouts as V1/V2.
 */
import * as E from '../../showdownEngine.js';
import { V3_TIEBREAKERS } from '../../v3/showdownV3Standings.js';
import { formatCents } from '../../v3/showdownV3Rules.js';
import { v3Ledger } from '../../v3/showdownV3Event.js';
import { nameOf, isWithdrawn } from '../showdownView.js';

const STATUS_TEXT = { qualified: 'Playoffs', tied: 'Tied at cutoff', out: '', withdrawn: 'Withdrew' };
const tiebreakerText = (key) => V3_TIEBREAKERS.find((t) => t.key === key)?.label || '';

export function standingsViewV3(state) {
  const { rows } = E.standingsFor(state);
  const ledger = v3Ledger(state);
  const locked = Boolean(state.qualification);
  const outcome = E.qualificationOutcome(state);
  const qualified = new Set(locked ? state.qualification.qualifierIds : outcome.qualifiedIds || []);
  const tied = new Set(locked ? state.qualification.tie?.tiedIds || [] : outcome.tiedIds || []);
  const byeIds = new Set(locked ? state.qualification.byeIds || [] : []);
  const byeTied = new Set(locked ? state.qualification.byeTie?.tiedIds || [] : []);
  const provisional = new Set(ledger.credits.filter((c) => c.provisional && c.games).map((c) => c.playerId));
  const view = rows.map((r) => {
    let status = 'out';
    if (isWithdrawn(state, r.playerId)) status = 'withdrawn';
    else if (qualified.has(r.playerId)) status = 'qualified';
    else if (tied.has(r.playerId)) status = 'tied';
    let statusText = STATUS_TEXT[status];
    if (status === 'qualified' && byeIds.has(r.playerId)) statusText = 'Playoffs \u00b7 bye';
    else if (status === 'qualified' && byeTied.has(r.playerId)) statusText = 'Playoffs \u00b7 bye shootout';
    return {
      playerId: r.playerId,
      name: nameOf(state, r.playerId),
      rankLabel: r.tied ? `T${r.rank}` : String(r.rank),
      total: formatCents(r.totalCents),
      actual: formatCents(r.actualCents),
      credit: r.creditCents ? formatCents(r.creditCents) : '\u2014',
      actualWins: r.actualWins,
      creditWins: r.creditWins,
      round2Wins: r.actualRound2Wins,
      opponents: formatCents(r.opponentCents),
      creditProvisional: provisional.has(r.playerId),
      separatedByLabel: tiebreakerText(r.separatedBy),
      status,
      statusText,
    };
  });
  let lastIn = -1;
  view.forEach((r, i) => { if (r.status === 'qualified' || r.status === 'tied') lastIn = i; });
  const q = state.matches.filter((m) => m.phase === 'qualifying');
  return {
    rows: view,
    cutoffAfterIndex: lastIn,
    spots: state.payoutPlan.qualifiers,
    locked,
    tie: locked ? state.qualification.tie : (outcome.status === 'needs-shootout' ? { tiedIds: outcome.tiedIds, openSpots: outcome.openSpots } : null),
    tieNames: [...tied].map((id) => nameOf(state, id)),
    short: locked ? state.qualification.short : (outcome.status === 'short' ? outcome.missing : 0),
    completedMatches: q.filter((m) => m.status === 'completed').length,
    totalMatches: q.length,
    tiebreakers: V3_TIEBREAKERS.map((t) => t.label),
    hasCredits: view.some((r) => r.creditWins > 0),
    creditsFinal: ledger.final,
  };
}
