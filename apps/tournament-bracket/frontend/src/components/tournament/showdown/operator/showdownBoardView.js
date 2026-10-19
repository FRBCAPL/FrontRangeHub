/** View data for standings, bracket and money screens. */
import * as E from '../showdownEngine.js';
import { playoffTemplate } from '../showdownPlayoffTemplates.js';
import { tiebreakerLabel } from '../showdownRules.js';
import { nameOf, isWithdrawn, matchView } from './showdownView.js';
import { closeCalls } from './showdownCloseCalls.js';

export { payoutLadder, payoutPreview, moneyView } from './showdownMoneyView.js';

const STATUS_TEXT = { qualified: 'Playoffs', tied: 'Tied at cutoff', out: '', withdrawn: 'Withdrew' };

/**
 * Standings with qualification status. Before qualifying is locked the status is a projection
 * from results so far; afterwards it is the locked outcome.
 */
export function standingsView(state) {
  const { rows } = E.standingsFor(state);
  const locked = Boolean(state.qualification);
  const outcome = state.payoutPlan ? E.qualificationOutcome(state) : null;
  const qualified = new Set(locked ? state.qualification.qualifierIds : outcome?.qualifiedIds || []);
  const tied = new Set(locked ? state.qualification.tie?.tiedIds || [] : outcome?.tiedIds || []);
  const byeIds = new Set(locked ? state.qualification.byeIds || [] : []);
  const byeTied = new Set(locked ? state.qualification.byeTie?.tiedIds || [] : []);
  const view = rows.map((r) => {
    let status = 'out';
    if (isWithdrawn(state, r.playerId)) status = 'withdrawn';
    else if (qualified.has(r.playerId)) status = 'qualified';
    else if (tied.has(r.playerId)) status = 'tied';
    let statusText = STATUS_TEXT[status];
    if (status === 'qualified' && byeIds.has(r.playerId)) statusText = 'Playoffs \u00b7 bye';
    else if (status === 'qualified' && byeTied.has(r.playerId)) statusText = 'Playoffs \u00b7 bye shootout';
    return {
      ...r,
      name: nameOf(state, r.playerId),
      rankLabel: r.tied ? `T${r.rank}` : String(r.rank),
      separatedByLabel: tiebreakerLabel(r.separatedBy),
      gameDiff: r.gamesWon - r.gamesLost,
      status,
      statusText,
      bye: byeIds.has(r.playerId),
    };
  });
  let lastIn = -1;
  view.forEach((r, i) => { if (r.status === 'qualified' || r.status === 'tied') lastIn = i; });
  return {
    rows: view,
    closeCalls: closeCalls(state, view),
    cutoffAfterIndex: lastIn,
    spots: state.payoutPlan?.qualifiers || 0,
    locked,
    tie: locked ? state.qualification.tie : (outcome?.status === 'needs-shootout' ? { tiedIds: outcome.tiedIds, openSpots: outcome.openSpots } : null),
    tieNames: [...tied].map((id) => nameOf(state, id)),
    short: locked ? state.qualification.short : (outcome?.status === 'short' ? outcome.missing : 0),
    completedMatches: state.matches.filter((m) => m.phase === 'qualifying' && m.status === 'completed').length,
    totalMatches: state.matches.filter((m) => m.phase === 'qualifying').length,
  };
}

export function bracketView(state) {
  const templateId = state.playoff?.templateId || state.payoutPlan?.templateId;
  const template = playoffTemplate(templateId);
  if (!template) return null;
  const ladder = state.playoffPlan;
  const matches = state.matches.filter((m) => m.phase === 'playoff');
  const finalKey = template.rounds[template.rounds.length - 1].key;
  const named = (ids) => ids.map((id) => ({ id, name: nameOf(state, id) }));
  return {
    templateId,
    size: template.size,
    positions: template.positions,
    drawn: Boolean(state.playoff?.drawnAt),
    confirmed: Boolean(state.playoff?.confirmedAt),
    rounds: template.rounds.map((r) => ({
      key: r.key,
      label: r.label,
      payout: r.key === finalKey ? E.computeEarnings(state).championship : ladder?.perRound[r.key] ?? null,
      matches: matches.filter((m) => m.roundKey === r.key).map((m) => matchView(state, m)),
    })),
    byeCount: template.byes,
    byePay: ladder?.bye ?? 0,
    byes: (state.playoff?.byes || []).map((b) => ({
      ...b,
      semifinal: b.section <= 2 ? 1 : 2,
      name: nameOf(state, b.playerId),
      withdrawn: isWithdrawn(state, b.playerId),
    })),
    byeHolders: named(state.qualification?.byeIds || []),
    byeTie: named(state.qualification?.byeTie?.tiedIds || []),
    qualifiers: named(state.qualification?.qualifierIds || []),
    championId: state.championId,
    payoutVersion: E.payoutVersionOf(state),
    transferTarget: E.isPayoutV2(state) ? 'the champion bonus' : 'the championship',
    championship: state.playoff?.confirmedAt ? E.championshipStatus(state) : { status: 'pending', reason: '' },
    transfers: E.computeEarnings(state).transfers.playoff.map((t) => ({ ...t, label: matchView(state, matches.find((m) => m.id === t.matchId)).label })),
  };
}

export function resultsView(state) {
  const rows = E.finalStandings(state).map((r) => ({ ...r, name: nameOf(state, r.playerId) }));
  const champ = state.playoff?.confirmedAt ? E.championshipStatus(state) : { status: 'pending', reason: '' };
  const v2 = E.isPayoutV2(state);
  const e = v2 ? E.computeEarnings(state) : null;
  return {
    rows,
    finalDone: champ.status === 'decided',
    championship: champ,
    payoutVersion: E.payoutVersionOf(state),
    championBonus: v2 ? e.championBonus : 0,
    bonusAwarded: v2 ? e.bonusAwarded : false,
  };
}
