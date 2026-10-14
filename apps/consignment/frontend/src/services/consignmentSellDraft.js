/**
 * Sell-wizard draft kept in sessionStorage: survives a reload or leaving the page, but not closing the tab,
 * so a seller's contact details don't linger on a shared device. Photos can't be stored; only their count.
 */
const KEY = 'frpl.consignment.sellDraft.v1';

function storage() {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

/** Only keys present in `template`, with the same primitive type, are restored. */
export function loadSellDraft(template) {
  try {
    const raw = storage()?.getItem(KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (!saved || typeof saved.form !== 'object') return null;
    const form = { ...template };
    for (const key of Object.keys(template)) {
      if (typeof saved.form[key] === typeof template[key]) form[key] = saved.form[key];
    }
    const step = Number.isInteger(saved.step) && saved.step >= 0 ? saved.step : 0;
    const photoCount = Number.isInteger(saved.photoCount) ? saved.photoCount : 0;
    return { form, step, photoCount };
  } catch {
    return null;
  }
}

export function saveSellDraft({ form, step, photoCount }) {
  try {
    const { agreement: _skip, ...rest } = form;
    storage()?.setItem(KEY, JSON.stringify({ form: rest, step, photoCount }));
  } catch {
    // Storage full or blocked (private mode); the draft just won't survive a reload.
  }
}

export function clearSellDraft() {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Ignore blocked storage.
  }
}
