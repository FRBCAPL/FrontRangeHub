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
 * `toneFor(item)` is cardTone of the item's summary. Each group has `parts` ({ label?, items },
 * shown with a gap between): "Needs attention" is running low, then "Top Offs".
 */
export function groupByStatus(items, toneFor) {
  const buckets = { attention: [], good: [], other: [], archived: [] };
  const danger = [];
  const warn = [];
  for (const item of items) {
    const tone = toneFor(item);
    if (!(item.is_active ?? true)) buckets.archived.push(item);
    else if (tone === 'danger' || tone === 'warn') {
      buckets.attention.push(item);
      (tone === 'danger' ? danger : warn).push(item);
    } else if (tone === 'ok') buckets.good.push(item);
    else buckets.other.push(item);
  }
  return ITEM_GROUPS
    .map((g) => ({
      ...g,
      items: buckets[g.key],
      parts: g.key === 'attention'
        ? [{ items: danger }, { label: 'Top Offs', items: warn }].filter((p) => p.items.length)
        : [{ items: buckets[g.key] }],
    }))
    .filter((g) => g.items.length);
}

/** 'danger' | 'warn' | 'ok' | 'muted' | 'none' for the card stripe and tint. */
export function cardTone(summary) {
  if (!summary) return 'none';
  const status = summary.status ? TARGET_STATUS[summary.status] : null;
  if (status) return status.tone;
  return 'none';
}

/**
 * True when an item needs topping up but is still more than halfway from "warn me at"
 * (or 0 without one) up to par, e.g. 26–39 for warn at 10, par 40. Display only.
 */
export function topUpCanWait(summary) {
  if (summary?.status !== 'below_par' || summary.par == null || summary.total == null) return false;
  const par = Number(summary.par);
  const minimum = summary.minimum == null ? 0 : Number(summary.minimum);
  return Number(summary.total) > minimum + (par - minimum) / 2;
}

/** Tone for sorting the Inventory list into sections: topping up that can wait counts as fine. */
export function listTone(summary) {
  return topUpCanWait(summary) ? 'ok' : cardTone(summary);
}
