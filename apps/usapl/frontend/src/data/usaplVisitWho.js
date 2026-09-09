export function visitEmail(row) {
  return String(row?.visitor_email || '').trim().toLowerCase();
}

export function visitWhoKey(row) {
  return visitEmail(row) || String(row?.visitor_id || '');
}

export function visitIsMine(row, mineId = '', mineEmail = '') {
  const mine = String(mineEmail || '').trim().toLowerCase();
  const email = visitEmail(row);
  if (mine && email && email === mine) return true;
  if (mineId && row?.visitor_id === mineId) return true;
  return false;
}

export function visitWhoLabel(row, isMine) {
  if (isMine) return 'You';
  const email = String(row?.visitor_email || '').trim();
  return email || 'Guest';
}
