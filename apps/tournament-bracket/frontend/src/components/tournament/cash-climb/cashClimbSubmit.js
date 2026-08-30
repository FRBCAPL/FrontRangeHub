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

export function pendingByMatchId(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    if (!row?.match_id || map[row.match_id]) return;
    map[row.match_id] = row;
  });
  return map;
}

export function pendingWinnerName(match, pending) {
  if (!match || !pending?.winner_id) return '';
  if (pending.winner_id === match.player1_id) return match.player1_name || '';
  if (pending.winner_id === match.player2_id) return match.player2_name || '';
  return '';
}
