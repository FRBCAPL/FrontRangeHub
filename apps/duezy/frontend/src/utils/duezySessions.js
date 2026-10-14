/**
 * "Start next session" for one or more divisions. Each picked division gets a fresh division row in the same
 * league (settings copied, new dates, returning teams copied); the old row is archived with its teams,
 * payments, make-ups and history, and stays viewable as a past session.
 */
import { teamsInUnit } from './duezyDivisions.js';
import { addDays, isISODate, todayISO, weekDates, weekdayOf } from './duezySchedule.js';
import { cleanSessionLabel } from './duezyTerms.js';

const SEASONS = ['Winter', 'Spring', 'Summer', 'Fall'];

/** "Fall 2026" → "Winter 2027", "Spring 2026" → "Summer 2026", "Session 3" → "Session 4", "2026" → "2027"; null if none. */
export function bumpSeason(text) {
  const base = String(text || '').trim();
  const season = base.match(/\b(Winter|Spring|Summer|Fall|Autumn)\b(\s+)(\d{4})\b/i);
  if (season) {
    const i = season[1].toLowerCase() === 'autumn' ? 3 : SEASONS.findIndex((s) => s.toLowerCase() === season[1].toLowerCase());
    const year = Number(season[3]) + (i === 3 ? 1 : 0);
    return base.replace(season[0], `${SEASONS[(i + 1) % 4]}${season[2]}${year}`);
  }
  const numbered = base.match(/\b(Session|Season|Term|Round|Part)(\s+)(\d+)\b/i);
  if (numbered) return base.replace(numbered[0], `${numbered[1]}${numbered[2]}${Number(numbered[3]) + 1}`);
  const year = base.match(/\b(20\d{2})\b/);
  if (year) return base.replace(year[0], String(Number(year[1]) + 1));
  return null;
}

/** Next session's label: bumped from this one, or '' to fill in. */
export const nextSessionLabel = (label) => cleanSessionLabel(bumpSeason(label) || '');

/** A week after the division's last night, never in the past; '' when it had no dates. */
export function suggestedStart(unit, today = todayISO()) {
  const dates = weekDates(unit);
  if (!dates?.length) return '';
  let next = addDays(dates[dates.length - 1], 7);
  while (next < today) next = addDays(next, 7);
  return next;
}

const copyTeam = (t) => ({
  sourceId: t.id,
  name: t.name,
  captain: t.captain || null,
  contact: t.contact || null,
  players: Array.isArray(t.players) ? t.players.filter(Boolean) : [],
  include: true,
});

/** One editable draft per division; only the ones in `picked` start ticked (all when picked is empty). */
export function sessionDrafts(divisions = [], teams = [], picked = [], today = todayISO()) {
  return divisions.map((unit, i) => ({
    key: unit.id,
    fromName: unit.name,
    fromLabel: String(unit.session_label || '').trim(),
    include: !picked.length || picked.includes(unit.id),
    name: unit.name || '',
    session_label: nextSessionLabel(unit.session_label),
    play_day: unit.play_day || null,
    dues_amount: unit.dues_amount ?? '',
    dues_basis: unit.dues_basis || 'team',
    total_weeks: unit.total_weeks ?? 12,
    start_date: suggestedStart(unit, today),
    teams: teamsInUnit(teams, unit, i === 0).map(copyTeam),
    newText: '',
  }));
}

/** Draft → one item for duezy_start_sessions. Old skip dates are dropped; the night follows the new start date. */
export function draftToItem(draft, extraTeams = []) {
  const start = isISODate(draft.start_date) ? draft.start_date : null;
  const division = {
    name: String(draft.name || '').trim().slice(0, 60),
    session_label: cleanSessionLabel(draft.session_label) || null,
    play_day: start ? weekdayOf(start) : draft.play_day || null,
    dues_amount: Number(draft.dues_amount) || 0,
    total_weeks: Number(draft.total_weeks) || 12,
    start_date: start,
    skip_dates: [],
  };
  const teams = [...draft.teams.filter((t) => t.include), ...extraTeams].map((t) => ({
    name: String(t.name || '').trim(), captain: t.captain || null, contact: t.contact || null, players: t.players || [],
  })).filter((t) => t.name);
  return { from_division_id: draft.key, division, teams };
}

/** Problems that block "Start": [] when ready. */
export function sessionProblems(drafts) {
  const kept = drafts.filter((d) => d.include);
  const out = [];
  if (!kept.length) out.push('Pick at least one division.');
  kept.forEach((d) => {
    if (!String(d.name || '').trim()) out.push('Every division needs a name.');
    else if (!(Number(d.dues_amount) > 0)) out.push(`${d.name}: set the dues.`);
    else if (!(Number(d.total_weeks) > 0)) out.push(`${d.name}: set the number of weeks.`);
  });
  return [...new Set(out)];
}

/** True once a division's session is over (all nights played, or on its last week when undated). */
export function sessionIsOver(unit, today = todayISO()) {
  if (!unit) return false;
  const dates = weekDates(unit);
  if (dates?.length) return dates[dates.length - 1] < today;
  return Number(unit.current_week) >= Number(unit.total_weeks);
}
