// On-screen word for a business's physical sites (database: locations).
// Levels are Business → Site → Spot; "location" is not shown to people.
export const SITE = 'Site';
export const SITES = 'Sites';
export const site = 'site';
export const sites = 'sites';

/** One-sentence meaning of each level, shown wherever people choose between them. */
export const LEVELS = [
  {
    key: 'business',
    icon: '\u{1F3E2}',
    name: 'Business',
    meaning: 'Your company account. It has its own sites, items, team, and stock.',
    example: 'Front Range Bars LLC',
  },
  {
    key: 'site',
    icon: '\u{1F4CD}',
    name: SITE,
    meaning: 'A place your business runs, with its own address.',
    example: 'Downtown bar, Main St. store, warehouse, delivery van',
  },
  {
    key: 'spot',
    icon: '\u{1F4E6}',
    name: 'Spot',
    meaning: 'A place inside a site where stock sits.',
    example: 'Back bar shelf, walk-in cooler, storage room',
  },
];
