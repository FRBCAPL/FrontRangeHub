import { RECURRING_ACTIVITIES } from './legendsSchedule.js';

const SOURCES = [
  {
    key: 'leagues',
    category: 'leagues',
    title: 'Pool leagues',
    daysLabel: 'League nights',
    blurb: 'See the Leagues page for league play at Legends.',
    to: '/legends/play/leagues',
  },
  {
    key: 'karaoke',
    category: 'karaoke',
    title: 'Karaoke',
    daysLabel: 'Fridays & Saturdays',
    blurb: 'Two karaoke nights every weekend, starting at 8 PM.',
    to: '/legends/karaoke',
  },
  {
    key: 'tournament',
    category: 'tournament',
    title: 'Sunday Nine Ball',
    daysLabel: 'Sundays',
    blurb: 'Race to 7, single elimination at 6:30 PM. $20 entry, 100% payout.',
    to: '/legends/play/tournaments',
  },
];

/** Weekdays come from the recurring schedule, so the cards cannot drift from it. */
export const WEEKLY_CARDS = SOURCES.map(({ category, ...card }) => ({
  ...card,
  weekdays: [...new Set(RECURRING_ACTIVITIES.filter((item) => item.category === category).flatMap((item) => item.weekdays))].sort(),
}));

export function runsTonight(card, weekday) {
  return weekday !== null && card.weekdays.includes(weekday);
}

/** Days until the next weekday in `weekdays` (0 = today). */
export function daysUntilWeekdays(weekday, weekdays) {
  if (weekday === null || !weekdays?.length) return Number.POSITIVE_INFINITY;
  for (let offset = 0; offset < 7; offset += 1) {
    if (weekdays.includes((weekday + offset) % 7)) return offset;
  }
  return Number.POSITIVE_INFINITY;
}

/**
 * Soonest next night first. `daysAway(card)` returns 0 for tonight, 1 for tomorrow, etc.
 * Unknown nights sort last; ties keep the source order.
 */
export function orderWeeklyCards(daysAway, cards = WEEKLY_CARDS) {
  return [...cards]
    .map((card, index) => ({ card, index, days: daysAway(card) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.days - b.days || a.index - b.index)
    .map(({ card }) => card);
}
