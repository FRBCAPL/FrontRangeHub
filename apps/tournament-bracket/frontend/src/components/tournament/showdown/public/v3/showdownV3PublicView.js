/**
 * What players see about a V3 event, built from the public copy only. Rates, bonuses and match lengths
 * always come from the payout plan locked at the start; no V1/V2 wording or money is used.
 */
import { formatCents } from '../../v3/showdownV3Rules.js';
import { v3RoundLabels } from '../../v3/showdownV3Rounds.js';
import { formatSupportProblem, isPayoutV3 } from '../../showdownPayoutVersion.js';
import { matchView } from '../../operator/showdownView.js';
import { v3RoundLabel, v3ResultText } from '../../operator/v3/showdownV3BoardView.js';
import { v3PlanView } from '../../operator/v3/showdownV3PlanView.js';
import { moneyViewV3 } from '../../operator/v3/showdownV3MoneyView.js';

export const V3_PLAN_MISSING_MESSAGE = 'This event\u2019s payout plan is missing or incomplete, so its results cannot be shown. Ask the director.';

const whole = (n) => Number.isInteger(n) && n > 0;

/** '' when the public copy has everything the V3 screens need, otherwise why it cannot be shown. */
export function v3PublicProblem(event) {
  if (!event || !isPayoutV3(event) || formatSupportProblem(event)) return V3_PLAN_MISSING_MESSAGE;
  const p = event.payoutPlan;
  const ok = p && p.payoutVersion === 3 && whole(p.qualifyingGames) && whole(p.playoffRaceTo) && whole(p.poolCents)
    && p.rates && Number.isFinite(p.rates.r1) && Number.isFinite(p.rates.r2) && Number.isFinite(p.rates.playoff)
    && p.ladder?.perRound && p.templateId && Array.isArray(event.matches) && Array.isArray(event.players);
  return ok ? '' : V3_PLAN_MISSING_MESSAGE;
}

/** Entry fee, entrants and format for the page header. */
export function v3PublicFacts(event) {
  const p = event.payoutPlan;
  return [
    'Showdown V3',
    `Entry ${formatCents(p.entryFee * 100)}`,
    `${p.entrants} entrants`,
    `Qualifying: ${p.qualifyingGames} games per match`,
    `Playoffs: race to ${p.playoffRaceTo}`,
  ];
}

function stateText(event, m, v) {
  if (m.status === 'completed') return v3ResultText(event, m);
  if (m.status === 'on-table') return `On table ${m.table} now`;
  if (m.status === 'waiting' && !v.reason) return 'Ready to start';
  return 'Waiting for a player to finish another match';
}

/** Every qualifying match grouped by round, with its opponents, game count and score so far. */
export function v3PublicSchedule(event) {
  const q = event.matches.filter((m) => m.phase === 'qualifying');
  const labels = v3RoundLabels(q);
  const games = event.payoutPlan.qualifyingGames;
  const groups = new Map();
  q.forEach((m) => {
    const l = labels[m.id];
    const key = !l ? 'Qualifying' : l.bridge ? 'Round 1 / Round 2' : `Round ${l.p1Round}`;
    const v = matchView(event, m);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      id: m.id,
      roundText: v3RoundLabel(event, m, labels),
      p1Name: v.p1Name,
      p2Name: v.p2Name,
      gamesText: `${games} games`,
      done: m.status === 'completed',
      tie: m.status === 'completed' && m.result === 'played' && !m.winnerId,
      stateText: stateText(event, m, v),
    });
  });
  return [...groups.entries()].map(([title, matches]) => ({ title, matches }));
}

/** Plain-language payout rules with this event's locked amounts (no reserves or internal checks). */
export function v3PayoutRules(plan) {
  const v = v3PlanView(plan);
  const bonuses = v.rounds.map((r) => `${r.label} ${r.each}`).join(', ');
  return [
    `Every game you win pays. A Round 1 qualifying game pays ${v.rates.r1} and a Round 2 game pays ${v.rates.r2}.`,
    `Every qualifying match is ${v.qualifyingGames} games and every game is played, so a match can end in a tie.`,
    `The top ${v.qualifiers} in qualifying dollars reach the playoffs.${v.bye ? ` The top ${v.bye.count} get a bye to the semifinals worth ${v.bye.each}.` : ''}`,
    `Playoff matches are races to ${v.playoffRaceTo}. Each playoff game won pays ${v.rates.playoff}, and the match winner also earns the round\u2019s winner\u2019s bonus: ${bonuses}.`,
    'If a player forfeits, the games already played are paid to both players. The opponent gets an administrative credit for the unplayed games: it counts toward qualifying dollars, not games won.',
    `Money nobody wins (unplayed games, unused playoff game money) goes to the champion when the event is completed, so every cent of the ${v.pool} pool goes to players.`,
  ];
}

const OUTCOME_TEXT = {
  completed: 'Completed',
  interrupted: 'Interrupted',
  'interrupted-final': 'Interrupted during the final',
  abandoned: 'Ended early',
};

/** Where the money stands, worded for players. Problems are never itemized publicly. */
export function v3PublicSettlement(event) {
  const m = moneyViewV3(event);
  const lines = [];
  if (!m.reconciled) {
    lines.push('The director is reviewing the payouts.');
  } else if (m.outcome === 'in-progress') {
    lines.push(`${m.paid} of the ${m.pool} pool has been earned so far.${m.heldCents ? ` ${m.held} is still to be won.` : ''}`);
  } else if (m.outcome === 'completed') {
    lines.push(`Every cent of the ${m.pool} pool was paid to players.${m.recipients.length ? ` The money nobody won went to the champion, ${m.recipients.join(', ')}.` : ''}`);
  } else {
    lines.push(`The event ended early. Players keep everything they earned.${m.recipients.length ? ` The money still to be won was split among: ${m.recipients.join(', ')}.` : ''}`);
  }
  if (m.reconciled && m.unresolvedCents) lines.push(`${m.unresolved} is held for the director to review and pay out.`);
  if (m.reconciled && m.unawardedCents) lines.push(`${m.unawarded} was not awarded to any player; the director will review it.`);
  return {
    status: m.outcome === 'in-progress' ? 'In progress' : OUTCOME_TEXT[m.outcome] || 'Final',
    pool: m.pool,
    paid: m.paid,
    lines,
    earners: m.players.filter((p) => p.totalCents > 0),
  };
}
