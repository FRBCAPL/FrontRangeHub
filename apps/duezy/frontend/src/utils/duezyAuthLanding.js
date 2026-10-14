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

/**
 * `resetFlag` is set when Duezy sends a reset email: if Supabase didn't accept our
 * redirect it falls back to the site root (`#access_token=…&type=recovery`), so we
 * move that landing back to `#/duezy#…` where DuezyApp shows the new-password popup.
 */
export function duezyAuthLandingTarget(hash, flag, resetFlag = false) {
  const payload = duezyAuthPayload(hash);
  if (!/(^|&)(access_token|error|error_description)=/.test(payload)) return '';
  const isRecovery = /(^|&)type=recovery(&|$)/.test(payload);
  const expiredLink = !flag && /(^|&)error_code=otp_expired(&|$)/.test(payload);
  if (isRecovery || (resetFlag && expiredLink)) {
    const atRoot = !String(hash || '').startsWith('#/');
    return resetFlag && atRoot ? `#/duezy#${payload}` : '';
  }
  if (!flag) return '';
  if (String(hash || '').startsWith(`#${DUEZY_OAUTH_ROUTE}?`)) return '';
  return `#${DUEZY_OAUTH_ROUTE}?${payload}`;
}

/**
 * Password-reset landing: Supabase sends the reset link back to #/duezy with
 * `#access_token=…&refresh_token=…&type=recovery` added (or `error_description=…` when the link expired).
 * Returns { access_token, refresh_token }, { error }, or null when this isn't a reset landing.
 */
export function duezyRecoveryFromHash(hash) {
  const payload = duezyAuthPayload(hash);
  if (!payload) return null;
  const params = new URLSearchParams(payload);
  const failure = params.get('error_description') || params.get('error');
  const isRecovery = params.get('type') === 'recovery';
  if (failure && (isRecovery || /otp|expired|invalid/i.test(`${params.get('error_code')} ${failure}`))) {
    return { error: failure.replace(/\+/g, ' ') };
  }
  if (!isRecovery) return null;
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  return access_token && refresh_token ? { access_token, refresh_token } : { error: 'That reset link is incomplete.' };
}

const RESET_FLAG = '__DUEZY_RESET__';
const RESET_FLAG_MS = 24 * 60 * 60 * 1000;

function resetFlagSet(win) {
  try {
    const sent = Number(win.localStorage.getItem(RESET_FLAG));
    return Boolean(sent) && Date.now() - sent < RESET_FLAG_MS;
  } catch {
    return false;
  }
}

export function markDuezyResetSent(win = window) {
  try {
    win.localStorage.setItem(RESET_FLAG, String(Date.now()));
  } catch {
    // storage blocked — a root landing just won't be redirected
  }
}

export function applyDuezyAuthLanding(win = typeof window === 'undefined' ? null : window) {
  if (!win?.location) return false;
  const target = duezyAuthLandingTarget(win.location.hash, flagSet(win), resetFlagSet(win));
  if (!target) return false;
  if (target.startsWith('#/duezy#')) {
    try { win.localStorage.removeItem(RESET_FLAG); } catch { /* ignore */ }
  }
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
