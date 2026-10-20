/**
 * "Who are you?" on a player's phone: the player picks their name once per event and only their own
 * match offers Report score. It is a convenience, not security; the director still approves every score.
 */
const keyFor = (eventId) => `frph-showdown-me:${eventId}`;

function browserStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadMe(eventId, storage = browserStorage()) {
  try {
    return (eventId && storage?.getItem(keyFor(eventId))) || '';
  } catch {
    return '';
  }
}

export function saveMe(eventId, playerId, storage = browserStorage()) {
  try {
    if (!eventId || !storage) return;
    if (playerId) storage.setItem(keyFor(eventId), String(playerId));
    else storage.removeItem(keyFor(eventId));
  } catch {
    /* private browsing: the choice just isn't remembered */
  }
}

/** Players a phone can pick: still in the event, sorted by name. */
export function pickablePlayers(event) {
  return (event?.players || [])
    .filter((p) => p && !p.withdrawnAt)
    .slice()
    .sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), undefined, { numeric: true, sensitivity: 'base' }));
}

/** The remembered player, or null when they are not (or no longer) in the event. */
export function meIn(event, playerId) {
  if (!playerId) return null;
  return pickablePlayers(event).find((p) => p.id === playerId) || null;
}

export function isMyMatch(match, playerId) {
  return Boolean(playerId) && Boolean(match) && (match.p1 === playerId || match.p2 === playerId);
}
