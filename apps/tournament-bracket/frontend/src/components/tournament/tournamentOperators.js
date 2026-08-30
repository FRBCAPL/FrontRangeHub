/** Accounts that can always run Open Tournament / Cash Climb. */
const TOURNAMENT_OPERATOR_EMAILS = [
  'sslampro@gmail.com',
  'guest@guestmail.com',
];

export const LOGIN_RETURN_KEY = 'frontrange-login-return';

export function isTournamentOperator(email) {
  if (!email) return false;
  return TOURNAMENT_OPERATOR_EMAILS.includes(String(email).trim().toLowerCase());
}

export function rememberLoginReturn(path) {
  if (!path) return;
  try {
    sessionStorage.setItem(LOGIN_RETURN_KEY, path);
  } catch (_) {}
  try {
    localStorage.setItem('oauthReturnTo', path);
  } catch (_) {}
}

export function peekLoginReturn() {
  try {
    const fromSession = sessionStorage.getItem(LOGIN_RETURN_KEY);
    if (fromSession) return fromSession;
  } catch (_) {}
  try {
    return (localStorage.getItem('oauthReturnTo') || '').split('?')[0];
  } catch (_) {
    return '';
  }
}

export function clearLoginReturn() {
  try { sessionStorage.removeItem(LOGIN_RETURN_KEY); } catch (_) {}
  try { localStorage.removeItem('oauthReturnTo'); } catch (_) {}
}

export function consumeLoginReturn(fallback = '/ladder') {
  const stored = peekLoginReturn();
  clearLoginReturn();
  if (stored.startsWith('/tournament-bracket')) return '/tournament-bracket';
  if (stored.startsWith('/ladder')) return '/ladder';
  if (stored.startsWith('/league')) return '/league';
  if (stored && stored !== '/' && stored !== '/hub' && stored !== '/auth/callback') return stored;
  return fallback;
}
