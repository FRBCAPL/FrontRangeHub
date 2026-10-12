import duezy from './duezyClient.js';
import { DUEZY_OAUTH_ROUTE, clearDuezyOAuthFlag, markDuezyOAuthStart } from '../utils/duezyAuthLanding.js';

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
  const { error } = await duezy.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl() });
  if (error) throw new Error(friendly(error.message));
}

/** Always ends the session on this device, even if the server-side sign-out call fails. */
export async function signOut() {
  try {
    const { error } = await duezy.auth.signOut();
    if (!error) return;
  } catch {
    // fall through to local sign-out
  }
  await duezy.auth.signOut({ scope: 'local' });
}

function friendly(message = '') {
  if (/invalid login/i.test(message)) return 'That email and password don\'t match.';
  if (/already registered/i.test(message)) return 'That email already has an account. Try logging in instead.';
  if (/email not confirmed/i.test(message)) return 'Check your email and click the confirmation link first.';
  if (/password/i.test(message) && /6/.test(message)) return 'Password needs at least 6 characters.';
  return message || 'Something went wrong. Try again.';
}
