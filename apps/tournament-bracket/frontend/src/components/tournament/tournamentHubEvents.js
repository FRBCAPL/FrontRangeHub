import { elimFormatLabel } from './elimStatus.js';

export function isCurrentStatus(status) {
  return status !== 'completed' && status !== 'ended';
}

export function isCompletedStatus(status) {
  return status === 'completed' || status === 'ended';
}

export function isCashClimbHubEvent(item) {
  return item?.kind === 'cash-climb' || item?.type === 'cash-climb';
}

export function hubFormatLabel(item) {
  if (isCashClimbHubEvent(item)) return 'Cash Climb';
  return elimFormatLabel(item?.type) || 'Tournament';
}

export function summaryFromLocal(tournament, kind) {
  if (!tournament?.id) return null;
  const isCash = kind === 'cash-climb';
  return {
    id: String(tournament.id),
    name: String(tournament.name || (isCash ? 'Cash Climb' : 'Pool Tournament')).trim() || 'Tournament',
    status: tournament.status || 'in-progress',
    type: isCash ? 'cash-climb' : (tournament.type || ''),
    kind,
    tournamentDate: tournament.tournamentDate || '',
    updatedAt: tournament.updated_at || '',
    tournament,
  };
}

export function mergeHubEvents({ cashClimbSaved = [], elimSaved = [], localCashClimb, localElim }) {
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

  const localCc = summaryFromLocal(localCashClimb, 'cash-climb');
  const localEl = summaryFromLocal(localElim, 'elim');
  if (localCc) byId.set(localCc.id, localCc);
  if (localEl) byId.set(localEl.id, localEl);

  return Array.from(byId.values());
}

export function filterCurrentEvents(events) {
  return events.filter((item) => isCurrentStatus(item.status));
}

export function filterCompletedEvents(events) {
  return events.filter((item) => isCompletedStatus(item.status));
}
