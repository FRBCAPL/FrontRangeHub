import { useCallback, useEffect, useRef, useState } from 'react';
import { createShowdownSync } from '../cloud/showdownSync.js';
import { loadSyncMeta } from '../cloud/showdownSyncStore.js';
import { settledSubmissions } from '../cloud/showdownPending.js';
import { cloudMessage } from '../cloud/showdownCloudApi.js';

const PENDING_MS = 2500;
const PULL_MS = 10000;
const TAKES_SCORES = ['qualifying', 'playoffs'];

/**
 * Cloud saving and phone scores for the open event.
 * `replaceState` must update the screen and tablet copy without queueing another save.
 */
export default function useShowdownCloud(api, state, replaceState) {
  const [sync, setSync] = useState({ status: 'idle', message: '' });
  const [pendingRows, setPendingRows] = useState([]);
  const [pendingError, setPendingError] = useState('');
  const stateRef = useRef(state);
  stateRef.current = state;
  const ctrl = useRef(null);
  if (!ctrl.current) ctrl.current = createShowdownSync({ api, onStatus: setSync, onReplace: (s) => replaceState(s) });

  useEffect(() => () => ctrl.current.stop(), []);

  useEffect(() => {
    if (stateRef.current?.id) ctrl.current.hydrate(stateRef.current);
  }, [state?.id]);

  useEffect(() => {
    if (!state?.id) return undefined;
    const pull = () => ctrl.current.pull();
    const timer = setInterval(pull, PULL_MS);
    window.addEventListener('focus', pull);
    return () => { clearInterval(timer); window.removeEventListener('focus', pull); };
  }, [state?.id]);

  const refreshPending = useCallback(async () => {
    const current = stateRef.current;
    if (!current?.id || !TAKES_SCORES.includes(current.status)) { setPendingRows([]); return; }
    const res = await api.pending(current.id);
    if (res.error) {
      setPendingError(res.code === 'unavailable' ? '' : `Phone scores could not be checked. ${cloudMessage(res.code)}`);
      return;
    }
    setPendingError('');
    const rows = Array.isArray(res.data) ? res.data : [];
    const meta = loadSyncMeta(current.id);
    const settled = meta.dirty ? [] : settledSubmissions(current, rows);
    if (settled.length) {
      await Promise.all(settled.map((s) => api.decide(s.id, s.decision, s.reason)));
      const settledIds = new Set(settled.map((s) => s.id));
      setPendingRows(rows.filter((r) => !settledIds.has(r.id)));
      return;
    }
    setPendingRows(rows);
  }, [api]);

  useEffect(() => {
    if (!state?.id || !TAKES_SCORES.includes(state.status)) { setPendingRows([]); return undefined; }
    refreshPending();
    const timer = setInterval(refreshPending, PENDING_MS);
    return () => clearInterval(timer);
  }, [state?.id, state?.status, refreshPending]);

  const reject = useCallback(async (sub, reason) => {
    const res = await api.decide(sub.id, 'rejected', reason);
    if (res.error) return `The rejection was not saved. ${cloudMessage(res.code)}`;
    setPendingRows((rows) => rows.filter((r) => r.id !== sub.id));
    return '';
  }, [api]);

  return {
    sync,
    queue: (next) => ctrl.current.queue(next),
    retry: () => ctrl.current.retry(),
    resolve: (choice) => ctrl.current.resolve(choice),
    reupload: () => ctrl.current.reupload(),
    pendingRows,
    pendingError,
    refreshPending,
    reject,
  };
}
