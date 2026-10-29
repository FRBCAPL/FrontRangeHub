// Per-business feature switches ("Simple mode"). Display only: turning one off
// hides screens and choices, never data, and the database rules stay the same.

export const FEATURES = [
  {
    key: 'spots',
    label: 'Spots inside locations',
    hint: 'Track shelves, rooms, or coolers separately inside a location.',
  },
  {
    key: 'packaging',
    label: 'Case and pack sizes',
    hint: 'Enter amounts in cases or packs (for example 1 case = 12 bottles).',
  },
  {
    key: 'transfers',
    label: 'Moving stock between places',
    hint: 'Move stock from one location or spot to another, and plan moves on the shopping list.',
  },
  {
    key: 'approvals',
    label: 'Count approvals',
    hint: 'A finished count waits for someone to approve it. When off, a count from someone who can approve is applied straight away.',
  },
];

/** Missing keys (older businesses, or before the database change) mean "on". */
export function readFeatures(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return Object.fromEntries(FEATURES.map(({ key }) => [key, source[key] !== false]));
}

export const ALL_FEATURES_ON = readFeatures(null);
