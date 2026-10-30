// Per-business feature switches ("Simple mode"). Display only: turning one off
// hides screens and choices, never data, and the database rules stay the same.

import { site, sites } from '../data/itemsureTerms.js';

export const FEATURES = [
  {
    key: 'spots',
    label: `Spots inside ${sites}`,
    hint: `Track shelves, rooms, or coolers separately inside a ${site}.`,
  },
  {
    key: 'packaging',
    label: 'Case and pack sizes',
    hint: 'Enter amounts in cases or packs (for example 1 case = 12 bottles).',
  },
  {
    key: 'transfers',
    label: 'Moving stock between places',
    hint: `Move stock from one ${site} or spot to another, and plan moves on the shopping list.`,
  },
  {
    key: 'approvals',
    label: 'Count approvals',
    hint: 'A finished count waits for someone to approve it. When off, a count from someone who can approve is applied straight away.',
  },
  {
    key: 'details',
    label: 'Brand and item details',
    hint: 'Add a brand and one more detail (you choose its name, like Model or Style) to each item.',
    // Only once its database update is applied; until then it stays on and is not offered.
    needs: 'detailsAvailable',
  },
];

/** The switches this business can change now. */
export function availableFeatures(organization) {
  return FEATURES.filter((f) => !f.needs || organization?.[f.needs]);
}

/** Missing keys (older businesses, or before the database change) mean "on". */
export function readFeatures(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(FEATURES.map(({ key }) => [key, source[key] !== false]));
}

export const ALL_FEATURES_ON = readFeatures(null);
