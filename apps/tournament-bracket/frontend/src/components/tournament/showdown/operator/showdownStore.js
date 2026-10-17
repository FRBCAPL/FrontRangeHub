/** Tablet storage for Showdown events (local only until Phase 3 adds cloud saves). */
import { SHOWDOWN_TYPE } from '../showdownRules.js';

export const SHOWDOWN_STORAGE_KEY = 'frontrange-cash-climb-showdown';
export const SHOWDOWN_ARCHIVE_KEY = 'frontrange-cash-climb-showdown-archive';
const ARCHIVE_LIMIT = 20;

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function read(key) {
  try {
    const raw = storage()?.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function isShowdown(data) {
  return Boolean(data && data.id && data.type === SHOWDOWN_TYPE);
}

export function loadShowdown() {
  const data = read(SHOWDOWN_STORAGE_KEY);
  return isShowdown(data) ? data : null;
}

export function saveShowdown(state) {
  const store = storage();
  if (!store) return;
  if (!state) store.removeItem(SHOWDOWN_STORAGE_KEY);
  else store.setItem(SHOWDOWN_STORAGE_KEY, JSON.stringify(state));
}

export function listArchivedShowdowns() {
  const list = read(SHOWDOWN_ARCHIVE_KEY);
  return Array.isArray(list) ? list.filter(isShowdown) : [];
}

/** Keeps a copy of an event (newest first) so results survive starting a new one. */
export function archiveShowdown(state) {
  const store = storage();
  if (!store || !isShowdown(state)) return;
  const rest = listArchivedShowdowns().filter((s) => s.id !== state.id);
  store.setItem(SHOWDOWN_ARCHIVE_KEY, JSON.stringify([state, ...rest].slice(0, ARCHIVE_LIMIT)));
}

export function removeArchivedShowdown(id) {
  const store = storage();
  if (!store) return;
  store.setItem(SHOWDOWN_ARCHIVE_KEY, JSON.stringify(listArchivedShowdowns().filter((s) => s.id !== id)));
}
