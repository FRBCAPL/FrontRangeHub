/**
 * Development-only isolated test cloud. It answers every Showdown cloud call (operator saves, the event
 * list, phone submissions, pending scores, the public and TV reads) from this browser's storage, using
 * the same rules as the database functions (showdownFakeCloud.js). It has no Supabase client, so nothing
 * it does can reach the live database. Every tab of the same browser shares it, so the player page and
 * the TV can follow an event run in another tab.
 */
import { createFakeCloud } from './showdownFakeCloud.js';
import { createShowdownCloud } from './showdownCloudApi.js';

export const ISOLATED_CLOUD_KEY = 'frph-showdown-isolated-test-cloud';

/** The operator every isolated save is made as. Only exists inside the isolated store. */
export const ISOLATED_OPERATOR = { uid: 'isolated-test-operator', email: '', admin: true };

function browserStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function readStore(storage) {
  try {
    const raw = storage?.getItem(ISOLATED_CLOUD_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return { events: Array.isArray(data?.events) ? data.events : [], pending: Array.isArray(data?.pending) ? data.pending : [] };
  } catch {
    return { events: [], pending: [] };
  }
}

const randomId = () => `isolated-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Runs the task while holding a lock shared by every tab of this browser, when the browser has Web Locks. */
function acrossTabs(task) {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : null;
  return locks?.request ? locks.request(ISOLATED_CLOUD_KEY, task) : task();
}

/** Calls run one at a time (in this tab and, with Web Locks, across tabs), so a read can never write back a copy older than a save. */
let queue = Promise.resolve();
function serialized(task) {
  const run = queue.then(() => acrossTabs(task), () => acrossTabs(task));
  queue = run.catch(() => {});
  return run;
}

const byId = (rows) => new Map(rows.map((r) => [r.id, JSON.stringify(r)]));

/** Applies only the rows this call changed onto the latest stored copy, so another tab's changes are kept. */
function mergeChanges(latest, before, after) {
  const out = new Map(latest.map((r) => [r.id, r]));
  const afterRows = new Map(after.map((r) => [r.id, r]));
  const b = byId(before);
  const a = byId(after);
  for (const id of new Set([...b.keys(), ...a.keys()])) {
    if (b.get(id) === a.get(id)) continue;
    if (afterRows.has(id)) out.set(id, afterRows.get(id));
    else out.delete(id);
  }
  return [...out.values()];
}

export function createIsolatedCloud({ storage = browserStorage(), now = () => Date.now(), newId = randomId } = {}) {
  const fake = createFakeCloud({ now, newId });

  const current = () => ({ events: [...fake.events.values()], pending: [...fake.pending] });
  const load = () => {
    const data = readStore(storage);
    fake.events.clear();
    data.events.forEach((row) => fake.events.set(row.id, row));
    fake.pending.splice(0, fake.pending.length, ...data.pending);
    return JSON.parse(JSON.stringify(current()));
  };
  const persist = (before) => {
    const after = current();
    if (JSON.stringify(after) === JSON.stringify(before)) return;
    const latest = readStore(storage);
    const merged = {
      events: mergeChanges(latest.events, before.events, after.events),
      pending: mergeChanges(latest.pending, before.pending, after.pending),
    };
    try {
      storage?.setItem(ISOLATED_CLOUD_KEY, JSON.stringify(merged));
    } catch {
      /* storage full: the call already returned its result; the next call reloads what was stored */
    }
  };
  const client = (user) => {
    const inner = fake.client(user);
    return {
      rpc(fn, args) {
        return serialized(async () => {
          const before = load();
          try {
            return await inner.rpc(fn, args);
          } finally {
            persist(before);
          }
        });
      },
    };
  };

  const api = createShowdownCloud({ operator: client(ISOLATED_OPERATOR), publicClient: client(null) });
  return { ...api, isolated: true };
}

/** Removes every isolated test event and phone score from this browser. */
export function clearIsolatedCloud(storage = browserStorage()) {
  storage?.removeItem(ISOLATED_CLOUD_KEY);
}
