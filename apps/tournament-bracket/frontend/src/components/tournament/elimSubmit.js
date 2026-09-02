export const ELIM_SUBMIT_HASH = '/tournament-bracket/elim';

export function elimSubmitHash(eventId) {
  const id = eventId != null ? String(eventId).trim() : '';
  if (!id) return ELIM_SUBMIT_HASH;
  return `${ELIM_SUBMIT_HASH}/${encodeURIComponent(id)}`;
}

export function elimSubmitEventId(pathname) {
  const prefix = `${ELIM_SUBMIT_HASH}/`;
  const path = String(pathname || '');
  if (!path.startsWith(prefix)) return '';
  const raw = path.slice(prefix.length).split('/')[0] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function isElimSubmitPath(pathname) {
  const path = String(pathname || '');
  return path === ELIM_SUBMIT_HASH || path.startsWith(`${ELIM_SUBMIT_HASH}/`);
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

export function pendingWinnerName(match, pending) {
  if (!match || !pending?.winner_id) return '';
  if (String(pending.winner_id) === String(match.player1_id)) return match.player1_name || '';
  if (String(pending.winner_id) === String(match.player2_id)) return match.player2_name || '';
  return String(pending.winner_id);
}
