/**
 * Per-tournament cloud bookkeeping on this tablet, and the conflict archive.
 *
 *   revision  the cloud revision the tablet copy is based on (0: never accepted by the cloud)
 *   dirty     the tablet has confirmed changes the cloud has not accepted yet
 *   syncedAt  when the cloud last accepted (or confirmed) this copy
 *   state     local-only | needs-approval | sending | synced | offline | conflict | deleted | missing |
 *             update-required | error
 *   error     the last cloud error code ('' when none)
 *   uploadApproved  the first upload may happen without review (created while this cloud was in use, or
 *             approved by the operator); kept per cloud, so an isolated-test approval never counts live
 *
 * The isolated test cloud keeps separate bookkeeping, so switching it on or off never compares an isolated
 * revision with the live cloud. Conflict copies keep both sides of a disagreement; choosing one never
 * deletes the other.
 */
export const CASH_CLIMB_V3_SYNC_KEY = 'frontrange-cash-climb-v3-sync';
export const CASH_CLIMB_V3_CONFLICT_KEY = 'frontrange-cash-climb-v3-conflicts';
export const ISOLATED_SUFFIX = ':isolated-test-cloud';
const CONFLICT_LIMIT = 20;
const EMPTY = Object.freeze({ revision: 0, dirty: false, syncedAt: '', state: 'local-only', error: '', uploadApproved: false });

function browserStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** `isolated()`: true while the isolated test cloud answers. */
export function createCashClimbV3SyncStore({ storage = browserStorage(), isolated = () => false } = {}) {
  const key = (base) => (isolated() ? base + ISOLATED_SUFFIX : base);
  const read = (k, fallback) => {
    try {
      const raw = storage?.getItem(k);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const write = (k, value) => {
    try {
      storage?.setItem(k, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  };
  const all = () => {
    const data = read(key(CASH_CLIMB_V3_SYNC_KEY), {});
    return data && typeof data === 'object' && !Array.isArray(data) ? data : {};
  };

  const conflicts = () => {
    const list = read(key(CASH_CLIMB_V3_CONFLICT_KEY), []);
    return Array.isArray(list) ? list : [];
  };

  return {
    meta(id) {
      return { ...EMPTY, ...(id ? all()[id] : null) };
    },
    saveMeta(id, patch) {
      if (!id) return { ...EMPTY };
      const data = all();
      const next = { ...EMPTY, ...data[id], ...patch };
      write(key(CASH_CLIMB_V3_SYNC_KEY), { ...data, [id]: next });
      return next;
    },
    forget(id) {
      const data = all();
      delete data[id];
      write(key(CASH_CLIMB_V3_SYNC_KEY), data);
    },
    allMeta: () => all(),
    conflicts,
    /** Keeps a full copy of one side of a conflict (newest first). Returns false if it could not be stored. */
    keepConflictCopy(entry) {
      if (!entry?.record?.id) return false;
      return write(key(CASH_CLIMB_V3_CONFLICT_KEY), [entry, ...conflicts()].slice(0, CONFLICT_LIMIT));
    },
  };
}
