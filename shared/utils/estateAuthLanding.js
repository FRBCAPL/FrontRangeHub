/**
 * Estate Vault — recover the auth payload from email confirmation links.
 *
 * Supabase's /auth/v1/verify endpoint sets the URL fragment on redirect_to when
 * it hands back the session. Our redirect_to is a hash route
 * (https://host/#/estateit/oauth), so the route is overwritten and the browser
 * lands on https://host/#access_token=... The router sees a hash that is not a
 * route, falls through to the catch-all, and the tokens are discarded.
 *
 * This module detects that landing and rewrites it to
 * #/estateit/oauth#<payload> so the normal OAuth callback finishes the sign-in.
 * It only fires on Estate Vault's own domain (or mid-flow, when the Google
 * sign-in flag is set), so Hub auth callbacks are never touched.
 */
import { ESTATEIT_PATH } from './estateInventoryConstants.js';

export const ESTATE_VAULT_OAUTH_FLAG = '__ESTATE_VAULT_OAUTH__';

const ESTATE_VAULT_HOSTS = ['fiduciarylog.com', 'www.fiduciarylog.com'];

const ERROR_KEYS = ['error_description', 'error_code', 'error'];

// Link types Estate Vault sends by email. Provider OAuth fragments carry no
// `type`, so requiring one keeps Hub Google callbacks out of this path.
const ESTATE_LINK_TYPES = ['signup', 'magiclink', 'invite', 'email_change'];

function fragmentOf(win) {
  const hash = win?.location?.hash || '';
  // Anything starting with #/ is already a router path — leave it alone. That
  // includes the correctly formed #/estateit/oauth#access_token=... case.
  if (!hash || hash.startsWith('#/')) return '';
  return hash.slice(1);
}

function parseFragment(fragment) {
  if (!fragment || !fragment.includes('=')) return null;
  try {
    return new URLSearchParams(fragment);
  } catch {
    return null;
  }
}

function oauthFlagSet(win) {
  try {
    return win.localStorage.getItem(ESTATE_VAULT_OAUTH_FLAG) === 'true';
  } catch {
    return false;
  }
}

function onEstateVaultHost(win) {
  const host = String(win?.location?.hostname || '').toLowerCase();
  return ESTATE_VAULT_HOSTS.includes(host);
}

/**
 * @returns {string} the hash to use (`#/estateit/oauth#...`), or '' to do nothing.
 */
export function estateAuthLandingTarget(win) {
  const fragment = fragmentOf(win);
  const params = parseFragment(fragment);
  if (!params) return '';

  const target = `#${ESTATEIT_PATH}/oauth#${fragment}`;
  const failed = ERROR_KEYS.some((key) => params.get(key));
  const hasToken = Boolean(params.get('access_token'));
  if (!failed && !hasToken) return '';

  // Mid-flow Google sign-in is unambiguous: we set the flag before leaving.
  if (oauthFlagSet(win)) return target;

  if (!onEstateVaultHost(win)) return '';

  // A failed link carries no session, so surfacing the reason is always safe.
  if (failed) return target;

  const type = String(params.get('type') || '').toLowerCase();
  return ESTATE_LINK_TYPES.includes(type) ? target : '';
}

/**
 * Rewrite the address bar before the router mounts. Uses replaceState so the
 * dead landing URL never enters history and no extra page load happens.
 * @returns {boolean} true when the URL was rewritten.
 */
export function applyEstateAuthLanding(win = typeof window === 'undefined' ? null : window) {
  if (!win?.location) return false;
  const target = estateAuthLandingTarget(win);
  if (!target) return false;
  try {
    win.history.replaceState(null, '', `${win.location.pathname}${win.location.search}${target}`);
    return true;
  } catch {
    win.location.hash = target;
    return true;
  }
}

/** Human-readable reason from an auth fragment, e.g. an expired confirmation link. */
export function estateAuthFragmentError(fragment) {
  if (!fragment) return '';
  let params;
  try {
    params = new URLSearchParams(String(fragment).replace(/^#/, ''));
  } catch {
    return '';
  }
  const description = params.get('error_description');
  const code = params.get('error_code') || params.get('error');
  if (!description && !code) return '';
  const text = (description || code || '').replace(/\+/g, ' ').trim();
  if (/expired/i.test(text)) {
    return 'That confirmation link has expired. Request a new one from the sign-in screen.';
  }
  return text || 'That sign-in link is no longer valid.';
}

export default {
  ESTATE_VAULT_OAUTH_FLAG,
  estateAuthLandingTarget,
  applyEstateAuthLanding,
  estateAuthFragmentError
};
