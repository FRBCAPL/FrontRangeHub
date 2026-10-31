import { useCallback, useSyncExternalStore } from 'react';

// "Compact view": tighter spacing so more fits on screen. A choice for this
// device and browser only, so it lives in localStorage, not the database.
const KEY = 'itemsure.compactView';
const EVENT = 'itemsure:compact-view';
// Used when storage is blocked (some private browsing), so the switch still works until a reload.
let fallback = false;

function read() {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return fallback;
  }
}

function subscribe(onChange) {
  const onStorage = (e) => {
    if (e.key === KEY) onChange();
  };
  window.addEventListener(EVENT, onChange);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener('storage', onStorage);
  };
}

/** [compact, setCompact]: shared by every component that uses it, and kept across visits. */
export default function useCompactView() {
  const compact = useSyncExternalStore(subscribe, read, () => false);
  const setCompact = useCallback((on) => {
    fallback = Boolean(on);
    try {
      if (on) window.localStorage.setItem(KEY, '1');
      else window.localStorage.removeItem(KEY);
    } catch {
      // Storage blocked: `fallback` keeps the choice for this visit.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [compact, setCompact];
}
