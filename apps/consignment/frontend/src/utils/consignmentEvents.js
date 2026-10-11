import { statusLabel } from '../data/consignmentConstants.js';
import { formatDollars } from './consignmentMoney.js';

const money = (v) => (v == null ? 'not set' : formatDollars(v));

const LISTING_FIELDS = {
  name: 'name',
  brand: 'brand',
  model: 'model',
  condition: 'condition',
  specs: 'specs',
  description: 'description',
  photo_urls: 'photos',
};

/** One-line description of a consignment_item_events row. */
export function describeEvent(event) {
  const d = event.data || {};
  switch (event.kind) {
    case 'status_change':
      return `Status: ${statusLabel(d.from)} → ${statusLabel(d.to)}`;
    case 'payout_change':
      return `Agreed price / payout: ${money(d.from)} → ${money(d.to)}${d.consent ? ` (seller agreed: ${d.consent})` : ''}`;
    case 'price_change':
      return `FRPL Retail Price: ${money(d.from)} → ${money(d.to)}`;
    case 'seller_paid':
      return `Seller paid ${money(d.amount)}${d.method ? ` · ${d.method}` : ''}`;
    case 'seller_unpaid':
      return 'Seller payment undone';
    case 'note':
      if (d.field === 'listing') {
        const names = Object.keys(d.changes || {}).map((k) => LISTING_FIELDS[k] || k);
        return `Listing edited${names.length ? `: ${names.join(', ')}` : ''}`;
      }
      return 'Note';
    default:
      return event.kind;
  }
}
