import { displayQuantity } from './itemsureQuantity.js';

const fmt = (text, unit) => `${displayQuantity(text)} ${unit}`.trim();
const FIELDS = ['level', 'on_hand', 'after', 'minimum', 'par'];

/** True when a fresh check says the same thing the person already confirmed. */
export function sameCheck(confirmed, fresh) {
  if (!confirmed || !fresh) return false;
  return FIELDS.every((f) => (confirmed[f] ?? null) === (fresh[f] ?? null));
}

/**
 * What to do when the person clicks "Transfer anyway", given a fresh check:
 * 'block' (now impossible), 'proceed' (unchanged or no longer needs a warning),
 * or 'reconfirm' (the warning or its figures changed).
 */
export function confirmDecision(confirmedCheck, freshCheck, item) {
  const fresh = transferWarning(freshCheck, item);
  if (fresh.block) return { action: 'block', warning: fresh };
  if (!fresh.confirm || sameCheck(confirmedCheck, freshCheck)) return { action: 'proceed', warning: fresh };
  return { action: 'reconfirm', warning: { ...fresh, changed: true } };
}

/**
 * Turns a source check into what the person sees before a transfer.
 * block: never offered. confirm: needs an explicit "Transfer anyway".
 */
export function transferWarning(check, item) {
  const unit = item?.unitSymbol || '';
  const name = item?.name || 'This item';
  switch (check?.level) {
    case 'ok':
      return { block: false, confirm: false };
    case 'not_set_up':
      return { block: true, text: `${name} has no amount here yet. Open the item and set its starting amount first.` };
    case 'below_zero':
      return { block: true, text: `Only ${fmt(check.on_hand, unit)} on hand here, so you can't move that much.` };
    case 'low':
      return {
        block: false,
        confirm: true,
        check,
        tone: 'danger',
        title: 'This will leave the source running low',
        text: `${fmt(check.on_hand, unit)} on hand now, ${fmt(check.after, unit)} after the move. It warns at ${fmt(check.minimum, unit)}.`,
      };
    case 'below_par':
      return {
        block: false,
        confirm: true,
        check,
        tone: 'warn',
        title: 'This will leave the source below full',
        text: `${fmt(check.on_hand, unit)} on hand now, ${fmt(check.after, unit)} after the move. It fills up to ${fmt(check.par, unit)}.`,
      };
    default:
      return { block: true, text: 'Could not check stock at the source. Try again.' };
  }
}
