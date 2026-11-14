export const VENUE_TIME_ZONE = 'America/Denver';

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** `weekdays`: 0 is Sunday. `timeLabel` is null until Legends confirms a start time. */
export const RECURRING_ACTIVITIES = [
  {
    slug: 'pool-leagues',
    title: 'Pool leagues',
    summary: 'League play is on the tables every day.',
    description:
      'Legends runs pool leagues every day of the week. League names, start times, and formats have not been published on this site yet. The bar can tell you what is running tonight.',
    category: 'leagues',
    kind: 'recurring',
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    timeLabel: null,
    priority: 20,
  },
  {
    slug: 'friday-karaoke',
    title: 'Friday karaoke',
    summary: 'Karaoke every Friday at 8 PM.',
    description:
      'Friday night karaoke at Legends starts at 8 PM. Scan the karaoke QR code at Legends to see the song catalog, see the rotation, and sign up to sing.',
    category: 'karaoke',
    kind: 'recurring',
    weekdays: [5],
    timeLabel: '8 PM',
    priority: 10,
  },
  {
    slug: 'saturday-karaoke',
    title: 'Saturday karaoke',
    summary: 'Karaoke every Saturday at 8 PM.',
    description:
      'Saturday night karaoke at Legends starts at 8 PM. Scan the karaoke QR code at Legends to see the song catalog, see the rotation, and sign up to sing.',
    category: 'karaoke',
    kind: 'recurring',
    weekdays: [6],
    timeLabel: '8 PM',
    priority: 10,
  },
  {
    slug: 'sunday-tournament',
    title: 'Sunday Night Nine Ball',
    summary: 'Nine ball tournament every Sunday at 6:30 PM. $20 entry, 100% payout.',
    description:
      'Race to 7, single elimination, capped at 24 players. $20 entry with 100% payout. Sign-ups start at 3 PM every Sunday, in person only, and there are no late entries. Play starts at 6:30 PM, or earlier if the bracket is full. Results are reported to FargoRate.',
    category: 'tournament',
    kind: 'recurring',
    weekdays: [0],
    timeLabel: '6:30 PM',
    priority: 5,
  },
];

/** Sunday Night Nine Ball house rules, from the Legends flyer. */
export const NINE_BALL_RULES = [
  'Race to 7, single elimination',
  'Capped at 24 players',
  'Winner breaks, opponent racks',
  'Nine on the break counts anywhere',
  'Push out',
  '3 foul',
  'No jumping',
  'No template racks',
];

export function weekdayInTimeZone(date, timeZone = VENUE_TIME_ZONE) {
  const label = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' }).format(date);
  const index = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(label);
  return index < 0 ? date.getDay() : index;
}

export function weekdayPhrase(weekdays) {
  if (weekdays.length === 7) return 'Every day';
  return weekdays.map((day) => WEEKDAY_LABELS[day]).join(', ');
}

export function findRecurring(slug) {
  return RECURRING_ACTIVITIES.find((item) => item.slug === slug);
}

/** Recurring activities on the venue's current weekday, highest priority first. */
export function activitiesOn(weekday) {
  return RECURRING_ACTIVITIES.filter((item) => item.weekdays.includes(weekday)).sort((a, b) => a.priority - b.priority);
}
