/** Plain view data for the Showdown operator screens. No React, no state changes. */
import * as E from '../showdownEngine.js';
import { playoffTemplate, roundLabel } from '../showdownPlayoffTemplates.js';

export const money = (n) => `$${Number(n || 0).toLocaleString('en-US')}`;

export const STATUS_LABELS = {
  setup: 'Setup',
  qualifying: 'Qualifying',
  shootout: 'Shootout',
  bracket: 'Bracket draw',
  playoffs: 'Playoffs',
  completed: 'Completed',
};

export function nameOf(state, id) {
  if (!id) return 'TBD';
  return state.players.find((p) => p.id === id)?.name || 'Unknown player';
}

export function isWithdrawn(state, id) {
  return Boolean(state.players.find((p) => p.id === id)?.withdrawnAt);
}

export function matchLabel(state, m) {
  if (m.phase === 'qualifying') return `Qualifying ${m.slot}`;
  const template = playoffTemplate(state.playoff?.templateId || state.payoutPlan?.templateId);
  const round = template?.rounds.find((r) => r.key === m.roundKey);
  return round && round.matches > 1 ? `${roundLabel(template, m.roundKey)} ${m.slot}` : roundLabel(template, m.roundKey);
}

export function sourceLabel(state, match, which) {
  const id = which === 1 ? match.p1 : match.p2;
  if (id) return nameOf(state, id);
  if (which === 1 ? match.empty1 : match.empty2) return 'Empty position';
  const source = which === 1 ? match.source1 : match.source2;
  if (source?.type === 'winner') {
    const feeder = state.matches.find((m) => m.id === source.matchId);
    return feeder ? `Winner of ${matchLabel(state, feeder)}` : 'TBD';
  }
  return 'TBD';
}

export function resultText(state, m) {
  if (m.status !== 'completed') return '';
  if (m.result === 'double-forfeit') return m.auto === 'withdrawal' ? 'Double forfeit \u2014 both withdrew, no winner' : 'Double forfeit \u2014 no winner';
  if (m.result === 'admin-bye') return `Administrative bye \u00b7 ${nameOf(state, m.winnerId)} advances (opponent position empty, no payout)`;
  if (m.result === 'champion-walkover') return `Champion by Walkover \u00b7 ${nameOf(state, m.winnerId)} (opponent position empty)`;
  if (m.result === 'empty') return 'Empty \u2014 both positions empty, nobody advances';
  if (m.result === 'vacated') return `Vacated \u00b7 ${nameOf(state, m.forfeitedBy?.[0])} withdrew, opponent position empty`;
  const loser = nameOf(state, m.forfeitedBy?.[0]);
  if (m.result === 'forfeit') return `${m.score1}\u2013${m.score2} \u00b7 forfeit by ${loser}`;
  if (m.result === 'walkover') return `Walkover \u00b7 ${loser} ${m.auto === 'withdrawal' ? 'withdrew' : 'forfeited'}`;
  return `${m.score1}\u2013${m.score2}`;
}

export function matchView(state, m) {
  return {
    id: m.id,
    phase: m.phase,
    roundKey: m.roundKey,
    section: m.section || null,
    label: matchLabel(state, m),
    p1: m.p1,
    p2: m.p2,
    p1Name: sourceLabel(state, m, 1),
    p2Name: sourceLabel(state, m, 2),
    p1Out: isWithdrawn(state, m.p1),
    p2Out: isWithdrawn(state, m.p2),
    status: m.status,
    table: m.table,
    hold: Boolean(m.hold),
    score1: m.score1,
    score2: m.score2,
    winnerId: m.winnerId,
    winnerName: m.winnerId ? nameOf(state, m.winnerId) : '',
    result: m.result,
    resultText: resultText(state, m),
    automatic: m.auto === 'empty-position',
    p1Empty: Boolean(m.empty1),
    p2Empty: Boolean(m.empty2),
    reason: E.notReadyReason(m, state.matches),
  };
}

