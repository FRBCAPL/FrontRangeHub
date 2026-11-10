import { brandModelLabel, conditionLabel, itemLabel } from '../data/consignmentConstants.js';
import { formatDollars } from './consignmentMoney.js';
import { withTax } from './consignmentTax.js';

export const TAG_SHAPES = ['card', 'hang'];
export const TAGS_PER_SHEET = { card: 10, hang: 12 };

export function normalizeTagShape(shape) {
  return TAG_SHAPES.includes(shape) ? shape : 'card';
}

/** Everything printed on a shop tag, as plain text. */
export function tagText(item, rate) {
  const isAuction = item?.sale_method === 'auction';
  const price = Number(item?.selling_price);
  const hasPrice = !isAuction && item?.selling_price != null && Number.isFinite(price);
  let bigPrice = '';
  let priceNote = '';
  if (isAuction) {
    bigPrice = 'Online auction';
    priceNote = 'Bid from your phone';
  } else if (hasPrice && item.price_tax_included) {
    bigPrice = formatDollars(withTax(price, rate));
    priceNote = 'Tax included';
  } else if (hasPrice) {
    bigPrice = formatDollars(price);
    priceNote = `${formatDollars(withTax(price, rate))} with tax`;
  }
  let inspect = '';
  if (!isAuction) inspect = item?.allow_inspection ? 'Ask to inspect · ID held' : 'Display only';
  return {
    id: itemLabel(item),
    name: item?.name || '',
    sub: [brandModelLabel(item), conditionLabel(item?.condition)].filter(Boolean).join(' · '),
    bigPrice,
    priceNote,
    isAuction,
    inspect,
    scan: isAuction ? 'Scan to bid' : 'Scan for photos',
  };
}

/** Split tags into printed pages. */
export function sheetPages(items, shape) {
  const per = TAGS_PER_SHEET[normalizeTagShape(shape)];
  const pages = [];
  for (let i = 0; i < items.length; i += per) pages.push(items.slice(i, i + per));
  return pages;
}

/** Items to pre-check on the sheet page: submitted within `days` days. */
export function recentlyAdded(item, days = 7, now = Date.now()) {
  const t = new Date(item?.created_at).getTime();
  return Number.isFinite(t) && now - t <= days * 86400000;
}
