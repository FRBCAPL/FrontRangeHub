/**
 * "Start next season": a new league built from an old one. Settings, divisions and teams carry over;
 * payments, weeks, make-ups, deposits and history stay with the old league.
 */
import { divisionToSave, divisionUnits, teamsInUnit } from './duezyDivisions.js';
import { addDays, isISODate, todayISO, weekDates, weekdayOf } from './duezySchedule.js';

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

/** Older databases without a season label: the season lives in the league name. */
export const nextSeasonName = (name) => (bumpSeason(name) || `${String(name || '').trim()} · next season`).slice(0, 80);

/** Next season's label: bumped from this one, or '' to fill in. */
export const nextSeasonLabel = (label) => (bumpSeason(label) || '').slice(0, 40);

/** League settings that carry over, only when the column exists (older databases simply skip them). */
const LEAGUE_COPY_KEYS = [
  'sport', 'play_day', 'dues_amount', 'dues_basis', 'players_per_match', 'matches_per_night', 'total_weeks',
  'payment_note', 'grace_days', 'timezone', 'pay_handles', 'payment_methods', 'default_method', 'reminder_intro',
  'reminder_signoff', 'season_word',
];

export function leagueCopyRow(league, name) {
  const row = { name: String(name || '').trim().slice(0, 80) };
  LEAGUE_COPY_KEYS.forEach((k) => { if (league?.[k] !== undefined) row[k] = league[k]; });
  return row;
}

/** A week after the old season's last night, never in the past; '' when the division had no dates. */
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

/** One editable draft per active division (or the league itself for old single-division leagues). */
export function seasonDrafts(league, divisions = [], teams = [], today = todayISO()) {
  return divisionUnits(league, divisions).map((unit, i) => ({
    key: unit.id || 'single',
    include: true,
    name: unit.name || league.name,
    play_day: unit.play_day || null,
    dues_amount: unit.dues_amount ?? '',
    dues_basis: unit.dues_basis || 'team',
    players_per_match: unit.players_per_match ?? 1,
    total_weeks: unit.total_weeks ?? 12,
    ...(unit.matches_per_night !== undefined ? { matches_per_night: unit.matches_per_night } : {}),
    ...(unit.grace_days !== undefined && unit.grace_days !== null && unit.id ? { grace_days: unit.grace_days } : {}),
    start_date: suggestedStart(unit, today),
    teams: teamsInUnit(teams, unit, i === 0).map(copyTeam),
    newText: '',
  }));
}

/** Draft → division row with its kept teams. Old skip dates are dropped; the night follows the new start date. */
export function draftToSave(draft, extraTeams = []) {
  const playDay = isISODate(draft.start_date) ? weekdayOf(draft.start_date) : draft.play_day;
  const row = divisionToSave({ ...draft, play_day: playDay, skip_dates: [] });
  const teams = [...draft.teams.filter((t) => t.include), ...extraTeams].map((t) => ({
    name: t.name, captain: t.captain || null, contact: t.contact || null, players: t.players || [],
  }));
  return { ...row, teams };
}

/** Problems that block "Create": [] when ready. */
export function seasonProblems(name, drafts) {
  const kept = drafts.filter((d) => d.include);
  const out = [];
  if (!String(name || '').trim()) out.push('Give the new season a name.');
  if (!kept.length) out.push('Keep at least one division.');
  kept.forEach((d) => {
    if (!String(d.name || '').trim()) out.push('Every division needs a name.');
    else if (!(Number(d.dues_amount) > 0)) out.push(`${d.name}: set the dues.`);
    else if (!(Number(d.total_weeks) > 0)) out.push(`${d.name}: set the number of weeks.`);
  });
  return [...new Set(out)];
}

/** True once every division's season is over (all nights played, or on its last week when undated). */
export function seasonIsOver(units, today = todayISO()) {
  if (!units.length) return false;
  return units.every((u) => {
    const dates = weekDates(u);
    if (dates?.length) return dates[dates.length - 1] < today;
    return Number(u.current_week) >= Number(u.total_weeks);
  });
}
