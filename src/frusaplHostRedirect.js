const FRUSAPL_HOSTS = new Set(['frusapl.com', 'www.frusapl.com']);

const SKIP_PATH_PREFIXES = ['/dues-tracker', '/arcade', '/estate-vault'];

export const FRUSAPL_PATH_TO_HASH = {
  '/': '#/usapl',
  '/usapl': '#/usapl',
  '/frusapl.html': '#/usapl',
  '/league-sign-up': '#/usapl/signup',
  '/vegas-cup': '#/usapl/vegas-cup',
  '/divisions': '#/usapl/divisions',
  '/rules-1': '#/usapl/rules',
  '/the-hub': '#/',
  '/ladder': '#/ladder',
  '/auth/callback': '#/auth/callback',
};

export function isFrusaplHost(hostname) {
  return FRUSAPL_HOSTS.has(String(hostname || '').toLowerCase());
}

/**
 * Only send a bare frusapl.com visit to the league app.
 * Keep ladder, Google return (#/auth/callback), and any other hash as-is.
 */
export function frusaplHostRedirectHash(hostname, pathname, hash) {
  if (!isFrusaplHost(hostname)) return null;

  const path = String(pathname || '').replace(/\/+$/, '') || '/';
  if (SKIP_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return null;
  }

  const fragment = String(hash || '');
  if (fragment.length > 1) return null;

  return FRUSAPL_PATH_TO_HASH[path] || '#/usapl';
}

export function applyFrusaplHostRedirect() {
  if (typeof window === 'undefined') return;
  const next = frusaplHostRedirectHash(
    window.location.hostname,
    window.location.pathname,
    window.location.hash
  );
  if (!next) return;
  const search = window.location.search || '';
  window.location.replace(`${window.location.origin}/${search}${next}`);
}
