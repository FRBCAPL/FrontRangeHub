const KEY = 'legends_session_token';

export function getLegendsSessionToken() {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setLegendsSessionToken(token) {
  try {
    if (token) localStorage.setItem(KEY, token);
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function clearLegendsSessionToken() {
  setLegendsSessionToken('');
}
