/** Test-only helpers for the cloud tests: browser storage, an operator API and a sync controller. */
import { createFakeCloud, OPERATOR } from './showdownFakeCloud.js';
import { createShowdownCloud } from './showdownCloudApi.js';
import { createShowdownSync } from './showdownSync.js';

export function freshStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  globalThis.localStorage = {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
  return data;
}

export function apiFor(fake, user = OPERATOR) {
  return createShowdownCloud({ operator: fake.client(user), publicClient: fake.client(null) });
}

/** A sync controller whose retries are captured instead of scheduled. */
export function syncFor(api) {
  const timers = [];
  const replaced = [];
  const statuses = [];
  const sync = createShowdownSync({
    api,
    onStatus: (s) => statuses.push(s.status),
    onReplace: (s) => replaced.push(s),
    setTimer: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    clearTimer: () => {},
  });
  return { sync, timers, replaced, statuses, runTimers: async () => { const due = timers.splice(0); for (const t of due) await t.fn(); } };
}

export { createFakeCloud };
