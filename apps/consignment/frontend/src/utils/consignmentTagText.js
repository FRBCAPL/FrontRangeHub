import { brandModelLabel, conditionLabel, itemLabel } from '../data/consignmentConstants.js';
import { formatShortDate } from './consignmentDates.js';
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

function within(value, days, now) {
  const t = new Date(value).getTime();
  return Number.isFinite(t) && now - t <= days * 86400000;
}

export const MAX_BLANK_TAGS = 60;

export function clampBlankCount(n) {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.min(Math.max(v, 0), MAX_BLANK_TAGS) : 0;
}

/** Blank tags needed after `used` tags to finish the current page (a full page when nothing is used). */
export function blanksToFillPage(used, shape) {
  const per = TAGS_PER_SHEET[normalizeTagShape(shape)];
  const rest = used % per;
  return rest ? per - rest : per;
}

/** Items to pre-check on the sheet page: submitted within `days` days. */
export function recentlyAdded(item, days = 7, now = Date.now()) {
  return within(item?.created_at, days, now);
}

/** Sold items to pre-check on the sold-tag sheet: sold within `days` days. */
export function recentlySold(item, days = 7, now = Date.now()) {
  return within(item?.sold_at, days, now);
}

/** 'shop' (price + QR) or 'sold' (big SOLD, hold-for line). */
export const TAG_KINDS = ['shop', 'sold'];

export function normalizeTagKind(kind) {
  return TAG_KINDS.includes(kind) ? kind : 'shop';
}

/** What a SOLD tag says: item, sold date, and how it sold. */
export function soldTagText(item) {
  return {
    id: itemLabel(item),
    name: item?.name || '',
    sub: [brandModelLabel(item), conditionLabel(item?.condition)].filter(Boolean).join(' · '),
    soldOn: item?.sold_at ? `Sold ${formatShortDate(item.sold_at)}` : 'Sold',
    how: item?.sale_method === 'auction' ? 'Won online' : '',
  };
}
