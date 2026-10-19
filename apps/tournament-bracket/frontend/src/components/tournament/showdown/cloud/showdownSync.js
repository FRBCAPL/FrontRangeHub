/**
 * Keeps the tablet copy and the cloud copy of one Showdown in step.
 * - The tablet copy is always written first; the cloud never decides whether a change is kept.
 * - Saves carry the cloud version they are based on; the database refuses stale saves.
 * - Disagreements become a visible conflict with both copies kept, never a silent overwrite.
 */
import { cloudMessage } from './showdownCloudApi.js';
import { loadSyncMeta, saveSyncMeta, keepConflictCopy } from './showdownSyncStore.js';

const RETRY_MS = [3000, 10000, 30000, 60000];
/** The database refused the save itself; retrying the same save cannot help. */
const REFUSALS = ['unavailable', 'not-authorized', 'invalid-event', 'too-large', 'update-required', 'unsupported-format', 'format-locked', 'plan-locked', 'event-settled', 'dev-isolation-required'];
/** Refusals that leave the event saved on this tablet only (not an error the operator caused). */
const LOCAL_ONLY = ['unavailable', 'dev-isolation-required'];

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).filter((k) => value[k] !== undefined).sort().map((k) => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value ?? null);
}

export function sameEvent(a, b) {
  return stable(a) === stable(b);
}

/** What to do when a tablet copy meets the cloud copy of the same event. */
export function reconcileCopies(local, meta, cloud) {
  if (!local) return { action: cloud ? 'use-cloud' : 'none' };
  if (!cloud) return { action: meta.version ? 'missing' : 'push' };
  if (cloud.version === meta.version) return { action: meta.dirty ? 'push' : 'none' };
  if (sameEvent(local, cloud.payload)) return { action: 'adopt' };
  if (cloud.version > meta.version && !meta.dirty && meta.version > 0) return { action: 'use-cloud' };
  return { action: 'conflict' };
}

/**
 * One controller per open event. `api` is the cloud API; `onStatus(status)` reports progress;
 * `onReplace(state)` hands a newer cloud copy to the screen (it must not queue a save).
 */
