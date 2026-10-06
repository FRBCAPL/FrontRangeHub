import { statusLabel } from '../data/consignmentConstants.js';
import { formatDollars } from './consignmentMoney.js';

const money = (v) => (v == null ? 'not set' : formatDollars(v));

/** One-line description of a consignment_item_events row. */
export function describeEvent(event) {
  const d = event.data || {};
  switch (event.kind) {
    case 'status_change':
      return `Status: ${statusLabel(d.from)} → ${statusLabel(d.to)}`;
    case 'payout_change':
      return `Seller Payout: ${money(d.from)} → ${money(d.to)}${d.consent ? ` (seller agreed: ${d.consent})` : ''}`;
    case 'price_change':
      return `FRPL Retail Price: ${money(d.from)} → ${money(d.to)}`;
    case 'seller_paid':
      return `Seller paid ${money(d.amount)}${d.method ? ` · ${d.method}` : ''}`;
    case 'seller_unpaid':
      return 'Seller payment undone';
    case 'note':
      return 'Note';
    default:
      return event.kind;
  }
}
