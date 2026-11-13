import { RECURRING_ACTIVITIES } from './legendsSchedule.js';

const SOURCES = [
  {
    key: 'leagues',
    category: 'leagues',
    title: 'Pool leagues',
    daysLabel: 'Every day',
    blurb: 'League play is on the tables every day of the week.',
    to: '/legends/play/leagues',
  },
  {
    key: 'karaoke',
    category: 'karaoke',
    title: 'Karaoke',
    daysLabel: 'Fridays & Saturdays',
    blurb: 'Two karaoke nights every weekend.',
    to: '/legends/karaoke',
  },
  {
    key: 'tournament',
    category: 'tournament',
    title: 'Sunday tournament',
    daysLabel: 'Sundays',
    blurb: 'A pool tournament every Sunday.',
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

/** Tonight's cards first; otherwise the original order. */
export function orderWeeklyCards(weekday, cards = WEEKLY_CARDS) {
  return [...cards].sort((a, b) => Number(runsTonight(b, weekday)) - Number(runsTonight(a, weekday)));
}
