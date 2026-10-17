/** What the Showdown TV shows for each phase, built from the public copy only. */
import { queueView, shootoutView, STATUS_LABELS, money } from '../operator/showdownView.js';
import { standingsView, bracketView, moneyView, resultsView } from '../operator/showdownBoardView.js';
import { formatTournamentDate } from '../../cash-climb/cashClimbEngine.js';

function standingsRows(event) {
  const v = standingsView(event);
  return {
    rows: v.rows.map((r) => ({ id: r.playerId, rank: r.rankLabel, name: r.name, wins: r.matchWins, gw: r.gamesWon, gl: r.gamesLost, status: r.status })),
    cutoffAfterIndex: v.cutoffAfterIndex,
    closeCalls: v.closeCalls,
    spots: v.spots,
    progress: `${v.completedMatches} of ${v.totalMatches} matches`,
  };
}

export function buildShowdownTvBoard(event) {
  if (!event || event.status === 'setup') return null;
  const m = moneyView(event);
  const base = {
    name: event.name,
    venue: event.venue || '',
    dateLabel: formatTournamentDate(event.tournamentDate),
    status: event.status,
    statusLabel: STATUS_LABELS[event.status] || event.status,
    pool: money(m.pool),
    paid: money(m.paid),
    championship: money(m.championship),
  };
  if (event.status === 'qualifying') {
    const q = queueView(event, 'qualifying');
    return { ...base, mode: 'qualifying', tables: q.onTable, upNext: [...q.ready, ...q.waiting].slice(0, 6), recent: q.done.slice(0, 8), standings: standingsRows(event) };
  }
  if (event.status === 'shootout') return { ...base, mode: 'shootout', shootout: shootoutView(event), standings: standingsRows(event) };
  if (event.status === 'bracket') return { ...base, mode: 'bracket', standings: standingsRows(event) };
  if (event.status === 'playoffs') {
    const q = queueView(event, 'playoff');
    const b = bracketView(event);
    return { ...base, mode: 'playoffs', tables: q.onTable, upNext: q.ready.slice(0, 4), rounds: b.rounds, byes: b.byes, championshipStatus: b.championship, transfers: b.transfers };
  }
  const r = resultsView(event);
  const champion = r.rows.find((x) => x.place === 1) || null;
  return {
    ...base,
    mode: 'completed',
    champion: champion ? { id: champion.playerId, name: champion.name, title: champion.stage, earnings: money(champion.earnings) } : null,
    final: r.rows.map((x) => ({ id: x.playerId, place: x.placeLabel, name: x.name, stage: x.stage, earnings: money(x.earnings) })),
    earnings: m.players.filter((p) => p.total > 0).map((p) => ({ id: p.playerId, name: p.name, total: money(p.total) })),
  };
}
