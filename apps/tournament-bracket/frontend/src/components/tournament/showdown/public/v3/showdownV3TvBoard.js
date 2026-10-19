/** What the Showdown TV shows for a V3 event, from the public copy and the locked payout plan only. */
import { shootoutView, STATUS_LABELS } from '../../operator/showdownView.js';
import { resultsView } from '../../operator/showdownBoardView.js';
import { queueViewV3, bracketViewV3, v3RoundLabel } from '../../operator/v3/showdownV3BoardView.js';
import { standingsViewV3 } from '../../operator/v3/showdownV3StandingsView.js';
import { moneyViewV3, v3Dollars } from '../../operator/v3/showdownV3MoneyView.js';
import { v3PlanView } from '../../operator/v3/showdownV3PlanView.js';
import { formatTournamentDate } from '../../../cash-climb/cashClimbEngine.js';
import { v3RoundLabels } from '../../v3/showdownV3Rounds.js';
import { v3PublicProblem, v3PublicSettlement } from './showdownV3PublicView.js';

function standings(event) {
  const v = standingsViewV3(event);
  return {
    rows: v.rows.map((r) => ({ id: r.playerId, rank: r.rankLabel, name: r.name, total: r.total, wins: r.actualWins, credits: r.creditWins, status: r.status, statusText: r.statusText })),
    cutoffAfterIndex: v.cutoffAfterIndex,
    spots: v.spots,
    progress: v.locked ? 'final' : `${v.completedMatches} of ${v.totalMatches} matches`,
    tieText: v.tie ? `Tied at the cutoff: ${v.tieNames.join(', ')} \u2014 ${v.locked ? 'a shootout decides it' : 'a shootout decides it if it stands'}.` : '',
    hasCredits: v.hasCredits,
  };
}

function payout(plan) {
  const v = v3PlanView(plan);
  return {
    rates: [['Round 1 game', v.rates.r1], ['Round 2 game', v.rates.r2], ['Playoff game', v.rates.playoff]],
    bonuses: v.rounds.map((r) => [r.label, r.each]),
    bye: v.bye ? v.bye.each : '',
  };
}

function tableLines(event, list, labels) {
  return list.map((m) => {
    const match = event.matches.find((x) => x.id === m.id);
    const round = match.phase === 'qualifying' ? `${v3RoundLabel(event, match, labels)} \u00b7 ${event.payoutPlan.qualifyingGames} games` : `${m.label} \u00b7 race to ${event.payoutPlan.playoffRaceTo}`;
    return { ...m, round };
  });
}

function rounds(event) {
  const b = bracketViewV3(event);
  return {
    rounds: b.rounds.map((r) => ({
      key: r.key,
      label: r.label,
      bonus: b.formatAmount(r.payout),
      matches: r.matches.map((m) => ({ ...m, scoreText: m.status === 'completed' ? m.resultText : m.status === 'on-table' ? `On table ${m.table}` : '' })),
    })),
    byes: b.byes,
    byePay: b.formatAmount(b.byePay),
    raceNote: b.raceNote,
    championshipStatus: b.championship,
  };
}

export function buildShowdownV3TvBoard(event) {
  if (!event || event.status === 'setup' || v3PublicProblem(event)) return null;
  const plan = event.payoutPlan;
  const money = moneyViewV3(event);
  const labels = v3RoundLabels(event.matches.filter((m) => m.phase === 'qualifying'));
  const base = {
    v3: true,
    name: event.name,
    venue: event.venue || '',
    dateLabel: formatTournamentDate(event.tournamentDate),
    status: event.status,
    statusLabel: STATUS_LABELS[event.status] || event.status,
    formatLine: `Showdown V3 \u00b7 ${plan.qualifyingGames}-game qualifying matches \u00b7 playoff races to ${plan.playoffRaceTo}`,
    pool: money.pool,
    paid: money.paid,
    payout: payout(plan),
  };
  if (event.status === 'qualifying') {
    const q = queueViewV3(event, 'qualifying');
    return { ...base, mode: 'qualifying', tables: tableLines(event, q.onTable, labels), upNext: tableLines(event, [...q.ready, ...q.waiting].slice(0, 5), labels), recent: q.done.slice(0, 6), standings: standings(event) };
  }
  if (event.status === 'shootout') return { ...base, mode: 'shootout', shootout: shootoutView(event), standings: standings(event) };
  if (event.status === 'bracket') return { ...base, mode: 'bracket', standings: standings(event) };
  if (event.status === 'playoffs') {
    const q = queueViewV3(event, 'playoff');
    return { ...base, mode: 'playoffs', tables: tableLines(event, q.onTable, labels), ...rounds(event) };
  }
  const r = resultsView(event);
  const s = v3PublicSettlement(event);
  const champion = event.championId ? r.rows.find((x) => x.place === 1) : null;
  return {
    ...base,
    mode: 'completed',
    champion: champion ? { name: champion.name, title: champion.stage, earnings: v3Dollars(champion.earnings) } : null,
    settlement: s.lines,
    final: r.rows.map((x) => ({ id: x.playerId, place: x.placeLabel, name: x.name, stage: x.stage, earnings: v3Dollars(x.earnings) })),
  };
}
