import { elimFormatLabel } from './elimStatus.js';
import { formatMoney } from './break-and-run/breakAndRunMath.js';
import { savedStatusLabel } from './cash-climb/cashClimbSaved.js';
import { formatTournamentDate } from './cash-climb/cashClimbEngine.js';

export function isCurrentStatus(status) {
  return status !== 'completed' && status !== 'ended';
}

export function isCompletedStatus(status) {
  return status === 'completed' || status === 'ended';
}

export function isCashClimbHubEvent(item) {
  return item?.kind === 'cash-climb' || item?.type === 'cash-climb';
}

export function isBreakAndRunHubEvent(item) {
  return item?.kind === 'break-and-run' || item?.type === 'break-and-run';
}

export function hubFormatLabel(item) {
  if (isCashClimbHubEvent(item)) return 'Cash Climb';
  if (isBreakAndRunHubEvent(item)) return 'Break and Run';
  return elimFormatLabel(item?.type) || 'Tournament';
}

/** One-line meta under the event name on Current / Completed lists. */
export function hubEventDetailLine(item) {
  const bits = [
    hubFormatLabel(item),
    savedStatusLabel(item?.status),
    item?.tournamentDate ? formatTournamentDate(item.tournamentDate) : '',
  ];
  if (isBreakAndRunHubEvent(item)) {
    const pot = Number(item?.tournament?.currentPot);
    if (Number.isFinite(pot)) bits.push(`Pot ${formatMoney(pot)}`);
  } else if (isCashClimbHubEvent(item)) {
    const prize = Number(
      item?.tournament?.prizePool
      ?? item?.tournament?.totalPrizePool
      ?? item?.tournament?.stats?.prizePool
    );
    if (Number.isFinite(prize) && prize > 0) bits.push(`Prize ${formatMoney(prize)}`);
  }
  return bits.filter(Boolean).join(' • ');
}

export function summaryFromLocal(tournament, kind) {
  if (!tournament?.id) return null;
  const isCash = kind === 'cash-climb';
  const isBnr = kind === 'break-and-run';
  const fallback = isCash ? 'Cash Climb' : isBnr ? 'Break and Run' : 'Pool Tournament';
  return {
    id: String(tournament.id),
    name: String(tournament.name || fallback).trim() || 'Tournament',
    status: tournament.status || 'in-progress',
    type: isCash ? 'cash-climb' : isBnr ? 'break-and-run' : (tournament.type || ''),
    kind,
    tournamentDate: tournament.tournamentDate || '',
    updatedAt: tournament.updated_at || '',
    tournament,
  };
}

export function mergeHubEvents({
  cashClimbSaved = [],
  elimSaved = [],
  breakAndRunSaved = [],
  localCashClimb,
  localElim,
  localBreakAndRun,
}) {
  const byId = new Map();
  const put = (item, kind) => {
    if (!item?.id) return;
    const next = { ...item, kind: item.kind || kind };
    const prev = byId.get(next.id);
    if (!prev || String(next.updatedAt || '') >= String(prev.updatedAt || '')) {
      byId.set(next.id, next);
    }
  };

  cashClimbSaved.forEach((item) => put(item, 'cash-climb'));
  elimSaved.forEach((item) => put(item, 'elim'));
  breakAndRunSaved.forEach((item) => put(item, 'break-and-run'));

  const localCc = summaryFromLocal(localCashClimb, 'cash-climb');
  const localEl = summaryFromLocal(localElim, 'elim');
  const localBnr = summaryFromLocal(localBreakAndRun, 'break-and-run');
  if (localCc) byId.set(localCc.id, localCc);
  if (localEl) byId.set(localEl.id, localEl);
  if (localBnr) byId.set(localBnr.id, localBnr);

  return Array.from(byId.values());
}

export function filterCurrentEvents(events) {
  return events.filter((item) => isCurrentStatus(item.status));
}

export function filterCompletedEvents(events) {
  return events.filter((item) => isCompletedStatus(item.status));
}
