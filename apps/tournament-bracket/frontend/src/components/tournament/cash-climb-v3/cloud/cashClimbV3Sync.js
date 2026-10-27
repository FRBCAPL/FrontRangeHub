/**
 * Keeps the tablet copy and the cloud copy of one Cash Climb (V3) tournament in step.
 * - Before the cloud first accepts it, the tablet copy is authoritative; afterwards the cloud revision is.
 * - The tablet copy is always saved first; every save names the cloud revision it is based on and the
 *   database refuses stale ones. Sync state changes only after the cloud confirms.
 * - A refused stale save is reconciled deterministically: adopt a cloud copy that already contains the
 *   tablet's progress, fast-forward a tablet copy that contains the cloud's, otherwise stop and show a
 *   conflict with both copies kept. Nothing is merged and nothing is overwritten silently.
 *
 * `validate(payload)` → true when a cloud copy restores exactly (record checks and engine replay); a cloud
 * copy that fails is never adopted. `onReplace(record)` hands an adopted cloud copy to the screen, which
 * must save it on the tablet without queueing another save.
 * `requireUploadApproval()` → true when a tournament the cloud has never accepted may only be sent after
 * the operator approves it (`approveUpload`), unless its bookkeeping already says `uploadApproved`.
 */
import { cloudMessage } from './cashClimbV3CloudApi.js';
import { compareCopies, copyDifferences } from './cashClimbV3Reconcile.js';

export const RETRY_MS = [3000, 10000, 30000, 60000];
const LOCAL_ONLY = ['cloud-disabled', 'dev-isolation-required', 'local-host-blocked', 'unavailable'];
const TRANSIENT = ['network', 'error'];
const STATE_FOR = { deleted: 'deleted', missing: 'missing', 'update-required': 'update-required' };
const MAX_FAST_FORWARDS = 3;
export const CHECK_TIMEOUT_MS = 4000;

