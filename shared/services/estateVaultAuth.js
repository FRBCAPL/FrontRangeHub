/**
 * Estate Vault — Personal Representative auth (Google OAuth or email/password).
 * Separate from Hub ladder OAuth / approval. Heirs/helpers stay invite-based.
 */
import { supabase } from '../config/supabase.js';
import { ESTATEIT_PATH } from '../utils/estateInventoryConstants.js';
import { estateBackendBase } from '../utils/estateBackend.js';
import { logEstateActivity } from './estateActivityLog.js';
import { checkUserDisabled } from './estateSuperAdminService.js';

export const ESTATE_VAULT_OAUTH_FLAG = '__ESTATE_VAULT_OAUTH__';

const MIN_PASSWORD_LEN = 8;

function fail(error) {
  const raw = typeof error === 'string' ? error : error?.message || 'Something went wrong.';
  return { success: false, error: raw };
}

function ok(data) {
  return { success: true, data };
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function sessionPayload(user) {
  if (!user?.id) return null;
  return {
    userId: user.id,
    email: user.email || null,
    name: user.user_metadata?.full_name || user.user_metadata?.name || null
  };
}

/** Block Estate Vault PR use when Super Admin has disabled the Auth user. */
async function rejectIfDisabled() {
  const check = await checkUserDisabled();
  // If the RPC is missing (migration not applied yet), do not lock anyone out.
  if (!check.success) return null;
  if (check.data?.disabled) {
    await supabase.auth.signOut();
    return fail(
      'This account has been disabled for Estate Vault. Contact the platform operator if you believe this is a mistake.'
    );
  }
  return null;
}

function authErrorMessage(error, fallback) {
  const msg = String(error?.message || fallback || 'Something went wrong.');
  if (/invalid login credentials/i.test(msg)) {
    return 'Incorrect email or password.';
  }
  if (/user already registered|already been registered/i.test(msg)) {
    return 'That email already has an account. Sign in instead.';
  }
  if (/email not confirmed|confirm your email/i.test(msg)) {
    return 'Check your email and confirm your address before signing in.';
  }
  if (/password.*characters|weak password/i.test(msg)) {
    return `Choose a password of at least ${MIN_PASSWORD_LEN} characters.`;
  }
  // Supabase could not hand the message to its mail provider, so the account
  // was never created. Google sign-in does not touch email delivery.
  if (/sending (the )?(confirmation|magic|recovery) (e-?mail|link)|smtp/i.test(msg)) {
    return 'We could not send the confirmation email right now. Use “Continue with Google” to sign in, or try email sign-up again later.';
  }
  if (/email rate limit|over_email_send_rate_limit/i.test(msg)) {
    return 'Too many emails were sent to this address recently. Wait a few minutes, or use “Continue with Google”.';
  }
  return msg;
}

export function estateVaultOAuthRedirectUrl() {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}/#${ESTATEIT_PATH}/oauth`;
}

/**
 * Start Google OAuth for Estate Vault PR identity.
 * Does not use Hub supabaseAuthService (avoids ladder approval / Hub redirect).
 */
export async function signInEstateOwnerWithGoogle() {
  try {
    localStorage.setItem(ESTATE_VAULT_OAUTH_FLAG, 'true');
  } catch {
    // ignore
  }

  const redirectTo = estateVaultOAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account'
      }
    }
  });

  if (error) return fail(error.message || 'Could not start Google sign-in.');

  if (data?.url) {
    const inIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (inIframe) window.top.location.href = data.url;
    else window.location.href = data.url;
  }

  return ok({ redirecting: true });
}

/**
 * Ask atlasbackend to create the account and deliver the confirmation email.
 * Returns null when the endpoint is unreachable so the caller can fall back to
 * Supabase's own mailer (older backend deploys have no /estate-auth route).
 */
