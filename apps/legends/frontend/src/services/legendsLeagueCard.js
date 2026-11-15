import { venueDateKey } from './legendsClock.js';
import { buildLiveView, matchesStillOn } from './legendsLive.js';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function dateFromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** "tomorrow" or "Tuesday, Nov 17" for a YYYY-MM-DD key, relative to today at the venue. */
function nightLabel(key, now) {
  const tomorrow = dateFromKey(venueDateKey(now));
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (key === tomorrow.toISOString().slice(0, 10)) return 'tomorrow';
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long', month: 'short', day: 'numeric' }).format(dateFromKey(key));
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 'es'}`;

function earliestStart(matches) {
  const timed = matches.filter((match) => match.startTime && match.status === 'scheduled');
  if (timed.length === 0) return null;
  return timed.reduce((a, b) => (a.startTime <= b.startTime ? a : b)).when;
}

function nextNightCopy(next, now) {
  if (!next || !DATE_PATTERN.test(next.date ?? '') || next.date <= venueDateKey(now)) return null;
  const when = nightLabel(next.date, now);
  const time = next.startLabel && next.startLabel !== 'TBA' ? ` at ${next.startLabel}` : '';
  const count = next.matchCount > 0 ? ` ${plural(next.matchCount, 'match')} on the schedule.` : '';
  return `Next league night is ${when}${time}.${count}`;
}

function daysFromToday(dateKey, now) {
  if (!DATE_PATTERN.test(dateKey ?? '')) return null;
  const today = dateFromKey(venueDateKey(now));
  const then = dateFromKey(dateKey);
  return Math.round((then - today) / 86400000);
}

/** Badge text for an upcoming league night: "Monday", etc. */
function nextNightTag(dateKey, now) {
  if (!DATE_PATTERN.test(dateKey ?? '') || dateKey <= venueDateKey(now)) return null;
  return new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(dateFromKey(dateKey));
}

/**
 * What the Legends Regulars league card says, from CueSync:
 * tonight's matches, else the next league night, else a plain fallback.
 * `tonight` is true only when CueSync shows league play today.
 * `daysAway` is how soon the next league night is (0 = tonight), for card order.
 */
export function leagueCardState(summary, now) {
  const live = buildLiveView(summary, now);
  if (!live) return { tonight: false, tag: null, blurb: null, daysAway: null };

  const leagueMatches = live.matches.filter((match) => match.kind === 'league');
  const stillOn = matchesStillOn(leagueMatches);
  if (stillOn.length > 0 || (live.leaguePlayNow && leagueMatches.length === 0)) {
    const start = earliestStart(stillOn);
    const blurb = stillOn.length > 0
      ? `${plural(stillOn.length, 'league match')} tonight${start ? `, starting at ${start}` : ''}.`
      : 'League play is on the tables tonight.';
    return { tonight: true, tag: 'Tonight', blurb, daysAway: 0 };
  }

  const nextDate = summary.nextLeagueNight?.date;
  const daysAway = daysFromToday(nextDate, now);
  const next = nextNightCopy(summary.nextLeagueNight, now);
  if (leagueMatches.length > 0) {
    return {
      tonight: false,
      tag: null,
      blurb: `League play is finished for tonight.${next ? ` ${next}` : ''}`,
      daysAway,
    };
  }
  if (next) return { tonight: false, tag: nextNightTag(nextDate, now), blurb: next, daysAway };
  if (!('nextLeagueNight' in summary)) return { tonight: false, tag: null, blurb: null, daysAway: null };
  return { tonight: false, tag: null, blurb: 'No league nights are on the schedule yet.', daysAway: null };
}
