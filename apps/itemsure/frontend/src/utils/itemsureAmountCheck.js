// Checks a typed stock amount while the person types, so a move or removal that
// the database would refuse is explained before Save. The database still checks
// everything on save; this only gives earlier, plainer feedback.
import { checkQuantity, displayQuantity } from './itemsureQuantity.js';

/** -1 / 0 / 1 comparing two non-negative decimal strings exactly. */
export function compareQuantities(a, b) {
  const [aw, af = ''] = String(a).split('.');
  const [bw, bf = ''] = String(b).split('.');
  const scale = Math.max(af.length, bf.length);
  const x = BigInt(aw + af.padEnd(scale, '0'));
  const y = BigInt(bw + bf.padEnd(scale, '0'));
  return x === y ? 0 : x > y ? 1 : -1;
}

/**
 * `entry` is from stockEntry(). `onHand` is the balance text where stock is taken
 * from (null when there is none). Returns { ready, message }: ready means the
 * button can be used; message (may be '') says what to fix. Package problems are
 * already shown by the package field, so they come back without a message.
 */
export function amountProblem({ entry, item, onHand = null, removing = false }) {
  if (!entry || !item) return { ready: false, message: '' };
  if (entry.pkg && (entry.empty || entry.error)) return { ready: false, message: '' };
  const checked = checkQuantity(entry.base, item.precision ?? 0, item.unitName);
  if (checked.empty) return { ready: false, message: '' };
  if (checked.error) return { ready: false, message: checked.error };
  if (checked.value === '0') return { ready: false, message: 'Enter an amount greater than zero.' };
  if (removing && onHand !== null && onHand !== undefined) {
    const have = checkQuantity(onHand, 6);
    if (have.value && compareQuantities(checked.value, have.value) > 0) {
      const unit = item.unitSymbol || item.unitName || '';
      return { ready: false, message: `There ${have.value === '1' ? 'is' : 'are'} only ${displayQuantity(have.value)} ${unit} here.`.replace(/\s+\./, '.') };
    }
  }
  return { ready: true, message: '' };
}