async function signUpViaBackend(email, password, redirectTo) {
  let res;
  try {
    res = await fetch(`${estateBackendBase()}/api/estate-auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, redirectTo })
    });
  } catch {
    return null;
  }

  // 404 means the route isn't deployed yet, so the old Supabase path is the only
  // option — fall back. Every other status (incl. 503 "not configured") carries a
  // clear message; falling back to Supabase's rate-limited mailer would only make
  // it worse, so surface what the server said.
  if (res.status === 404) return null;

  const data = await res.json().catch(() => ({}));

  if (res.ok && data?.success) {
    return ok({
      needsEmailConfirmation: true,
      email,
      userId: data.userId || null,
      emailSent: data.emailSent !== false,
      warning: data.warning || ''
    });
  }

  if (data?.error) return fail(data.error);
  return null;
}

/**
 * Create a PR account with email + password.
 * Same owner identity model as Google — JWT email becomes owner_email on create/claim.
 */
export async function signUpEstateOwnerWithEmail(email, password) {
  const normalized = normalizeEmail(email);
  const pass = String(password || '');

  if (!normalized || !normalized.includes('@')) {
    return fail('Enter a valid email address.');
  }
  if (pass.length < MIN_PASSWORD_LEN) {
    return fail(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
  }

  const redirectTo = estateVaultOAuthRedirectUrl();

  const viaBackend = await signUpViaBackend(normalized, pass, redirectTo);
  if (viaBackend) {
    if (viaBackend.success) logEstateActivity({ eventType: 'pr_sign_up' });
    return viaBackend;
  }

  const { data, error } = await supabase.auth.signUp({
    email: normalized,
    password: pass,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        estate_vault_pr: true
      }
    }
  });

  if (error) return fail(authErrorMessage(error, 'Could not create account.'));

  const user = data?.user;
  const session = data?.session;

  // Email confirmation may be required — no session until confirmed
  if (!session?.user) {
    logEstateActivity({ eventType: 'pr_sign_up' });
    return ok({
      needsEmailConfirmation: true,
      email: normalized,
      userId: user?.id || null
    });
  }

  const payload = {
    needsEmailConfirmation: false,
    ...sessionPayload(session.user)
  };
  logEstateActivity({ eventType: 'pr_sign_up' });
  return ok(payload);
}

/**
 * Re-send the confirmation / sign-in link for an address that never confirmed.
 * Always reports success so the response cannot be used to test which addresses exist.
 */
export async function resendEstateOwnerConfirmation(email) {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) {
    return fail('Enter a valid email address.');
  }

  const redirectTo = estateVaultOAuthRedirectUrl();

  try {
    const res = await fetch(`${estateBackendBase()}/api/estate-auth/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: normalized, redirectTo })
    });

    // 404 (route missing) or 503 (server unconfigured): try Supabase instead.
    if (res.status !== 404 && res.status !== 503) {
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.success) return ok({ email: normalized });
      if (data?.error) return fail(data.error);
    }
  } catch {
    // fall through to Supabase
  }

  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: normalized,
    options: { emailRedirectTo: redirectTo }
  });
  if (error) return fail(authErrorMessage(error, 'Could not resend the email.'));
  return ok({ email: normalized });
}

/**
 * Sign in an existing PR with email + password.
 */
export async function signInEstateOwnerWithEmail(email, password) {
  const normalized = normalizeEmail(email);
  const pass = String(password || '');

  if (!normalized || !normalized.includes('@')) {
    return fail('Enter a valid email address.');
  }
  if (!pass) {
    return fail('Enter your password.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password: pass
  });

  if (error) return fail(authErrorMessage(error, 'Could not sign in.'));
  if (!data?.session?.user) return fail('Could not establish session.');

  const blocked = await rejectIfDisabled();
  if (blocked) return blocked;

  const payload = sessionPayload(data.session.user);
  logEstateActivity({ eventType: 'pr_sign_in' });
  return ok(payload);
}

/**
 * Establish Supabase session from OAuth tokens in the URL hash.
 * Skips Hub users-table approval checks entirely.
 */
export async function completeEstateVaultOAuth() {
  try {
    localStorage.removeItem(ESTATE_VAULT_OAUTH_FLAG);
  } catch {
    // ignore
  }

  const fullHash = typeof window !== 'undefined' ? window.location.hash || '' : '';
  const hashParts = fullHash.split('#');
  const tokenHash = hashParts[hashParts.length - 1] || '';

  if (tokenHash.includes('access_token')) {
    const params = new URLSearchParams(tokenHash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });
      if (error) return fail(error.message || 'Could not establish session.');
      if (data?.session?.user) {
        try {
          const pathOnly = `${window.location.pathname}${window.location.search}#${ESTATEIT_PATH}/oauth`;
          window.history.replaceState({}, document.title, pathOnly);
        } catch {
          // ignore
        }
        const payload = sessionPayload(data.session.user);
        logEstateActivity({ eventType: 'pr_sign_in' });
        return ok(payload);
      }
    }
  }

  // Fallback: session already persisted
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  if (sessionErr) return fail(sessionErr.message);
  if (sessionData?.session?.user) {
    const payload = sessionPayload(sessionData.session.user);
    logEstateActivity({ eventType: 'pr_sign_in' });
    return ok(payload);
  }

  return fail('No session found. Please try signing in again.');
}

export async function getEstateOwnerSession() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user?.id) {
    return { success: false, error: error?.message || 'Not signed in.', data: null };
  }
  const blocked = await rejectIfDisabled();
  if (blocked) return { success: false, error: blocked.error, data: null };
  return ok(sessionPayload(data.user));
}

/**
 * Sign out Estate Vault PR session only.
 * Does not clear heir/helper/auction localStorage keys.
 */
export async function signOutEstateOwner() {
  const { error } = await supabase.auth.signOut();
  if (error) return fail(error.message);
  return ok(true);
}

export default {
  ESTATE_VAULT_OAUTH_FLAG,
  estateVaultOAuthRedirectUrl,
  signInEstateOwnerWithGoogle,
  signUpEstateOwnerWithEmail,
  resendEstateOwnerConfirmation,
  signInEstateOwnerWithEmail,
  completeEstateVaultOAuth,
  getEstateOwnerSession,
  signOutEstateOwner
};