/** Matches of one phase split into the groups the operator works from. */
export function queueView(state, phase) {
  const list = state.matches.filter((m) => m.phase === phase);
  const suggested = E.suggestNextMatch(list);
  const views = list.map((m) => matchView(state, m));
  return {
    onTable: views.filter((m) => m.status === 'on-table').sort((a, b) => a.table - b.table),
    ready: views.filter((m) => m.status === 'waiting' && !m.reason).sort((a, b) => (a.id === suggested?.id ? -1 : b.id === suggested?.id ? 1 : 0)),
    waiting: views.filter((m) => m.status === 'waiting' && m.reason),
    done: views.filter((m) => m.status === 'completed').reverse(),
    suggestedId: suggested?.id || null,
    freeTables: E.freeTables(state.matches, state.settings.tableCount),
    total: list.length,
    completed: list.filter((m) => m.status === 'completed').length,
  };
}

/** Each player's place in the circle and their two scheduled opponents. */
export function circleView(state) {
  const q = state.matches.filter((m) => m.phase === 'qualifying');
  return (state.circle || []).map((id, i) => {
    const mine = q.filter((m) => m.p1 === id || m.p2 === id);
    return {
      id,
      seat: i + 1,
      name: nameOf(state, id),
      withdrawn: isWithdrawn(state, id),
      opponents: mine.map((m) => {
        const opp = m.p1 === id ? m.p2 : m.p1;
        const mineFirst = m.p1 === id;
        const ownScore = m.result === 'played' ? `${mineFirst ? m.score1 : m.score2}\u2013${mineFirst ? m.score2 : m.score1}` : resultText(state, m);
        return { id: opp, name: nameOf(state, opp), matchId: m.id, label: matchLabel(state, m), done: m.status === 'completed', result: m.result, resultText: resultText(state, m), ownScore, won: m.winnerId === id };
      }),
    };
  });
}

export function shootoutView(state) {
  const list = state.shootouts || [];
  const sh = E.activeShootout(state) || list[list.length - 1];
  if (!sh) return null;
  const r = E.replayShootout(sh);
  const k = sh.groupIds.length;
  const toEliminate = k - sh.spots;
  const bye = E.shootoutKind(sh) === 'bye';
  return {
    id: sh.id,
    kind: bye ? 'bye' : 'cutoff',
    title: bye ? 'Bye shootout' : 'Qualification shootout',
    purpose: bye
      ? `These qualifiers are tied for the last opening bye${sh.spots === 1 ? '' : 's'}. Everyone here is already in the playoffs; the shootout only decides who skips the quarterfinal. Racks pay nothing and do not change standings.`
      : 'These players are tied at the playoff cutoff. Racks pay nothing and do not change standings.',
    spotLabel: bye ? `bye${sh.spots === 1 ? '' : 's'}` : `spot${sh.spots === 1 ? '' : 's'}`,
    survivorLabel: bye ? 'Bye' : 'Qualified',
    decidedLabel: bye ? 'Byes go to' : 'Qualified',
    active: r.status !== 'complete',
    status: r.status,
    spots: sh.spots,
    order: sh.order.map((id, i) => ({ id, seat: i + 1, name: nameOf(state, id), losses: r.losses[id] || 0, out: r.eliminated.includes(id), survivor: r.survivors.includes(id) })),
    lagPlayers: sh.order.slice(0, 2).map((id) => ({ id, name: nameOf(state, id) })),
    holder: r.holderId ? { id: r.holderId, name: nameOf(state, r.holderId) } : null,
    challenger: r.challengerId ? { id: r.challengerId, name: nameOf(state, r.challengerId) } : null,
    breaker: r.breakerId ? { id: r.breakerId, name: nameOf(state, r.breakerId) } : null,
    queue: (r.queue || []).map((id) => nameOf(state, id)),
    racks: r.racks.map((x) => ({ ...x, winnerName: nameOf(state, x.winnerId), loserName: nameOf(state, x.loserId), eliminatedName: x.eliminatedId ? nameOf(state, x.eliminatedId) : '' })),
    eliminationsLeft: Math.max(0, toEliminate - r.eliminated.length),
    survivors: r.survivors.map((id) => nameOf(state, id)),
    canUndo: Boolean(sh.lagWinnerId),
  };
}
