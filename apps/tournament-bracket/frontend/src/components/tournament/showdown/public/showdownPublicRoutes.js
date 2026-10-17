/**
 * Public Showdown links. They live under routes the site already serves publicly:
 * the player page under /tournament-bracket/submit and the TV under /tournament-bracket/tv.
 */
export const SHOWDOWN_PUBLIC_HASH = '/tournament-bracket/submit/showdown';
export const SHOWDOWN_TV_HASH = '/tournament-bracket/tv';

function origin() {
  return typeof window !== 'undefined' ? window.location.origin : '';
}

export function showdownPublicHash(eventId) {
  const id = eventId ? String(eventId).trim() : '';
  return id ? `${SHOWDOWN_PUBLIC_HASH}/${encodeURIComponent(id)}` : SHOWDOWN_PUBLIC_HASH;
}

export function showdownPublicHref(eventId) {
  return `${origin()}/#${showdownPublicHash(eventId)}`;
}

/** null when the path is not a Showdown page, '' for the event list, otherwise the event id. */
export function showdownPublicEventId(pathname) {
  const path = String(pathname || '');
  if (path === SHOWDOWN_PUBLIC_HASH) return '';
  if (!path.startsWith(`${SHOWDOWN_PUBLIC_HASH}/`)) return null;
  const raw = path.slice(SHOWDOWN_PUBLIC_HASH.length + 1).split('/')[0] || '';
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function showdownTvHref(eventId, layout = 'landscape') {
  const params = new URLSearchParams({ showdown: String(eventId || ''), layout: layout === 'portrait' ? 'portrait' : 'landscape' });
  return `${origin()}/#${SHOWDOWN_TV_HASH}?${params.toString()}`;
}

export function openShowdownTv(eventId, layout) {
  const url = showdownTvHref(eventId, layout);
  const opened = window.open(url, 'frontrange-showdown-tv');
  if (!opened) window.location.assign(url);
}
