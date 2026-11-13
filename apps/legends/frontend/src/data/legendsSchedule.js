export const VENUE_TIME_ZONE = 'America/Denver';

export const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** `weekdays`: 0 is Sunday. Times are not published, so none are listed. */
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
    priority: 20,
  },
  {
    slug: 'friday-karaoke',
    title: 'Friday karaoke',
    summary: 'Karaoke, every Friday.',
    description: 'Friday night at Legends includes karaoke. A start time has not been published on this site yet.',
    category: 'karaoke',
    kind: 'recurring',
    weekdays: [5],
    priority: 10,
  },
  {
    slug: 'saturday-karaoke',
    title: 'Saturday karaoke',
    summary: 'Karaoke, every Saturday.',
    description: 'Saturday night at Legends includes karaoke. A start time has not been published on this site yet.',
    category: 'karaoke',
    kind: 'recurring',
    weekdays: [6],
    priority: 10,
  },
  {
    slug: 'sunday-tournament',
    title: 'Sunday pool tournament',
    summary: 'A pool tournament, every Sunday.',
    description:
      'Sunday at Legends includes a pool tournament. Format, start time, and any entry details have not been published on this site yet. Other tournaments are listed individually when they are scheduled.',
    category: 'tournament',
    kind: 'recurring',
    weekdays: [0],
    priority: 5,
  },
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
