/**
 * Per-event cloud bookkeeping on this tablet: the cloud version this copy is based on and whether
 * it has changes the cloud has not accepted yet. Conflict copies keep both sides of a disagreement
 * so choosing one never deletes the other.
 *
 * The development isolated test cloud keeps its own bookkeeping, so switching the V3 preview on or off
 * never compares an isolated version with the live database (which looked like "Cloud copy removed").
 */
import { v3PreviewOn } from '../operator/v3/showdownV3Preview.js';

export const SHOWDOWN_SYNC_KEY = 'frontrange-cash-climb-showdown-sync';
export const SHOWDOWN_CONFLICT_KEY = 'frontrange-cash-climb-showdown-conflicts';
export const ISOLATED_SUFFIX = ':isolated-test-cloud';
const CONFLICT_LIMIT = 10;

const syncKey = () => (v3PreviewOn() ? SHOWDOWN_SYNC_KEY + ISOLATED_SUFFIX : SHOWDOWN_SYNC_KEY);
const conflictKey = () => (v3PreviewOn() ? SHOWDOWN_CONFLICT_KEY + ISOLATED_SUFFIX : SHOWDOWN_CONFLICT_KEY);

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
  const all = readJson(syncKey(), {});
  return { ...EMPTY, ...(all && id ? all[id] : null) };
}

export function saveSyncMeta(id, patch) {
  if (!id) return loadSyncMeta(id);
  const key = syncKey();
  const all = readJson(key, {}) || {};
  const next = { ...EMPTY, ...all[id], ...patch };
  writeJson(key, { ...all, [id]: next });
  return next;
}

/** True when this event was ever synced (or tried) with the isolated test cloud on this device, whatever the current mode. */
export function savedToIsolatedCloud(id) {
  const all = readJson(SHOWDOWN_SYNC_KEY + ISOLATED_SUFFIX, {});
  return Boolean(id && all && all[id]);
}

export function listConflictCopies() {
  const list = readJson(conflictKey(), []);
  return Array.isArray(list) ? list : [];
}

/** Keeps a full copy of one side of a conflict (newest first). */
export function keepConflictCopy(state, source, at = new Date().toISOString()) {
  if (!state?.id) return;
  writeJson(conflictKey(), [{ source, keptAt: at, state }, ...listConflictCopies()].slice(0, CONFLICT_LIMIT));
}
