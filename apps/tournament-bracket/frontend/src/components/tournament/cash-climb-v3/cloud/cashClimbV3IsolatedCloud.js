/**
 * Development-only isolated test cloud for Cash Climb (V3). It answers every cloud call from this browser's
 * storage using the same rules as the database functions (cashClimbV3FakeCloud.js). It has no Supabase
 * client, so nothing it does can reach the live database. Every tab of the browser shares it (calls are
 * serialized with Web Locks), so a second tab behaves like a second device reading the same cloud.
 *
 * Setting localStorage[CASH_CLIMB_V3_ISOLATED_OFFLINE_FLAG] = 'on' makes every call fail like a lost
 * connection, to test offline play.
 */
import { createCashClimbV3FakeCloud } from './cashClimbV3FakeCloud.js';
import { createCashClimbV3CloudApi } from './cashClimbV3CloudApi.js';

export const CASH_CLIMB_V3_ISOLATED_KEY = 'frph-cash-climb-v3-isolated-test-cloud';
export const CASH_CLIMB_V3_ISOLATED_OFFLINE_FLAG = 'cashClimbV3IsolatedOffline';

/** The operator every isolated call is made as. It exists only inside the isolated store. */
export const ISOLATED_OPERATOR = Object.freeze({ uid: 'isolated-test-operator', email: 'isolated-test@localhost' });

function browserStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readRows(storage) {
  try {
    const data = JSON.parse(storage?.getItem(CASH_CLIMB_V3_ISOLATED_KEY) || 'null');
    return Array.isArray(data?.rows) ? data.rows : [];
  } catch {
    return [];
  }
}

function acrossTabs(task) {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : null;
  return locks?.request ? locks.request(CASH_CLIMB_V3_ISOLATED_KEY, task) : task();
}

export function createCashClimbV3IsolatedCloud({ storage = browserStorage(), now } = {}) {
  const fake = createCashClimbV3FakeCloud({ operators: [{ uid: ISOLATED_OPERATOR.uid, canManageAll: true }], now });
  const inner = fake.client(ISOLATED_OPERATOR);
  let queue = Promise.resolve();

  const client = {
    rpc(fn, args) {
      const run = queue.then(() => acrossTabs(async () => {
        if (storage?.getItem(CASH_CLIMB_V3_ISOLATED_OFFLINE_FLAG) === 'on') {
          const error = new TypeError('Failed to fetch (isolated test cloud offline)');
          return { data: null, error };
        }
        fake.rows.clear();
        readRows(storage).forEach((row) => fake.rows.set(row.id, row));
        const res = await inner.rpc(fn, args);
        try {
          storage?.setItem(CASH_CLIMB_V3_ISOLATED_KEY, JSON.stringify({ rows: [...fake.rows.values()] }));
        } catch {
          return { data: null, error: { code: 'XX000', message: 'Isolated test cloud storage is full.' } };
        }
        return res;
      }));
      queue = run.catch(() => {});
      return run;
    },
  };

  return { ...createCashClimbV3CloudApi({ client }), isolated: true };
}

/** Removes every isolated test tournament from this browser. */
export function clearCashClimbV3IsolatedCloud(storage = browserStorage()) {
  storage?.removeItem(CASH_CLIMB_V3_ISOLATED_KEY);
}
