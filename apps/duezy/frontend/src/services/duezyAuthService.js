import duezy from './duezyClient.js';
import { DUEZY_OAUTH_ROUTE, clearDuezyOAuthFlag, markDuezyOAuthStart, markDuezyResetSent } from '../utils/duezyAuthLanding.js';

const redirectUrl = () => `${window.location.origin}/#/duezy`;

export async function signInWithGoogle() {
  markDuezyOAuthStart();
  const { data, error } = await duezy.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/#${DUEZY_OAUTH_ROUTE}`,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });
  if (error || !data?.url) {
    clearDuezyOAuthFlag();
    throw new Error(error?.message || 'Could not start Google sign-in.');
  }
  window.location.href = data.url;
}

/** Finish Google sign-in from the `#/duezy/oauth?access_token=…` landing. */
export async function completeOAuth(search) {
  clearDuezyOAuthFlag();
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const failure = params.get('error_description') || params.get('error');
  if (failure) throw new Error(failure.replace(/\+/g, ' '));
  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) throw new Error('Google sign-in did not finish. Try again.');
  const { error } = await duezy.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(error.message);
}

/** Sign in with the tokens from a password-reset link, so the new password can be saved. */
export async function startRecovery({ access_token, refresh_token }) {
  const { error } = await duezy.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? RESET_EXPIRED : error.message);
}

export async function updatePassword(password) {
  const { error } = await duezy.auth.updateUser({ password });
  if (error) {
    if (/different from the old/i.test(error.message)) throw new Error('Pick a password you haven’t used here before.');
    throw new Error(friendly(error.message));
  }
}

export const RESET_EXPIRED = 'That reset link has expired or was already used. Use “Forgot password?” to get a new one.';

export async function getSession() {
  const { data } = await duezy.auth.getSession();
  return data?.session || null;
}

export function onAuthChange(callback) {
  const { data } = duezy.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data?.subscription?.unsubscribe();
}

export async function signIn(email, password) {
  const { data, error } = await duezy.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(friendly(error.message));
  return data.session;
}

/** Returns { session } when signed in right away, or { needsConfirm: true } when email confirmation is on. */
export async function signUp(email, password, fullName) {
  const { data, error } = await duezy.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: redirectUrl(),
      data: { full_name: fullName?.trim() || null, app: 'duezy' },
    },
  });
  if (error) throw new Error(friendly(error.message));
  if (data.session) return { session: data.session };
  return { needsConfirm: true };
}

export async function sendReset(email) {
  markDuezyResetSent();
  const { error } = await duezy.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl() });
  if (error) throw new Error(friendly(error.message));
}

/**
 * Always ends the session on this device. If Supabase refuses (e.g. 403 for a session it already
 * ended), the stored Duezy session is removed by hand and the page reloads signed out.
 */
export async function signOut() {
  for (const scope of ['global', 'local']) {
    try {
      const { error } = await duezy.auth.signOut({ scope });
      if (!error) return;
    } catch {
      // try the next way
    }
  }
  try {
    // Clears the in-memory session too and tells other tabs, so nothing writes it back.
    await duezy.auth._removeSession?.();
  } catch {
    // fall back to clearing storage by hand
  }
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('duezy-auth'))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // storage unavailable; reload anyway
  }
  window.location.reload();
}

/** Send the sign-up confirmation email again. */
export async function resendConfirmation(email) {
  const { error } = await duezy.auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: redirectUrl() } });
  if (error) throw new Error(friendly(error.message));
}

export const EMAIL_SEND_FAILED = 'We couldn\'t send the email just now. Use "Continue with Google" above, or try again in a few minutes.';
export const NOT_CONFIRMED = 'Check your email and click the confirmation link first.';

/** Errors after which offering "resend confirmation email" makes sense. */
export const offersResend = (message) => message === NOT_CONFIRMED || message === EMAIL_SEND_FAILED;

function friendly(message = '') {
  if (/error sending .*email/i.test(message)) return EMAIL_SEND_FAILED;
  if (/rate limit|for security purposes/i.test(message)) return 'Too many tries — wait a minute and try again.';
  if (/invalid login/i.test(message)) return 'That email and password don\'t match.';
  if (/already registered/i.test(message)) return 'That email already has an account. Try logging in instead.';
  if (/email not confirmed/i.test(message)) return NOT_CONFIRMED;
  if (/password/i.test(message) && /6/.test(message)) return 'Password needs at least 6 characters.';
  return message || 'Something went wrong. Try again.';
}
