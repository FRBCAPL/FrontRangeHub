// In-app signal that stock or levels changed, so badges and lists refresh.
const EVENT = 'itemsure:inventory-changed';

export function notifyInventoryChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENT));
}

export function onInventoryChanged(callback) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(EVENT, callback);
  return () => window.removeEventListener(EVENT, callback);
}
