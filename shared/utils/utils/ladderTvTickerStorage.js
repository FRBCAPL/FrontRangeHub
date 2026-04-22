/** localStorage key for TV match ticker scroll duration (seconds). */
export const LADDER_TV_TICKER_STORAGE_KEY = 'ladderTvTickerDurationSec';

/** Default when nothing saved (matches previous hardcoded TV default). */
export const LADDER_TV_TICKER_DEFAULT_SEC = 28;

export const LADDER_TV_TICKER_MIN_SEC = 6;
export const LADDER_TV_TICKER_MAX_SEC = 120;

/** Same-tab listeners (storage event only fires across tabs). */
export const LADDER_TV_TICKER_CHANGED_EVENT = 'ladderTvTickerDurationChanged';

/** Preset values for the TV links modal select (higher = slower scroll). */
export const LADDER_TV_TICKER_PRESET_SECS = [6, 8, 10, 12, 16, 20, 28, 40, 60, 80];

export function clampLadderTvTickerSec(n) {
  const x = Math.round(Number(n));
  if (!Number.isFinite(x)) return LADDER_TV_TICKER_DEFAULT_SEC;
  return Math.min(LADDER_TV_TICKER_MAX_SEC, Math.max(LADDER_TV_TICKER_MIN_SEC, x));
}

export function getLadderTvTickerDurationSec() {
  if (typeof window === 'undefined') return LADDER_TV_TICKER_DEFAULT_SEC;
  try {
    const raw = window.localStorage.getItem(LADDER_TV_TICKER_STORAGE_KEY);
    if (raw == null || raw === '') return LADDER_TV_TICKER_DEFAULT_SEC;
    return clampLadderTvTickerSec(Number(raw));
  } catch {
    return LADDER_TV_TICKER_DEFAULT_SEC;
  }
}

/** Persists and notifies open TV tabs in this browser. */
export function setLadderTvTickerDurationSec(seconds) {
  const v = clampLadderTvTickerSec(seconds);
  if (typeof window === 'undefined') return v;
  try {
    window.localStorage.setItem(LADDER_TV_TICKER_STORAGE_KEY, String(v));
    window.dispatchEvent(new CustomEvent(LADDER_TV_TICKER_CHANGED_EVENT, { detail: { seconds: v } }));
  } catch {
    /* ignore quota / private mode */
  }
  return v;
}

/**
 * Read ?tickerSec= from TV URL (react-router searchParams).
 * Returns null if missing or invalid (caller uses localStorage).
 */
export function parseTickerSecFromSearchParams(searchParams) {
  if (!searchParams || typeof searchParams.get !== 'function') return null;
  const mode = (searchParams.get('tickerMode') || '').toLowerCase();
  const forceOverride = mode === 'override' || searchParams.get('tickerOverride') === '1';
  if (!forceOverride) return null;
  const raw = searchParams.get('tickerSec');
  if (raw == null || String(raw).trim() === '') return null;
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return clampLadderTvTickerSec(n);
}

/**
 * Read tickerSec from the hash fragment (HashRouter URLs like #/ladder-tv?...&tickerSec=40).
 * Prefer this on the TV page so speed works even if react-router searchParams lag the hash.
 */
export function readTickerSecFromWindowHash() {
  if (typeof window === 'undefined') return null;
  try {
    const hash = window.location.hash || '';
    const q = hash.indexOf('?');
    if (q === -1) return null;
    const params = new URLSearchParams(hash.slice(q + 1));
    const mode = (params.get('tickerMode') || '').toLowerCase();
    const forceOverride = mode === 'override' || params.get('tickerOverride') === '1';
    if (!forceOverride) return null;
    const raw = params.get('tickerSec');
    if (raw == null || String(raw).trim() === '') return null;
    const n = Number(raw);
    if (!Number.isFinite(n)) return null;
    return clampLadderTvTickerSec(n);
  } catch {
    return null;
  }
}
