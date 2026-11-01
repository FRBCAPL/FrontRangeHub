import { useCallback, useEffect, useRef, useState } from 'react';
import { addShoppingTick, listShoppingTicks, removeShoppingTicks, setShoppingTickAmount } from '../services/itemsureShoppingTicksService.js';
import { loadPeopleNames } from '../services/itemsureCountService.js';

const keyFor = (organizationId) => `itemsure:shopping-ticks:${organizationId}`;
const REFRESH_MS = 30000;

/** This device's ticks: older saves are a list of keys, newer ones { key: amount }. */
function readLocal(organizationId) {
  try {
    const saved = JSON.parse(localStorage.getItem(keyFor(organizationId)) || '[]');
    const entries = Array.isArray(saved) ? saved.map((k) => [k, '']) : Object.entries(saved);
    return new Map(entries.map(([k, amount]) => [k, { amount: String(amount || ''), by: null, at: null }]));
  } catch {
    return new Map();
  }
}

function writeLocal(organizationId, ticked) {
  try {
    localStorage.setItem(keyFor(organizationId), JSON.stringify(Object.fromEntries([...ticked].map(([k, t]) => [k, t.amount]))));
  } catch {
    // Private browsing or full storage: ticks still work until the page reloads.
  }
}

/**
 * "Got it" ticks on the shopping list: a Map of key (item id or "extra:<id>") to
 * { amount, by, at }. amount is what the shopper got ('' = the list amount).
 * Shared by the business once the database update is applied (`shared`), with `names`
 * for who ticked; until then kept on this device only. Ticks change nothing in stock.
 * On this device, ticks for lines no longer listed (`listedIds`) are dropped.
 */
export default function useShoppingTicks(organizationId, listedIds) {
  const [state, setState] = useState(() => ({ shared: false, ticked: readLocal(organizationId), names: {} }));
  const [error, setError] = useState('');
  const sharedRef = useRef(false);

  const reload = useCallback(async () => {
    const rows = await listShoppingTicks(organizationId).catch(() => null);
    if (rows === null) {
      sharedRef.current = false;
      setState({ shared: false, ticked: readLocal(organizationId), names: {} });
      return;
    }
    sharedRef.current = true;
    const names = await loadPeopleNames(rows.map((r) => r.by));
    setState({ shared: true, ticked: new Map(rows.map((r) => [r.key, { amount: r.amount, by: r.by, at: r.at }])), names });
  }, [organizationId]);

  useEffect(() => {
    reload();
    const onShow = () => {
      if (document.visibilityState === 'visible') reload();
    };
    const timer = setInterval(() => {
      if (sharedRef.current && document.visibilityState === 'visible') reload();
    }, REFRESH_MS);
    document.addEventListener('visibilitychange', onShow);
    window.addEventListener('focus', onShow);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onShow);
      window.removeEventListener('focus', onShow);
    };
  }, [reload]);

  const { shared, ticked } = state;
  useEffect(() => {
    if (shared || !listedIds) return;
    const kept = [...ticked].filter(([k]) => listedIds.has(k));
    if (kept.length === ticked.size) return;
    const next = new Map(kept);
    writeLocal(organizationId, next);
    setState((s) => ({ ...s, ticked: next }));
  }, [shared, listedIds, ticked, organizationId]);

  /** Changes the screen at once, then saves; a failed save reloads and says why. */
  const change = useCallback(
    async (update, save) => {
      setError('');
      const next = update(new Map(state.ticked));
      setState((s) => ({ ...s, ticked: next }));
      if (!state.shared) {
        writeLocal(organizationId, next);
        return;
      }
      try {
        await save();
      } catch (e) {
        setError(e.message);
      }
      await reload();
    },
    [state, organizationId, reload],
  );

  const toggle = (key) =>
    change(
      (m) => (m.has(key) ? (m.delete(key), m) : m.set(key, { amount: '', by: null, at: null })),
      () => (ticked.has(key) ? removeShoppingTicks(organizationId, [key]) : addShoppingTick(organizationId, key)),
    );
  const setAmount = (key, amount) =>
    change(
      (m) => m.set(key, { ...(m.get(key) || { by: null, at: null }), amount: amount.trim() }),
      () => setShoppingTickAmount(organizationId, key, amount),
    );
  const clear = (keys = [...ticked.keys()]) =>
    change(
      (m) => (keys.forEach((k) => m.delete(k)), m),
      () => removeShoppingTicks(organizationId, keys),
    );

  return { ...state, error, toggle, setAmount, clear, reload };
}
