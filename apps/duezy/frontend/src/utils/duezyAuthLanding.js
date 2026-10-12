/**
 * Duezy Google sign-in landing.
 *
 * Supabase returns OAuth tokens in the URL fragment, which overwrites our hash route
 * (the browser lands on https://host/#access_token=...). Before the router mounts we
 * rewrite that to #/duezy/oauth?<payload> so DuezyApp can finish sign-in on its own
 * client. It only fires while the Duezy flag is set, so Hub, Estate Vault and the
 * operator dues tracker callbacks are never touched.
 */
export const DUEZY_OAUTH_FLAG = '__DUEZY_OAUTH__';
export const DUEZY_OAUTH_ROUTE = '/duezy/oauth';

const OTHER_APP_FLAGS = ['__DUES_TRACKER_OAUTH__', '__ESTATE_VAULT_OAUTH__'];

function flagSet(win) {
  try {
    return win.localStorage.getItem(DUEZY_OAUTH_FLAG) === 'true' || win.sessionStorage.getItem(DUEZY_OAUTH_FLAG) === 'true';
  } catch {
    return false;
  }
}

/** Auth payload from `#access_token=…`, `#/duezy/oauth#access_token=…` or `#/duezy/oauth?access_token=…`. */
export function duezyAuthPayload(hash) {
  if (!hash) return '';
  if (!hash.startsWith('#/')) return hash.slice(1);
  const second = hash.indexOf('#', 1);
  if (second > 0) return hash.slice(second + 1);
  const q = hash.indexOf('?');
  return q > 0 ? hash.slice(q + 1) : '';
}

export function duezyAuthLandingTarget(hash, flag) {
  if (!flag) return '';
  if (String(hash || '').startsWith(`#${DUEZY_OAUTH_ROUTE}?`)) return '';
  const payload = duezyAuthPayload(hash);
  if (!/(^|&)(access_token|error|error_description)=/.test(payload)) return '';
  return `#${DUEZY_OAUTH_ROUTE}?${payload}`;
}

export function applyDuezyAuthLanding(win = typeof window === 'undefined' ? null : window) {
  if (!win?.location) return false;
  const target = duezyAuthLandingTarget(win.location.hash, flagSet(win));
  if (!target) return false;
  try {
    win.history.replaceState(null, '', `${win.location.pathname}${win.location.search}${target}`);
  } catch {
    win.location.hash = target;
  }
  return true;
}

export function markDuezyOAuthStart(win = window) {
  try {
    win.localStorage.setItem(DUEZY_OAUTH_FLAG, 'true');
    win.sessionStorage.setItem(DUEZY_OAUTH_FLAG, 'true');
    OTHER_APP_FLAGS.forEach((k) => {
      win.localStorage.removeItem(k);
      win.sessionStorage.removeItem(k);
    });
  } catch {
    // storage blocked — the landing rewrite simply won't run
  }
}

export function clearDuezyOAuthFlag(win = window) {
  try {
    win.localStorage.removeItem(DUEZY_OAUTH_FLAG);
    win.sessionStorage.removeItem(DUEZY_OAUTH_FLAG);
  } catch {
    // ignore
  }
}
