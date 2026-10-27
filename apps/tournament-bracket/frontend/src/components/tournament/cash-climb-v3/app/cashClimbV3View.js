/**
 * Display data for the Cash Climb (V3) bracket. Occupants, readiness and amounts come from the engine
 * event and ledger; nothing here calculates a payout.
 */
import { matchOccupants, matchReadiness } from '../cashClimbV3Progress.js';

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export const money = (cents) => `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: cents % 100 ? 2 : 0 })}`;

export function playerNameOf(record) {
  const names = new Map(record.players.map((p) => [p.id, p.name]));
  return (id) => names.get(id) || id;
}

export function matchTitle(match) {
  const n = match.id.split('-').pop().replace(/\D/g, '');
  if (match.stage === 'preliminary') return `Preliminary ${n}`;
  if (match.stage === 'opening') return `Opening ${n}`;
  return match.championship ? 'Championship' : `${match.label} ${n}`;
}

/** Rounds in play order: preliminary (when any), opening, later rounds, championship. */
export function bracketRounds(event) {
  const rounds = [];
  event.order.forEach((id) => {
    const m = event.matches[id];
    const key = m.stage === 'later' ? `r${m.round}` : m.stage;
    let round = rounds.find((r) => r.key === key);
    if (!round) {
      const label = m.stage === 'preliminary' ? 'Preliminary round' : m.stage === 'opening' ? 'Opening round' : m.label;
      round = { key, label, matchIds: [] };
      rounds.push(round);
    }
    round.matchIds.push(id);
  });
  return rounds;
}

const STATUS_TEXT = Object.freeze({
  completed: 'Final', forfeit: 'Forfeit', 'double-forfeit': 'Double forfeit', withdrawal: 'Withdrawal',
  'double-withdrawal': 'Double withdrawal', walkover: 'Walkover', void: 'Void',
});
const READINESS_TEXT = Object.freeze({ ready: 'Ready to play', waiting: 'Waiting for earlier results', automatic: 'Resolves automatically' });
const MONEY_LABEL = Object.freeze({ 'preliminary-reserve': 'Match reserve', 'opening-reserve': 'Match reserve', 'later-award': 'Win pays', championship: 'Championship allocation' });

function racksText(name, racks) {
  return Object.entries(racks).map(([id, n]) => `${name(id)} ${n}`).join(', ');
}

export function resultText(record, match) {
  const name = playerNameOf(record);
  const r = match.result;
  if (!r) return '';
  switch (r.outcome) {
    case 'completed': return `${name(r.winner)} won ${record.event.config.raceTo}–${r.loserRacks} over ${name(r.loser)}`;
    case 'forfeit': return `${name(r.forfeiting)} forfeited; ${name(r.winner)} advances`;
    case 'double-forfeit': return 'Both players forfeited; nobody advances';
    case 'withdrawal': return `${name(r.withdrawing)} withdrew (racks: ${racksText(name, r.racks)}); ${name(r.winner)} advances`;
    case 'double-withdrawal': return `Both players withdrew (racks: ${racksText(name, r.racks)}); nobody advances`;
    case 'walkover': return `${name(r.winner)} advances automatically (no opponent)`;
    case 'void': return 'No players reached this match; nobody advances';
    default: return r.outcome;
  }
}

/** One match as displayed: positions, status, result and money (allocation, paid, unawarded). */
export function matchCard(record, id) {
  const { event } = record;
  const name = playerNameOf(record);
  const m = event.matches[id];
  const occupants = matchOccupants(event, id);
  const readiness = matchReadiness(event, id);
  const paid = event.ledger.entries.filter((e) => e.matchId === id);
  const positions = m.slots.map((slot, i) => {
    const o = occupants[i];
    const from = slot.winnerOf ? matchTitle(event.matches[slot.winnerOf]) : null;
    if (o.kind === 'player') {
      return { kind: 'player', id: o.id, name: name(o.id), from, winner: m.winner === o.id, earnedCents: sum(paid.filter((e) => e.playerId === o.id).map((e) => e.cents)) };
    }
    if (o.kind === 'pending') return { kind: 'pending', name: `Winner of ${from}`, from };
    return { kind: 'vacant', name: 'Vacant (no player)', from };
  });
  const paidCents = sum(paid.map((e) => e.cents));
  return {
    id,
    title: matchTitle(m),
    stage: m.stage,
    championship: m.championship,
    readiness,
    status: m.status,
    statusText: m.status === 'open' ? READINESS_TEXT[readiness] : STATUS_TEXT[m.status] || m.status,
    resultText: resultText(record, m),
    moneyLabel: MONEY_LABEL[m.kind],
    allocationCents: m.allocationCents,
    paidCents,
    unawardedCents: m.status === 'open' ? 0 : m.allocationCents - paidCents,
    positions,
  };
}

/** The round to show first: the earliest round with a match ready to play, else the last round with any result. */
export function defaultRoundKey(record, rounds) {
  const { event } = record;
  const ready = rounds.find((r) => r.matchIds.some((id) => matchReadiness(event, id) === 'ready'));
  if (ready) return ready.key;
  const played = [...rounds].reverse().find((r) => r.matchIds.some((id) => event.matches[id].status !== 'open'));
  return (played || rounds[0]).key;
}
