import { KARAOKE_START, karaokeNightLabel } from '../data/legendsKaraoke.js';
import { daysUntilWeekdays, runsTonight } from '../data/legendsWeekly.js';

/**
 * Karaoke follows the weekly schedule only (no live feed).
 * Tonight gets a solid badge; other days get a weekday tag and a "next night" blurb.
 */
export function karaokeCardState(card, weekday) {
  const daysAway = daysUntilWeekdays(weekday, card.weekdays);
  if (runsTonight(card, weekday)) {
    return {
      tonight: true,
      tag: 'Tonight',
      blurb: `Karaoke starts at ${KARAOKE_START} tonight.`,
      daysAway,
    };
  }
  const when = karaokeNightLabel(weekday, daysAway);
  return {
    tonight: false,
    tag: daysAway === 1 ? 'Tomorrow' : when,
    blurb: `Next karaoke night is ${when} at ${KARAOKE_START}.`,
    daysAway,
  };
}
