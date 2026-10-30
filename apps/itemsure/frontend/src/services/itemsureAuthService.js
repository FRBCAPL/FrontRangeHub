import itemsure from './itemsureClient.js';
import { ITEMSURE_APP_CODE, ITEMSURE_PATH } from '../data/itemsureConstants.js';

const returnUrl = () => `${window.location.origin}/#${ITEMSURE_PATH}`;

export async function getSession() {
  const { data } = await itemsure.auth.getSession();
  return data?.session || null;
}

export function onAuthChange(callback) {
  const { data } = itemsure.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data?.subscription?.unsubscribe();
}

/** Finish an email link landing (confirmation or reset) with its tokens. */
export async function acceptEmailLink({ access_token, refresh_token }) {
  const { error } = await itemsure.auth.setSession({ access_token, refresh_token });
  if (error) throw new Error(/expired|invalid/i.test(error.message) ? 'That link has expired or was already used. Request a new one.' : error.message);
}

export async function signIn(email, password) {
  const { error } = await itemsure.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw new Error(friendly(error.message));
}

// Other hub apps reroute any returning Google tokens while their flag is set,
// so a stale flag would hand an ItemSure sign-in to the wrong app.
const OTHER_APP_OAUTH_FLAGS = ['__DUEZY_OAUTH__', '__DUES_TRACKER_OAUTH__', '__ESTATE_VAULT_OAUTH__'];

function clearOtherAppOAuthFlags() {
  try {
    OTHER_APP_OAUTH_FLAGS.forEach((key) => {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    });
  } catch {
    // storage unavailable
  }
}

/** Leaves the page for Google; the session comes back on #/itemsure like an email link. */
export async function signInWithGoogle() {
  clearOtherAppOAuthFlags();
  const { error } = await itemsure.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: returnUrl(), queryParams: { prompt: 'select_account' } },
  });
  if (error) throw new Error(friendly(error.message));
}

/** Returns { signedIn: true } or { needsConfirm: true }. */
export async function signUp({ email, password, fullName }) {
  const { data, error } = await itemsure.auth.signUp({
    email: email.trim().toLowerCase(),
    password,
    options: {
      emailRedirectTo: returnUrl(),
      data: { full_name: fullName.trim(), app: ITEMSURE_APP_CODE },
    },
  });
  if (error) throw new Error(friendly(error.message));
  if (data.session) return { signedIn: true };
  // With confirmation on, an email that already has a login comes back with no identities.
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    throw new Error('An account already uses this email. Sign in with that password instead.');
  }
  return { needsConfirm: true };
}

export async function sendReset(email) {
  const { error } = await itemsure.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: returnUrl() });
  if (error) throw new Error(friendly(error.message));
}

/**
 * Emails someone a sign-in link back to ItemSure (creating their login if needed),
 * where their waiting invite is shown. Does not touch the sender's own session.
 */
export async function sendInviteLink(email) {
  const { error } = await itemsure.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: returnUrl(), shouldCreateUser: true, data: { app: ITEMSURE_APP_CODE } },
  });
  if (error) throw new Error(friendly(error.message));
}

export async function updatePassword(password) {
  const { error } = await itemsure.auth.updateUser({ password });
  if (error) throw new Error(friendly(error.message));
}

export async function signOut() {
  try {
    await itemsure.auth.signOut({ scope: 'local' });
  } catch {
    // fall through to clearing storage
  }
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('itemsure-auth'))
      .forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // storage unavailable
  }
}

function friendly(message = '') {
  if (/rate limit|for security purposes/i.test(message)) return 'Too many tries. Wait a minute and try again.';
  if (/invalid login/i.test(message)) return 'That email and password don\u2019t match.';
  if (/already registered/i.test(message)) return 'An account already uses this email. Sign in instead.';
  if (/email not confirmed/i.test(message)) return 'Confirm your email first. The link is in your inbox.';
  if (/different from the old/i.test(message)) return 'Choose a password you haven\u2019t used before.';
  if (/error sending .*email/i.test(message)) return 'The email could not be sent just now. Try again in a few minutes.';
  if (/password/i.test(message)) return 'Use a password of at least 8 characters.';
  return message || 'Something went wrong. Try again.';
}
