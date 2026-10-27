import { elimFormatLabel } from './elimStatus.js';
import { formatMoney } from './break-and-run/breakAndRunMath.js';
import { savedStatusLabel } from './cash-climb/cashClimbSaved.js';
import { formatTournamentDate } from './cash-climb/cashClimbEngine.js';
import { isShowdownHubEvent, showdownStatusLabel, showdownSummaryFromLocal } from './showdown/cloud/showdownHub.js';
import { cashClimbFormatLabel } from './tournamentFormats.js';

export { isShowdownHubEvent };

export function isCurrentStatus(status) {
  return status !== 'completed' && status !== 'ended';
}

export function isCompletedStatus(status) {
  return status === 'completed' || status === 'ended';
}

/** Cash Climb: King of the Hill (the original format, id 'cash-climb'). */
export function isCashClimbHubEvent(item) {
  return item?.kind === 'cash-climb' || item?.type === 'cash-climb';
}

/** Cash Climb (the V3 engine, id 'cash-climb-v3'). */
export function isCashClimbV3HubEvent(item) {
  return item?.kind === 'cash-climb-v3' || item?.type === 'cash-climb-v3';
}

export function isBreakAndRunHubEvent(item) {
  return item?.kind === 'break-and-run' || item?.type === 'break-and-run';
}

const V3_STATUS_TEXT = { setup: 'Setup', 'in-progress': 'In progress', completed: 'Complete' };

export function hubFormatLabel(item) {
  if (isCashClimbV3HubEvent(item)) return cashClimbFormatLabel('cash-climb-v3');
  if (isShowdownHubEvent(item)) return cashClimbFormatLabel('showdown');
  if (isCashClimbHubEvent(item)) return cashClimbFormatLabel('cash-climb');
  if (isBreakAndRunHubEvent(item)) return 'Break and Run';
  return elimFormatLabel(item?.type) || 'Tournament';
}

/** One-line meta under the event name on Current / Completed lists. */
export function hubEventDetailLine(item) {
  if (isCashClimbV3HubEvent(item)) {
    const prize = Number(item.prizePoolCents) / 100;
    return [hubFormatLabel(item), V3_STATUS_TEXT[item.status] || item.status, item.tournamentDate ? formatTournamentDate(item.tournamentDate) : '', prize > 0 ? `Prize ${formatMoney(prize)}` : '', item.syncLabel || '']
      .filter(Boolean).join(' • ');
  }
  if (isShowdownHubEvent(item)) {
    return [hubFormatLabel(item), showdownStatusLabel(item.status), item.tournamentDate ? formatTournamentDate(item.tournamentDate) : '', item.venue || '']
      .filter(Boolean).join(' • ');
  }
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
  const fallback = isCash ? 'Cash Climb King of the Hill' : isBnr ? 'Break and Run' : 'Pool Tournament';
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
  showdownSaved = [],
  cashClimbV3Saved = [],
  localCashClimb,
  localElim,
  localBreakAndRun,
  localShowdown,
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
  showdownSaved.forEach((item) => put(item, 'showdown'));
  cashClimbV3Saved.forEach((item) => put(item, 'cash-climb-v3'));

  const localCc = summaryFromLocal(localCashClimb, 'cash-climb');
  const localEl = summaryFromLocal(localElim, 'elim');
  const localBnr = summaryFromLocal(localBreakAndRun, 'break-and-run');
  if (localCc) byId.set(localCc.id, localCc);
  if (localEl) byId.set(localEl.id, localEl);
  if (localBnr) byId.set(localBnr.id, localBnr);
  const localSd = showdownSummaryFromLocal(localShowdown);
  if (localSd) byId.set(localSd.id, localSd);

  return Array.from(byId.values());
}

export function filterCurrentEvents(events) {
  return events.filter((item) => isCurrentStatus(item.status));
}

export function filterCompletedEvents(events) {
  return events.filter((item) => isCompletedStatus(item.status));
}
