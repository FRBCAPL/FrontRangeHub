/**
 * Make-ups that were paid before they were played. Paying a make-up normally means it's settled;
 * "Prepaid" keeps the match on the make-up list (makeup_pending) until "Mark played".
 */
import { isPrepaidMakeup } from './duezyMath.js';

/** A saved payment row → the entry savePayment takes (undo, "Mark played"). */
export const entryOf = (p) => ({
  status: p.status,
  amount: Number(p.amount) || 0,
  method: p.method || null,
  note: p.note || null,
  paid_by: p.paid_by || null,
  splits: p.splits || null,
  makeup_pending: Boolean(p.makeup_pending),
});

/** Money for a make-up whose match hasn't been played yet. Only paid / partial entries can be prepaid. */
export const asPrepaid = (entry) => (entry.status === 'paid' || entry.status === 'partial' ? { ...entry, makeup_pending: true } : entry);

/** A week already paid turns out to be a make-up not yet played: same money, back on the make-up list. */
export const markToPlayEntry = (p) => asPrepaid(entryOf(p));

/** The match was played: same money, off the make-up list. */
export const markPlayedEntry = (p) => ({ ...entryOf(p), makeup_pending: false });

/**
 * A prepaid make-up keeps its flag when the amount is corrected or the rest is added;
 * corrected down to nothing, it goes back to an unpaid make-up (the match is still to play).
 */
export function keepPrepaid(payment, entry) {
  if (!isPrepaidMakeup(payment)) return entry;
  return entry.status === 'unpaid' ? { ...entry, status: 'makeup' } : asPrepaid(entry);
}
