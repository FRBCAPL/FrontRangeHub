// How an item card looks: its initials badge, the badge colour, and the status tone.
import { TARGET_STATUS } from './itemsureTargets.js';

/** "Well Rum" → "WR", "Vodka" → "VO", "" → "?". */
export function itemInitials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/** A steady hue (0–359) for a category id, so each category keeps its colour. Null without a category. */
export function categoryHue(categoryId) {
  if (!categoryId) return null;
  let hash = 0;
  for (const ch of String(categoryId)) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
  return hash;
}

/** "Bottle" → "Bottles", "Box" → "Boxes", "Each" stays "Each". */
export function pluralUnit(name) {
  const text = String(name || '').trim();
  if (!text || /^each$/i.test(text) || /s$/i.test(text)) return text;
  if (/(x|z|ch|sh)$/i.test(text)) return `${text}es`;
  if (/[^aeiou]y$/i.test(text)) return `${text.slice(0, -1)}ies`;
  return `${text}s`;
}

/** How full a stock bar is, 0–100. Display only, so plain numbers are fine here. */
export function fillPercent(total, par) {
  const goal = Number(par);
  if (!(goal > 0)) return 0;
  return Math.max(0, Math.min(1, Number(total || 0) / goal)) * 100;
}

export const ITEM_GROUPS = [
  { key: 'attention', title: 'Needs attention' },
  { key: 'good', title: 'All good' },
  { key: 'other', title: 'No warning levels yet' },
  { key: 'archived', title: 'Archived' },
];

/**
 * Splits items (already in order) into ITEM_GROUPS by how they look: running low or
 * needing topping up, fine, everything else, then archived. Empty groups are left out.
 * `toneFor(item)` is cardTone of the item's summary.
 */
export function groupByStatus(items, toneFor) {
  const buckets = { attention: [], good: [], other: [], archived: [] };
  for (const item of items) {
    const tone = toneFor(item);
    if (!(item.is_active ?? true)) buckets.archived.push(item);
    else if (tone === 'danger' || tone === 'warn') buckets.attention.push(item);
    else if (tone === 'ok') buckets.good.push(item);
    else buckets.other.push(item);
  }
  return ITEM_GROUPS.map((g) => ({ ...g, items: buckets[g.key] })).filter((g) => g.items.length);
}

/** 'danger' | 'warn' | 'ok' | 'muted' | 'none' for the card stripe and tint. */
export function cardTone(summary) {
  if (!summary) return 'none';
  const status = summary.status ? TARGET_STATUS[summary.status] : null;
  if (status) return status.tone;
  return 'none';
}
