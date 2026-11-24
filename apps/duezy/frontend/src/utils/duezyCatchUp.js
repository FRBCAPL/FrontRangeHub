/** Weeks a treasurer is likely clearing in the team modal: late nights, then make-ups still owed. */
export function catchUpWeeks(balance) {
  const seen = new Set();
  const out = [];
  [...(balance?.lateWeeks || []), ...(balance?.makeupWeeks || [])].forEach((w) => {
    if (seen.has(w)) return;
    seen.add(w);
    out.push(w);
  });
  return out.sort((a, b) => a - b);
}

/** Paid in full or bye — enough to leave a catch-up week. */
export function settlesCatchUp(entry) {
  return entry?.status === 'paid' || entry?.status === 'bye';
}

/**
 * After settling `paidWeek`, the next catch-up week to open (only later nights), or null if done.
 */
export function nextCatchUpWeek(catchUp, paidWeek) {
  return catchUp.find((w) => w > paidWeek) || null;
}
