import { WEEKDAY_LABELS } from './legendsSchedule.js';

/**
 * Static fallback only. Live KJ comes from Supabase via atlasbackend
 * `/api/legends-site/content` and is edited at `/#/legends/admin` by hub admins.
 */
export const KARAOKE_HOST = {
  name: null,
  role: 'Karaoke host',
  bio: null,
  photoSrc: null,
  photoAlt: null,
};

export const KARAOKE_START = '8 PM';

export const KARAOKE_HOW_IT_WORKS = [
  'Karaoke starts at 8 PM every Friday and Saturday.',
  'Scan the karaoke QR code at Legends.',
  'Browse the song catalog, check the rotation, and sign up to sing.',
  'Wait for your turn in the rotation, then take the mic.',
];

export function karaokeHostReady(host = KARAOKE_HOST) {
  return Boolean(host?.name && host?.bio);
}

/** Absolute weekday for `weekday + daysAway`, wrapping Sunday–Saturday. */
export function weekdayAfter(weekday, daysAway) {
  return (weekday + daysAway) % 7;
}

export function karaokeNightLabel(weekday, daysAway) {
  if (daysAway === 0) return 'tonight';
  if (daysAway === 1) return 'tomorrow';
  return WEEKDAY_LABELS[weekdayAfter(weekday, daysAway)];
}
