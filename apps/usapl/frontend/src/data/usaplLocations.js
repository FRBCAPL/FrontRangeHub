import { AVAILABLE_LOCATIONS } from '@shared/config/availableLocations.js';

export const USAPL_LOCATION_SEED = [
  "Nay Nay's",
  'Legends Brews & Cues',
  'Murray Street Darts',
  "Rack'em Billiards",
  'Pastime Lounge',
  'Any location with 2 regulation tables',
  'My House',
];

export const USAPL_LOCATIONS = Array.from(new Set([...USAPL_LOCATION_SEED, ...AVAILABLE_LOCATIONS]));

export function seedUsaplLocationRows() {
  return USAPL_LOCATIONS.map((name, index) => ({
    id: `seed-${index + 1}`,
    name,
    sortOrder: (index + 1) * 10,
  }));
}
