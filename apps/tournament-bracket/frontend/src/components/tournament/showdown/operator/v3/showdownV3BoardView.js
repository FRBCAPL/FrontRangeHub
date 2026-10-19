/** View data for the V3 match board and bracket. Never routed through the V1/V2 money or wording. */
import * as E from '../../showdownEngine.js';
import { playoffTemplate, finalRound } from '../../showdownPlayoffTemplates.js';
import { v3RoundLabels, v3RateFor } from '../../v3/showdownV3Rounds.js';
import { formatCents } from '../../v3/showdownV3Rules.js';
import { nameOf, isWithdrawn, matchView, queueView } from '../showdownView.js';

const dash = '\u2013';

/** "Round 1", or for the odd-field bridge "Round 1 for A · Round 2 for B". */
export function v3RoundLabel(state, m, labels = v3RoundLabels(state.matches.filter((x) => x.phase === 'qualifying'))) {
  const l = labels[m.id];
  if (!l) return '';
  if (!l.bridge) return `Round ${l.p1Round}`;
  return `Round ${l.p1Round} for ${nameOf(state, m.p1)} \u00b7 Round ${l.p2Round} for ${nameOf(state, m.p2)}`;
}

function gamesWord(n) {
  return `${n} game${n === 1 ? '' : 's'}`;
}

/** Result wording for V3: ties, partial forfeits that keep the games played, and interruptions. */
export function v3ResultText(state, m) {
  if (m.status !== 'completed') return '';
  const score = `${m.score1 ?? 0}${dash}${m.score2 ?? 0}`;
  const loser = nameOf(state, m.forfeitedBy?.[0]);
  switch (m.result) {
    case 'played':
      return m.winnerId ? score : `${score} tie`;
    case 'forfeit':
      return `Forfeit by ${loser} after ${score} (games played are kept; ${nameOf(state, m.winnerId)} gets an administrative credit for the rest)`;
    case 'walkover':
      return `Walkover \u00b7 ${loser} ${m.auto === 'withdrawal' ? 'withdrew' : 'forfeited'} at ${score}; ${nameOf(state, m.winnerId)} advances`;
    case 'double-forfeit':
      return `Double forfeit at ${score} \u2014 no winner, games played are kept`;
    case 'interrupted':
      return `Interrupted at ${score} \u2014 nobody wins the match, games played are kept`;
    default:
      return matchView(state, m).resultText;
  }
}

/** The extra line each V3 match card shows: its round, length and what it pays. */
export function v3MatchInfo(state, m, labels) {
  const plan = state.payoutPlan;
  if (m.phase === 'qualifying') {
    const l = labels[m.id];
    const rate = l && !l.bridge ? ` \u00b7 ${formatCents(v3RateFor(plan, l.p1Round))} per game won` : '';
    return `${v3RoundLabel(state, m, labels)} \u00b7 ${gamesWord(plan.qualifyingGames)}, all played (ties allowed)${rate}`;
  }
  const bonus = plan.ladder.perRound[m.roundKey];
  return `Race to ${plan.playoffRaceTo} \u00b7 ${formatCents(plan.rates.playoff)} per game won \u00b7 winner's bonus ${formatCents((bonus || 0) * 100)}`;
}

function withV3(state, view, labels) {
  const m = state.matches.find((x) => x.id === view.id);
  return { ...view, info: v3MatchInfo(state, m, labels), resultText: v3ResultText(state, m) };
}

export function queueViewV3(state, phase) {
  const labels = v3RoundLabels(state.matches.filter((m) => m.phase === 'qualifying'));
  const q = queueView(state, phase);
  const map = (list) => list.map((v) => withV3(state, v, labels));
  return { ...q, onTable: map(q.onTable), ready: map(q.ready), waiting: map(q.waiting), done: map(q.done) };
}

/** Bracket for V3: locked match-win bonuses per round, bye pay, race length and V3 result wording. */
export function bracketViewV3(state) {
  const plan = state.payoutPlan;
  const template = playoffTemplate(state.playoff?.templateId || plan?.templateId);
  if (!template) return null;
  const labels = {};
  const matches = state.matches.filter((m) => m.phase === 'playoff');
  const named = (ids) => ids.map((id) => ({ id, name: nameOf(state, id) }));
  return {
    templateId: template.id,
    size: template.size,
    positions: template.positions,
    drawn: Boolean(state.playoff?.drawnAt),
    confirmed: Boolean(state.playoff?.confirmedAt),
    rounds: template.rounds.map((r) => ({
      key: r.key,
      label: r.label,
      payout: plan.ladder.perRound[r.key],
      matches: matches.filter((m) => m.roundKey === r.key).map((m) => withV3(state, matchView(state, m), labels)),
    })),
    byeCount: template.byes,
    byePay: plan.ladder.bye,
    byes: (state.playoff?.byes || []).map((b) => ({ ...b, semifinal: b.section <= 2 ? 1 : 2, name: nameOf(state, b.playerId), withdrawn: isWithdrawn(state, b.playerId) })),
    byeHolders: named(state.qualification?.byeIds || []),
    byeTie: named(state.qualification?.byeTie?.tiedIds || []),
    qualifiers: named(state.qualification?.qualifierIds || []),
    championId: state.championId,
    payoutVersion: 3,
    transferTarget: 'the champion bonus',
    championship: state.playoff?.confirmedAt ? E.championshipStatus(state) : { status: 'pending', reason: '' },
    transfers: [],
    raceTo: plan.playoffRaceTo,
    gameRate: formatCents(plan.rates.playoff),
    formatAmount: (d) => formatCents(Math.round(Number(d || 0) * 100)),
    payWord: "winner's bonus",
    byeRule: 'a bye pays the bye amount locked in the payout plan',
    raceNote: `Every playoff match is a race to ${plan.playoffRaceTo}. Each game won pays ${formatCents(plan.rates.playoff)}; the match winner also gets the round's winner's bonus.`,
    championshipPay: formatCents(plan.ladder.perRound[finalRound(template).key] * 100),
  };
}
