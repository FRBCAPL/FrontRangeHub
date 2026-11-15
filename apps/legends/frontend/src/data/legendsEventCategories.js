export const EVENT_CATEGORY_OPTIONS = [
  ['pool', 'Pool'],
  ['leagues', 'Leagues'],
  ['karaoke', 'Karaoke'],
  ['tournament', 'Tournament'],
  ['darts', 'Darts'],
  ['sports', 'Sports'],
  ['food', 'Food and drinks'],
  ['other', 'Other'],
];

export function eventCategoryLabel(value) {
  return EVENT_CATEGORY_OPTIONS.find(([v]) => v === value)?.[1] || 'Other';
}
