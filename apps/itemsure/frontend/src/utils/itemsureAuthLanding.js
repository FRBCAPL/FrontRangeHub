/**
 * Email links (sign-up confirmation, password reset) return to #/itemsure with the
 * session appended as a second fragment: #/itemsure#access_token=…&type=recovery.
 * The shared clients have detectSessionInUrl off, so ItemSure reads it here.
 *
 * Returns { type, access_token, refresh_token }, { error }, or null.
 */
export function itemsureAuthFromHash(hash) {
  const text = String(hash || '');
  if (!text.startsWith('#/itemsure')) return null;
  const second = text.indexOf('#', 1);
  if (second < 0) return null;

  let params;
  try {
    params = new URLSearchParams(text.slice(second + 1));
  } catch {
    return null;
  }

  const failure = params.get('error_description') || params.get('error');
  if (failure) {
    const reason = failure.replace(/\+/g, ' ');
    return { error: /expired|invalid/i.test(reason) ? 'That link has expired or was already used. Request a new one.' : reason };
  }

  const access_token = params.get('access_token');
  const refresh_token = params.get('refresh_token');
  if (!access_token || !refresh_token) return null;
  return { type: params.get('type') || '', access_token, refresh_token };
}
