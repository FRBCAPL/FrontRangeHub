/** Event-level presets. These are settings, not format rules. */

export const VENUE_PRESETS = {
  legends: {
    id: 'legends',
    label: 'Legends Brews & Cues',
    venue: 'Legends Brews & Cues',
    rulesetId: 'texas-express-9ball',
    minEntrants: 8,
    maxEntrants: 24,
    entryFee: 20,
    tableCount: 5,
    tableRange: { min: 4, max: 7 },
    qualifyingRaceTo: 3,
    playoffRaceTo: 5,
    targetHours: 5,
  },
};

export const DEFAULT_PRESET_ID = 'legends';

export function venuePreset(id) {
  return VENUE_PRESETS[id] || null;
}