export function createShowdownSync({ api, onStatus = () => {}, onReplace = () => {}, setTimer = setTimeout, clearTimer = clearTimeout, now = () => new Date().toISOString() }) {
  let latest = null;
  let status = { status: 'idle', message: '' };
  let inflight = false;
  let again = false;
  let retryTimer = null;
  let attempts = 0;
  let conflict = null;

  const report = (patch) => { status = { ...status, ...patch }; onStatus(status); };
  const clearRetry = () => { if (retryTimer) clearTimer(retryTimer); retryTimer = null; };

  function scheduleRetry() {
    clearRetry();
    const wait = RETRY_MS[Math.min(attempts, RETRY_MS.length - 1)];
    attempts += 1;
    retryTimer = setTimer(() => { retryTimer = null; return flush(); }, wait);
  }

  async function openConflict(state) {
    const cloud = await api.load(state.id);
    conflict = { local: state, cloud: cloud.data || null };
    report({ status: 'conflict', message: cloudMessage('stale-version'), conflict });
  }

  async function flush() {
    const state = latest;
    if (!state?.id || conflict) return status;
    if (inflight) { again = true; return status; }
    inflight = true;
    clearRetry();
    report({ status: 'saving', message: '' });
    const meta = loadSyncMeta(state.id);
    const res = await api.save(state, meta.version);
    inflight = false;
    if (!res.error) {
      attempts = 0;
      const stillLatest = latest === state;
      saveSyncMeta(state.id, { version: res.data?.version ?? meta.version + 1, dirty: !stillLatest, syncedAt: now() });
      report({ status: 'saved', message: '', savedAt: now() });
      if (!stillLatest || again) { again = false; return flush(); }
      return status;
    }
    again = false;
    if (res.code === 'stale-version') { await openConflict(state); return status; }
    if (res.code === 'missing') { report({ status: 'missing', message: cloudMessage('missing') }); return status; }
    if (REFUSALS.includes(res.code)) {
      report({ status: LOCAL_ONLY.includes(res.code) ? 'local-only' : 'error', message: cloudMessage(res.code, state) });
      return status;
    }
    report({ status: 'offline', message: cloudMessage(res.code) });
    scheduleRetry();
    return status;
  }

  return {
    get status() { return status; },
    get conflict() { return conflict; },

    /** Call after every operator change (the tablet copy is already saved). */
    queue(state) {
      if (!state?.id) return Promise.resolve(status);
      latest = state;
      saveSyncMeta(state.id, { dirty: true });
      return flush();
    },

    retry() { attempts = 0; return flush(); },

    /** First look at the cloud for an event opened on this tablet. */
    async hydrate(local) {
      if (!local?.id) return status;
      latest = local;
      conflict = null;
      const before = loadSyncMeta(local.id);
      const cloud = await api.load(local.id);
      const after = loadSyncMeta(local.id);
      // A save started while we were looking; its result is newer than this comparison.
      if (inflight || latest !== local || after.version !== before.version) return status;
      if (cloud.error) {
        if (cloud.code === 'unavailable' || cloud.code === 'not-authorized') report({ status: cloud.code === 'unavailable' ? 'local-only' : 'error', message: cloudMessage(cloud.code, local) });
        else { report({ status: 'offline', message: cloudMessage(cloud.code) }); scheduleRetry(); }
        return status;
      }
      const { action } = reconcileCopies(local, after, cloud.data);
      if (action === 'push') return flush();
      if (action === 'adopt' || action === 'none') {
        saveSyncMeta(local.id, { version: cloud.data.version, dirty: false, syncedAt: now() });
        report({ status: 'saved', message: '' });
      } else if (action === 'use-cloud') {
        latest = cloud.data.payload;
        saveSyncMeta(local.id, { version: cloud.data.version, dirty: false, syncedAt: now() });
        onReplace(cloud.data.payload);
        report({ status: 'saved', message: 'Loaded the newer copy from the cloud.' });
      } else if (action === 'missing') {
        report({ status: 'missing', message: cloudMessage('missing') });
      } else if (action === 'conflict') {
        conflict = { local, cloud: cloud.data };
        report({ status: 'conflict', message: cloudMessage('stale-version'), conflict });
      }
      return status;
    },

    /** Picks up changes saved from another device while this tablet has nothing unsent. */
    async pull() {
      if (!latest?.id || inflight || conflict) return false;
      const meta = loadSyncMeta(latest.id);
      if (meta.dirty || !meta.version) return false;
      const cloud = await api.load(latest.id);
      if (cloud.error || !cloud.data || cloud.data.version <= meta.version) return false;
      if (loadSyncMeta(latest.id).dirty) return false;
      latest = cloud.data.payload;
      saveSyncMeta(latest.id, { version: cloud.data.version, dirty: false, syncedAt: now() });
      onReplace(cloud.data.payload);
      return true;
    },

    /** Conflict choice. Both copies are kept in the conflict store either way. */
    async resolve(choice) {
      if (!conflict) return status;
      const { local, cloud } = conflict;
      keepConflictCopy(local, 'tablet', now());
      if (cloud?.payload) keepConflictCopy(cloud.payload, 'cloud', now());
      conflict = null;
      if (choice === 'cloud' && cloud?.payload) {
        latest = cloud.payload;
        saveSyncMeta(local.id, { version: cloud.version, dirty: false, syncedAt: now() });
        onReplace(cloud.payload);
        report({ status: 'saved', message: 'Using the cloud copy. This tablet\u2019s copy was kept under conflict copies.', conflict: null });
        return status;
      }
      latest = local;
      saveSyncMeta(local.id, { version: cloud?.version || 0, dirty: true });
      report({ conflict: null });
      return flush();
    },

    /** Re-creates a removed cloud copy from this tablet (operator choice). */
    reupload() {
      if (!latest?.id) return Promise.resolve(status);
      saveSyncMeta(latest.id, { version: 0, dirty: true });
      return flush();
    },

    stop() { clearRetry(); },
  };
}
