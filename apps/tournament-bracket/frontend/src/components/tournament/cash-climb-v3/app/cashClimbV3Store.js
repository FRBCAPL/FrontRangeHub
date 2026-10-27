/**
 * Tablet storage for Cash Climb (V3) tournaments: local only, like Showdown before its cloud phase.
 * Records live under their own keys, separate from Cash Climb: King of the Hill
 * ('frontrange-open-cash-climb') and Cash Climb: Showdown, so no format can read another's events.
 *
 * Records are stored exactly as given and validated on the way in and out; nothing is recalculated.
 */
import { restoreCashClimbV3Record } from './cashClimbV3RecordCheck.js';

export const CASH_CLIMB_V3_EVENTS_KEY = 'frontrange-cash-climb-v3-events';
export const CASH_CLIMB_V3_OPEN_KEY = 'frontrange-cash-climb-v3-open';

function browserStorage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

/** @param storage a Storage-like object ({ getItem, setItem, removeItem }); defaults to localStorage. */
export function cashClimbV3Store(storage = browserStorage()) {
  /** All saved records by id, or null when the stored data is unreadable (it is then never overwritten). */
  const readAll = () => {
    let raw;
    try {
      raw = storage?.getItem(CASH_CLIMB_V3_EVENTS_KEY);
    } catch {
      return null;
    }
    if (!raw) return {};
    try {
      const data = JSON.parse(raw);
      return data && typeof data === 'object' && !Array.isArray(data) ? data : null;
    } catch {
      return null;
    }
  };
  const writeAll = (all) => storage?.setItem(CASH_CLIMB_V3_EVENTS_KEY, JSON.stringify(all));
  const UNREADABLE = 'Saved Cash Climb tournaments on this device are unreadable. Nothing was changed.';

  return {
    available: Boolean(storage),

    /** Valid records newest first, plus any saved entries that failed validation (never dropped silently). */
    list() {
      const records = [];
      const invalid = [];
      const all = readAll();
      if (!all) return { records, invalid: [{ id: CASH_CLIMB_V3_EVENTS_KEY, problems: [UNREADABLE] }] };
      Object.entries(all).forEach(([id, raw]) => {
        const r = restoreCashClimbV3Record(raw);
        if (r.status === 'ok') records.push(r.record);
        else invalid.push({ id, problems: r.problems });
      });
      records.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
      return { records, invalid };
    },

    /** @returns restoreCashClimbV3Record result, or { status: 'missing' }. */
    load(id) {
      const all = readAll();
      if (!all) return { status: 'invalid', problems: [UNREADABLE] };
      return all[id] === undefined ? { status: 'missing' } : restoreCashClimbV3Record(all[id]);
    },

    /** Saves a valid record. Returns { error } with the problems when the record is not valid. */
    save(record) {
      if (!storage) return { error: 'This device cannot save tournaments.' };
      const r = restoreCashClimbV3Record(record);
      if (r.status !== 'ok') return { error: r.problems.join(' ') };
      const all = readAll();
      if (!all) return { error: UNREADABLE };
      try {
        writeAll({ ...all, [record.id]: JSON.parse(JSON.stringify(record)) });
      } catch {
        return { error: 'The tournament could not be saved on this device (storage full or blocked).' };
      }
      return { error: null };
    },

    remove(id) {
      const all = readAll();
      if (!all) return { error: UNREADABLE };
      delete all[id];
      writeAll(all);
      if (storage?.getItem(CASH_CLIMB_V3_OPEN_KEY) === id) storage.removeItem(CASH_CLIMB_V3_OPEN_KEY);
      return { error: null };
    },

    openId: () => storage?.getItem(CASH_CLIMB_V3_OPEN_KEY) || null,
    setOpen(id) {
      if (!storage) return;
      if (id) storage.setItem(CASH_CLIMB_V3_OPEN_KEY, id);
      else storage.removeItem(CASH_CLIMB_V3_OPEN_KEY);
    },
  };
}
