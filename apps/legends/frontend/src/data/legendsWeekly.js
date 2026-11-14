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

/** Tonight's cards first; otherwise the original order. `isTonight(card)` decides each card. */
export function orderWeeklyCards(isTonight, cards = WEEKLY_CARDS) {
  return [...cards].sort((a, b) => Number(isTonight(b)) - Number(isTonight(a)));
}
