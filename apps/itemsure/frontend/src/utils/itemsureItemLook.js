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

/** 'danger' | 'warn' | 'ok' | 'muted' | 'none' for the card stripe and tint. */
export function cardTone(summary) {
  if (!summary) return 'none';
  const status = summary.status ? TARGET_STATUS[summary.status] : null;
  if (status) return status.tone;
  return 'none';
}
