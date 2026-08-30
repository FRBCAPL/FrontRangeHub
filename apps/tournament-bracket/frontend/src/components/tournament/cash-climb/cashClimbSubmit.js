export const CASH_CLIMB_SUBMIT_HASH = '/tournament-bracket/submit';

export function cashClimbSubmitHref() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/#${CASH_CLIMB_SUBMIT_HASH}`;
}

export function openCashClimbSubmit() {
  const url = cashClimbSubmitHref();
  const opened = window.open(url, 'frontrange-cash-climb-submit');
  if (!opened) window.location.assign(url);
}

export function idsEqual(a, b) {
  if (a == null || b == null || a === '' || b === '') return false;
  return String(a) === String(b);
}

export function findMatchById(tournament, matchId) {
  return (tournament?.matches || []).find((m) => idsEqual(m.id, matchId)) || null;
}

export function pendingByMatchId(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    const id = row?.match_id != null ? String(row.match_id) : '';
    if (!id || map[id]) return;
    map[id] = row;
  });
  return map;
}

export function resolvePendingWinnerId(match, pending) {
  if (!match || !pending?.winner_id) return null;
  if (idsEqual(pending.winner_id, match.player1_id)) return match.player1_id;
  if (idsEqual(pending.winner_id, match.player2_id)) return match.player2_id;
  return null;
}

export function pendingWinnerName(match, pending) {
  if (!match || !pending?.winner_id) return '';
  if (idsEqual(pending.winner_id, match.player1_id)) return match.player1_name || '';
  if (idsEqual(pending.winner_id, match.player2_id)) return match.player2_name || '';
  return '';
}

export function openPendingSubmissions(tournament, submissions) {
  return (submissions || []).filter((row) => {
    const match = findMatchById(tournament, row.match_id);
    return Boolean(match && match.status === 'pending' && !match.is_bye);
  });
}

export function pendingApprovalLabel(count) {
  const n = Number(count) || 0;
  if (n === 1) return '1 match awaiting approval';
  return `${n} matches awaiting approval`;
}
