/**
 * Per-event cloud bookkeeping on this tablet: the cloud version this copy is based on and whether
 * it has changes the cloud has not accepted yet. Conflict copies keep both sides of a disagreement
 * so choosing one never deletes the other.
 */
export const SHOWDOWN_SYNC_KEY = 'frontrange-cash-climb-showdown-sync';
export const SHOWDOWN_CONFLICT_KEY = 'frontrange-cash-climb-showdown-conflicts';
const CONFLICT_LIMIT = 10;

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readJson(key, fallback) {
  try {
    const raw = storage()?.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    storage()?.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the event itself is still saved under its own key */
  }
}

const EMPTY = { version: 0, dirty: false, syncedAt: '' };

export function loadSyncMeta(id) {
  const all = readJson(SHOWDOWN_SYNC_KEY, {});
  return { ...EMPTY, ...(all && id ? all[id] : null) };
}

export function saveSyncMeta(id, patch) {
  if (!id) return loadSyncMeta(id);
  const all = readJson(SHOWDOWN_SYNC_KEY, {}) || {};
  const next = { ...EMPTY, ...all[id], ...patch };
  writeJson(SHOWDOWN_SYNC_KEY, { ...all, [id]: next });
  return next;
}

export function listConflictCopies() {
  const list = readJson(SHOWDOWN_CONFLICT_KEY, []);
  return Array.isArray(list) ? list : [];
}

/** Keeps a full copy of one side of a conflict (newest first). */
export function keepConflictCopy(state, source, at = new Date().toISOString()) {
  if (!state?.id) return;
  writeJson(SHOWDOWN_CONFLICT_KEY, [{ source, keptAt: at, state }, ...listConflictCopies()].slice(0, CONFLICT_LIMIT));
}
