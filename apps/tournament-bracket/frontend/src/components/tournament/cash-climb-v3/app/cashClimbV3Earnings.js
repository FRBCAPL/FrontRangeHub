/**
 * Player earnings and the financial summary for Cash Climb (V3), read from the engine ledger
 * (ledgerSummary and ledger entries). Earned amounts are posted ledger entries only; "possible next
 * payout" is the next match's scheduled allocation, labelled as not yet earned.
 */
import { ledgerSummary } from '../cashClimbV3Ledger.js';
import { matchOccupants, survivors } from '../cashClimbV3Progress.js';
import { championshipSplit } from '../cashClimbV3Championship.js';
import { matchTitle, money, playerNameOf } from './cashClimbV3View.js';

const ENTRY_TEXT = Object.freeze({
  'score-split-winner': 'Won (score share)',
  'score-split-loser': 'Lost (score share)',
  'rack-earnings': 'Racks won before a withdrawal',
  'forfeit-award': 'Advanced by forfeit (half)',
  'walkover-award': 'Advanced by walkover (half)',
  'match-award': 'Round win',
  'champion-share': 'Champion share',
  'runner-up-share': 'Runner-up share',
  'champion-forfeit-award': 'Champion by forfeit (half share)',
  'champion-walkover-award': 'Champion by walkover (half share)',
  'finalist-bonus-champion': 'Finalist bonus (champion, 80%)',
  'finalist-bonus-runner-up': 'Finalist bonus (runner-up, 20%)',
});

export const entryLabel = (type) => ENTRY_TEXT[type] || type;

function nextMatchFor(event, playerId) {
  const id = event.order.find((mid) => event.matches[mid].status === 'open'
    && matchOccupants(event, mid).some((o) => o.kind === 'player' && o.id === playerId));
  if (!id) return null;
  const m = event.matches[id];
  let possible;
  if (m.stage !== 'later') possible = `shares the ${money(m.allocationCents)} match reserve by score`;
  else if (m.championship) {
    const split = championshipSplit(m.allocationCents / 100);
    possible = `champion ${money(split.champion * 100)} or runner-up ${money(split.runnerUp * 100)}, plus any finalist bonus`;
  } else possible = `a win adds ${money(m.allocationCents)}`;
  return { matchId: id, title: matchTitle(m), possible };
}

/** Every player with earned payouts by match, highest total first. */
export function playerEarnings(record) {
  const { event } = record;
  const name = playerNameOf(record);
  const live = record.status === 'in-progress';
  const alive = new Set(live ? survivors(event) : []);
  const rows = record.players.map((p) => {
    const byMatch = event.ledger.entries.filter((e) => e.playerId === p.id).map((e) => ({
      key: e.key,
      matchId: e.matchId,
      title: e.matchId ? matchTitle(event.matches[e.matchId]) : 'Settlement',
      label: entryLabel(e.type),
      cents: e.cents,
    }));
    return {
      id: p.id,
      name: name(p.id),
      totalCents: byMatch.reduce((a, e) => a + e.cents, 0),
      byMatch,
      alive: alive.has(p.id),
      next: alive.has(p.id) ? nextMatchFor(event, p.id) : null,
    };
  });
  return rows.sort((a, b) => b.totalCents - a.totalCents || a.name.localeCompare(b.name));
}

/** Summary lines, all straight from ledgerSummary. */
export function financialSummary(record) {
  const s = ledgerSummary(record.event.ledger);
  const settled = Boolean(record.event.settlement);
  const lines = [
    { key: 'prize', label: 'Total prize pool', cents: s.prizePoolCents },
    { key: 'opening', label: 'Opening reserves (preliminary and opening matches)', cents: s.openingReserveCents },
    { key: 'later', label: 'Later-round allocations (including the championship)', cents: s.laterScheduledCents },
    { key: 'earned', label: 'Earned by players', cents: s.earnedCents },
    { key: 'unsettled', label: 'Unsettled balance', cents: s.unsettledCents, note: 'Not yet paid: matches still to play plus unawarded money.' },
    { key: 'pending', label: 'Still to be played for (not yet earned)', cents: s.pendingAllocationCents },
    {
      key: 'unawarded',
      label: 'Unawarded funds',
      cents: s.unawardedCents,
      note: settled ? null : 'Paid to the two finalists (80/20) if the championship is completed; kept by the operator if it is not.',
    },
  ];
  if (s.operatorRetainedCents > 0 || record.event.settlement?.mode === 'exceptional') {
    lines.push({ key: 'retained', label: 'Retained by the operator (exceptional settlement)', cents: s.operatorRetainedCents });
  }
  return lines;
}
