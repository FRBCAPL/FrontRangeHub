/**
 * Cloud sync for the open Cash Climb (V3) tournament: one sync controller per tournament id.
 * On open it compares the tablet copy with the cloud; afterwards it sends every queued change, and picks
 * up changes from other devices (every 10 s, on focus, and when the connection returns) only while the
 * tablet has nothing unsent. `onReplace(record)` must save an adopted cloud copy on the tablet and show
 * it, without queueing it again.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { createCashClimbV3Sync } from '../cloud/cashClimbV3Sync.js';
import { restoreCashClimbV3Record } from './cashClimbV3RecordCheck.js';

const PULL_MS = 10000;
const validate = (payload) => restoreCashClimbV3Record(payload).status === 'ok';
/** Clouds where a tournament the cloud has never accepted needs the operator's approval before its first upload. */
export const APPROVAL_MODES = ['live', 'isolated'];

export default function useCashClimbV3Cloud({ recordId, record, cloud, syncStore, onReplace }) {
  const [status, setStatus] = useState(() => ({ state: recordId ? syncStore.meta(recordId).state : 'local-only', message: '', code: '' }));
  const ctrl = useRef(null);
  const ctrlId = useRef(null);
  const replaceRef = useRef(onReplace);
  replaceRef.current = onReplace;
  const recordRef = useRef(record);
  recordRef.current = record;

  if (recordId && ctrlId.current !== recordId) {
    ctrl.current?.stop();
    ctrl.current = createCashClimbV3Sync({
      api: cloud, store: syncStore, validate, onStatus: setStatus, onReplace: (r) => replaceRef.current(r),
      requireUploadApproval: () => APPROVAL_MODES.includes(cloud.mode()),
    });
    ctrlId.current = recordId;
  }

  useEffect(() => {
    if (!recordId || !recordRef.current) return undefined;
    const sync = ctrl.current;
    sync.hydrate(recordRef.current);
    const pull = () => { sync.pull(); };
    const reconnect = () => { sync.retry(); };
    const onVisible = () => { if (document.visibilityState === 'visible') pull(); };
    const timer = setInterval(pull, PULL_MS);
    window.addEventListener('focus', pull);
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', pull);
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', onVisible);
      sync.stop();
    };
  }, [recordId]);

  /** After a confirmed change saved on the tablet. Ignored for a tournament this hook is not syncing yet. */
  const queue = useCallback((next) => {
    if (next?.id && ctrlId.current === next.id) ctrl.current.queue(next);
  }, []);

  return {
    status,
    conflict: ctrl.current?.conflict || null,
    meta: recordId ? syncStore.meta(recordId) : null,
    mode: cloud.mode(),
    queue,
    observe: (next) => { if (next?.id && ctrlId.current === next.id) ctrl.current.observe(next); },
    retry: () => ctrl.current?.retry(),
    reupload: () => ctrl.current?.reupload(),
    approveUpload: () => ctrl.current?.approveUpload(),
    checkLatest: () => ctrl.current?.checkLatest() || Promise.resolve({ state: 'current' }),
    pull: () => ctrl.current?.pull(),
    useCloud: (opts) => ctrl.current?.useCloud(opts) || { ok: false, problem: 'No tournament is open.' },
    useTablet: () => ctrl.current?.useTablet() || Promise.resolve({ ok: false, problem: 'No tournament is open.' }),
    deleteFromCloud: () => ctrl.current?.deleteFromCloud() || Promise.resolve({ ok: false, problem: 'No tournament is open.' }),
  };
}
