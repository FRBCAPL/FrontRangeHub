// Server timestamps this device has received, with when they arrived on the
// device's monotonic timer (performance.now, which wall-clock changes do not move).
//
// A count's anchor is a server time that arrived at least LOOK_MARGIN_MS before
// the first keystroke. The margin covers the gap between looking at the shelf and
// typing the number. No such time (for example in the first minute after the page
// opens) means no anchor, and the server falls back to the start of the count.

export const LOOK_MARGIN_MS = 60000;

let receipts = [];
let latestMs = -Infinity;

function monotonicNow() {
  return globalThis.performance?.now?.() ?? 0;
}

export function noteServerTime(value, receivedAt = monotonicNow()) {
  const ms = Date.parse(value || '');
  if (Number.isNaN(ms) || ms <= latestMs) return;
  latestMs = ms;
  receipts.push({ value, receivedAt });
  // Older receipts can never be chosen once a later one is past the margin.
  let oldestNeeded = 0;
  receipts.forEach((r, i) => {
    if (r.receivedAt <= receivedAt - LOOK_MARGIN_MS) oldestNeeded = i;
  });
  if (oldestNeeded > 0) receipts = receipts.slice(oldestNeeded);
}

export function latestServerTime() {
  return receipts.length ? receipts[receipts.length - 1].value : null;
}

/** Latest server time that arrived at least LOOK_MARGIN_MS before `now`. */
export function anchorBefore(now = monotonicNow()) {
  for (let i = receipts.length - 1; i >= 0; i -= 1) {
    if (receipts[i].receivedAt <= now - LOOK_MARGIN_MS) return receipts[i].value;
  }
  return null;
}

/** A new draft takes a margin-old server time; an existing draft keeps its anchor. */
export function anchorForDraft(existing, now = monotonicNow()) {
  return existing ? existing.anchorAt ?? null : anchorBefore(now);
}