export function createCashClimbV3Sync({
  api, store, validate, onStatus = () => {}, onReplace = () => {}, requireUploadApproval = () => false,
  setTimer = setTimeout, clearTimer = clearTimeout, now = () => new Date().toISOString(),
}) {
  let latest = null;
  let inflight = false;
  let retryTimer = null;
  let attempts = 0;
  let conflict = null;
  let status = { state: 'idle', message: '', code: '' };

  const id = () => latest?.id || null;
  function report(state, code = '', extra = {}) {
    status = { state, code, message: code ? cloudMessage(code) : '', conflict, ...extra };
    if (id()) store.saveMeta(id(), { state, error: code });
    onStatus(status);
    return status;
  }
  const clearRetry = () => { if (retryTimer) clearTimer(retryTimer); retryTimer = null; };
  function scheduleRetry() {
    clearRetry();
    const wait = RETRY_MS[Math.min(attempts, RETRY_MS.length - 1)];
    attempts += 1;
    retryTimer = setTimer(() => { retryTimer = null; return flush(); }, wait);
  }

  function adopt(row) {
    if (!validate(row.payload)) return report('error', 'cloud-invalid');
    latest = row.payload;
    store.saveMeta(row.id, { revision: row.revision, dirty: false, syncedAt: now() });
    onReplace(row.payload);
    return report('synced');
  }

  function openConflict(tablet, row) {
    conflict = { tablet, cloud: row.payload, cloudRevision: row.revision, differences: copyDifferences(tablet, row.payload) };
    return report('conflict', 'stale-revision');
  }

  /** Compares the newest tablet copy with a cloud row. Returns { retry: revision } for a fast-forward. */
  function settle(row) {
    if (!row) return { done: report('missing', 'missing') };
    if (row.deleted) return { done: report('deleted', 'deleted') };
    const relation = compareCopies(latest, row.payload);
    if (relation === 'same' || relation === 'cloud-contains') return { done: adopt(row) };
    if (relation === 'tablet-contains') return { retry: row.revision };
    return { done: openConflict(latest, row) };
  }

  function failed(res) {
    if (res.code === 'stale-revision') return report('error', 'error');
    if (STATE_FOR[res.code]) return report(STATE_FOR[res.code], res.code);
    if (LOCAL_ONLY.includes(res.code)) return report('local-only', res.code);
    if (TRANSIENT.includes(res.code)) {
      report(res.code === 'network' ? 'offline' : 'error', res.code);
      scheduleRetry();
      return status;
    }
    return report('error', res.code);
  }

  async function flush() {
    const record = latest;
    if (!record?.id || conflict) return status;
    if (inflight) return status;
    const meta = store.meta(record.id);
    // Another tab of this browser may already have sent the shared tablet copy; never resend over it.
    if (meta.revision && !meta.dirty) return report('synced');
    if (!meta.revision && !meta.uploadApproved && requireUploadApproval()) return report('needs-approval', 'upload-approval-required');
    inflight = true;
    clearRetry();
    report('sending');
    let sent = record;
    let res = await api.save(sent, store.meta(record.id).revision);
    for (let ff = 0; res.code === 'stale-revision' && ff < MAX_FAST_FORWARDS; ff += 1) {
      const cloud = await api.load(record.id);
      if (cloud.error) { res = cloud; break; }
      const step = settle(cloud.data);
      if (step.done) { inflight = false; return status; }
      sent = latest;
      res = await api.save(sent, step.retry);
    }
    inflight = false;
    if (res.error) return failed(res);
    attempts = 0;
    const newer = latest !== sent;
    store.saveMeta(sent.id, { revision: res.data.revision, dirty: newer, syncedAt: now() });
    return newer ? flush() : report('synced');
  }

  return {
    get status() { return status; },
    get conflict() { return conflict; },

    /** After every confirmed operator change (the tablet copy is already saved). */
    queue(record) {
      if (!record?.id) return Promise.resolve(status);
      if (latest && latest.id !== record.id) return Promise.resolve(status);
      latest = record;
      store.saveMeta(record.id, { dirty: true });
      if (conflict) {
        // Sync stays paused; the conflict always describes (and would archive) the newest tablet copy.
        conflict = { ...conflict, tablet: record, differences: copyDifferences(record, conflict.cloud) };
        return Promise.resolve(report('conflict', 'stale-revision'));
      }
      return flush();
    },

    retry() { attempts = 0; return conflict ? Promise.resolve(status) : flush(); },

    /**
     * A newer tablet copy saved by another tab of this browser (it sends its own changes): track it
     * without sending it. A conflict that tab resolved (the copies now match) closes here too.
     */
    observe(record) {
      if (!record?.id || record.id !== id()) return status;
      latest = record;
      if (!conflict) return status;
      if (compareCopies(record, conflict.cloud) === 'same') { conflict = null; return report('synced'); }
      conflict = { ...conflict, tablet: record, differences: copyDifferences(record, conflict.cloud) };
      return report('conflict', 'stale-revision');
    },

    /** First look at the cloud for a tournament opened on this tablet. */
    async hydrate(local) {
      if (!local?.id) return status;
      latest = local;
      conflict = null;
      const before = store.meta(local.id);
      const res = await api.load(local.id);
      if (latest !== local || inflight) return flush();
      if (res.error) return failed(res);
      const row = res.data;
      if (!row) return before.revision ? report('missing', 'missing') : flush();
      if (row.deleted) return report('deleted', 'deleted');
      if (row.revision === before.revision) return before.dirty ? flush() : report('synced');
      const step = settle(row);
      if (step.done) return status;
      store.saveMeta(local.id, { revision: step.retry, dirty: true });
      return flush();
    },

    /** Picks up changes saved from another device while this tablet has nothing unsent. */
    async pull() {
      if (!latest?.id || inflight || conflict) return false;
      const meta = store.meta(latest.id);
      if (meta.dirty || !meta.revision || ['deleted', 'missing', 'update-required'].includes(meta.state)) return false;
      const res = await api.load(latest.id);
      if (res.error || inflight || store.meta(latest.id).dirty) return false;
      if (!res.data) { report('missing', 'missing'); return false; }
      if (res.data.deleted) { report('deleted', 'deleted'); return false; }
      if (res.data.revision <= meta.revision) return false;
      return adopt(res.data).state === 'synced';
    },

    /**
     * Uses the cloud copy and archives the tablet copy. When the tablet has results or a settlement the cloud
     * lacks, `acknowledged` must confirm the operator knows they may need to be re-entered.
     */
    useCloud({ acknowledged = false } = {}) {
      if (!conflict) return { ok: false, problem: 'There is no conflict to resolve.' };
      const { tablet, cloud, cloudRevision, differences } = conflict;
      if (differences.needsAcknowledgment && !acknowledged) {
        return { ok: false, problem: 'Confirm that the tablet-only results may need to be entered again.' };
      }
      if (!validate(cloud)) return { ok: false, problem: cloudMessage('cloud-invalid') };
      const kept = store.keepConflictCopy({
        source: 'tablet', keptAt: now(), record: tablet, cloudRevision,
        tabletOnlyMatches: differences.tabletOnly, acknowledged: Boolean(acknowledged),
      });
      if (!kept) return { ok: false, problem: 'The tablet copy could not be archived on this device, so nothing was changed.' };
      conflict = null;
      adopt({ id: cloud.id, revision: cloudRevision, payload: cloud });
      return { ok: true };
    },

    /** Only for two setup copies (no results anywhere): send the tablet copy over the cloud's setup. */
    useTablet() {
      if (!conflict?.differences.setupOnly) return Promise.resolve({ ok: false, problem: 'Only setup changes can replace the cloud copy.' });
      const { tablet, cloud, cloudRevision } = conflict;
      store.keepConflictCopy({ source: 'cloud', keptAt: now(), record: cloud, cloudRevision, tabletOnlyMatches: [], acknowledged: true });
      conflict = null;
      latest = tablet;
      store.saveMeta(tablet.id, { revision: cloudRevision, dirty: true });
      return flush().then(() => ({ ok: true }));
    },

    /** Sends this tablet's copy again after the cloud lost it (never after a deletion: the cloud refuses). */
    reupload() {
      if (!latest?.id) return Promise.resolve(status);
      store.saveMeta(latest.id, { revision: 0, dirty: true, uploadApproved: true });
      return flush();
    },

    /** The operator reviewed a tournament the cloud has never accepted and approved its first upload. */
    approveUpload() {
      if (!latest?.id) return Promise.resolve(status);
      store.saveMeta(latest.id, { uploadApproved: true, dirty: true });
      return flush();
    },

    /**
     * Before a result is posted: asks the cloud whether it has a newer copy. Sends nothing of its own.
     *   current    post on the tablet copy: it is the newest known, or the cloud cannot say (offline, cloud
     *              off, never uploaded); offline results stay local-first and are sent later
     *   refreshed  a newer cloud copy passed validation and is now on the tablet: review again, then confirm
     *   conflict   the copies disagree; sync is paused until the operator chooses
     *   invalid    the newer cloud copy failed validation and was not used
     * The database still refuses any save based on an older revision; this only avoids most of them.
     */
    async checkLatest({ timeoutMs = CHECK_TIMEOUT_MS } = {}) {
      const record = latest;
      if (!record?.id) return { state: 'current' };
      if (conflict) return { state: 'conflict' };
      const before = store.meta(record.id);
      if (!before.revision) return { state: 'current' };
      let timer = null;
      const timeout = new Promise((resolve) => {
        timer = setTimeout(() => resolve({ data: null, error: new Error('timeout'), code: 'network' }), timeoutMs);
      });
      const res = await Promise.race([api.load(record.id), timeout]);
      clearTimeout(timer);
      if (latest !== record) return { state: 'refreshed' };
      if (res.error) return { state: 'current', offline: TRANSIENT.includes(res.code) };
      const row = res.data;
      if (!row || row.deleted) { settle(row); return { state: 'current' }; }
      if (row.revision <= store.meta(record.id).revision) return { state: 'current' };
      const unchanged = compareCopies(record, row.payload) === 'same';
      const step = settle(row);
      if (step.retry) {
        store.saveMeta(record.id, { revision: step.retry, dirty: true });
        flush();
        return { state: 'current' };
      }
      if (status.state === 'synced') return { state: unchanged ? 'current' : 'refreshed' };
      return { state: status.state === 'conflict' ? 'conflict' : 'invalid' };
    },

    /** Deletes an unstarted tournament from the cloud (a tombstone). The caller removes the tablet copy. */
    async deleteFromCloud() {
      if (!latest?.id) return { ok: false, problem: 'No tournament is open.' };
      if (latest.status !== 'setup') return { ok: false, problem: cloudMessage('not-deletable') };
      const res = await api.remove(latest.id, store.meta(latest.id).revision);
      if (res.error) return { ok: false, problem: cloudMessage(res.code), code: res.code };
      report('deleted');
      return { ok: true };
    },

    stop() { clearRetry(); },
  };
}
