/**
 * Test-only devices for the Cash Climb (V3) sync tests: each has its own tablet storage and sync
 * bookkeeping, and they share one fake cloud. The network can be cut, and a call can "succeed in the
 * cloud but lose its answer" (lost acknowledgment). Never used by the app.
 */
import { createCashClimbV3FakeCloud } from './cashClimbV3FakeCloud.js';
import { createCashClimbV3CloudApi } from './cashClimbV3CloudApi.js';
import { createCashClimbV3Sync } from './cashClimbV3Sync.js';
import { createCashClimbV3SyncStore } from './cashClimbV3SyncStore.js';
import { cashClimbV3Store } from '../app/cashClimbV3Store.js';
import { restoreCashClimbV3Record } from '../app/cashClimbV3RecordCheck.js';
import { memoryStorage } from '../app/cashClimbV3AppTestKit.js';

export const OPERATOR = Object.freeze({ uid: 'u-op', email: 'operator@example.com' });

export function sharedCloud(operators = [{ uid: OPERATOR.uid }]) {
  return createCashClimbV3FakeCloud({ operators });
}

/** A Supabase-like client whose network can fail before or after the cloud acts. */
export function flakyClient(inner) {
  const net = { offline: false, loseNextAnswer: false, calls: 0 };
  return {
    net,
    async rpc(fn, args) {
      net.calls += 1;
      if (net.offline) return { data: null, error: new TypeError('Failed to fetch') };
      const res = await inner.rpc(fn, args);
      if (net.loseNextAnswer) { net.loseNextAnswer = false; return { data: null, error: new TypeError('Failed to fetch') }; }
      return res;
    },
  };
}

/** Pass another device's `storage` to model a second tab of the same browser (shared tablet storage). */
export function device(cloud, { user = OPERATOR, api: customApi, storage = memoryStorage(), requireUploadApproval = () => false } = {}) {
  const tablet = cashClimbV3Store(storage);
  const store = createCashClimbV3SyncStore({ storage });
  const client = flakyClient(cloud.client(user));
  const timers = [];
  const statuses = [];
  const sync = createCashClimbV3Sync({
    api: customApi || createCashClimbV3CloudApi({ client }),
    store,
    validate: (p) => restoreCashClimbV3Record(p).status === 'ok',
    onStatus: (s) => statuses.push(s.state),
    onReplace: (record) => { const r = tablet.save(record); if (r.error) throw new Error(r.error); },
    requireUploadApproval,
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimer: () => {},
  });
  /** Confirms an operator change: tablet first, then the cloud queue (as the app does). */
  const confirm = (record) => {
    const r = tablet.save(record);
    if (r.error) throw new Error(r.error);
    return sync.queue(record);
  };
  const fireRetry = async () => { const t = timers.shift(); if (t) await t.fn(); return t; };
  return { tablet, store, sync, net: client.net, timers, statuses, confirm, fireRetry, storage };
}
