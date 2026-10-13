/**
 * Divisions for Duezy.
 *   League   = the organization (name, sport, payment note, default grace, timezone).
 *   Division = teams on one schedule (night, dates, dues, weeks, current week). Every league has at least one.
 * A "unit" is what dues are tracked against — a division. Leagues created before
 * duezy-one-division SQL may have no division rows; then the league itself acts as one (id: null).
 */
import { matchesToSave, owedThrough, round2, seasonSummary, teamsBehind, unpaidWeeks, weekSummary, weeklyDues } from './duezyMath.js';
import { currentWeekOn, lateThroughOn, scheduleToSave, shortDate, todayISO, weekDates } from './duezySchedule.js';

export const DIVISION_SETTING_KEYS = ['play_day', 'dues_amount', 'dues_basis', 'players_per_match', 'matches_per_night', 'total_weeks', 'current_week'];
const SCHEDULE_KEYS = ['start_date', 'skip_dates', 'grace_days'];

export const isMultiDivision = (league, divisions = []) => Boolean(league?.multi_division && divisions.length);

export function divisionUnits(league, divisions = []) {
  if (!league) return [];
  if (isMultiDivision(league, divisions)) return divisions;
  const unit = { id: null, name: league.name };
  [...DIVISION_SETTING_KEYS, ...SCHEDULE_KEYS].forEach((k) => { unit[k] = league[k]; });
  return [unit];
}

export function unitWeek(unit) {
  const total = Math.max(1, Number(unit?.total_weeks) || 1);
  return Math.max(1, Math.min(Number(unit?.current_week) || 1, total));
}

/** Teams in a unit. Teams without a division (shouldn't happen once multi) show in the first division. */
export function teamsInUnit(teams, unit, isFirst = false) {
  if (!unit?.id) return teams;
  return teams.filter((t) => t.division_id === unit.id || (isFirst && !t.division_id));
}

/**
 * Where a unit is in its season. With a start date the week follows the calendar and a week is late once
 * night + grace days has passed; without one the week is set by hand and every week before it is late.
 */
export function unitSchedule(unit, { today = todayISO(), defaultGrace = 0 } = {}) {
  const dates = weekDates(unit);
  const grace = unit.grace_days ?? defaultGrace ?? 0;
  if (!dates) {
    const currentWeek = unitWeek(unit);
    return { dates: null, grace, started: true, currentWeek, lateThrough: currentWeek - 1, label: (w) => `week ${w}` };
  }
  return {
    dates,
    grace,
    started: dates[0] <= today,
    currentWeek: currentWeekOn(dates, today),
    lateThrough: lateThroughOn(dates, today, grace),
    label: (w) => (dates[w - 1] ? shortDate(dates[w - 1]) : `week ${w}`),
  };
}

/** "Oct 6, Oct 13, Oct 20 +2 more" — the first few nights, then a count. */
export function shortNights(nights = [], max = 3) {
  if (nights.length <= max) return nights.join(', ');
  return `${nights.slice(0, max).join(', ')} +${nights.length - max} more`;
}

/** "Aug 12 (week 1), Oct 7 (week 9)" — or "week 1, week 9" when the division has no dates. */
export function nightsWithWeeks(weeks, { dates, label }) {
  return weeks.map((w) => (dates?.[w - 1] ? `${label(w)} (week ${w})` : `week ${w}`)).join(', ');
}

/** One team's money right now: late (past grace), due (not late yet), and which nights are late. */
export function teamBalance(teamId, schedule, dues, paymentIndex) {
  const { started, currentWeek, lateThrough, label } = schedule;
  const late = owedThrough(teamId, lateThrough, dues, paymentIndex);
  const due = Math.max(0, owedThrough(teamId, started ? currentWeek : 0, dues, paymentIndex) - late);
  const lateNights = late > 0 ? unpaidWeeks(teamId, lateThrough, dues, paymentIndex).map(label) : [];
  return {
    late,
    due: round2(due),
    lateNights,
    lateWhen: lateNights.join(', '),
    dueWhen: due > 0 ? label(currentWeek) : '',
  };
}

/**
 * One unit's numbers. `behind` = late teams only (with the nights they missed);
 * `dueTotal` = owed for nights that aren't late yet. `viewWeek` only changes the week being shown.
 */
export function unitStats(unit, teams, paymentIndex, isFirst = false, opts = {}) {
  const unitTeams = teamsInUnit(teams, unit, isFirst);
  const dues = weeklyDues(unit);
  const schedule = unitSchedule(unit, opts);
  const { currentWeek, lateThrough, started, label } = schedule;
  const total = Math.max(1, Number(unit.total_weeks) || 1);
  const week = Math.max(1, Math.min(Number(opts.viewWeek) || currentWeek, total));
  const behind = teamsBehind(unitTeams, lateThrough, dues, paymentIndex).map((x) => {
    const weeks = unpaidWeeks(x.team.id, lateThrough, dues, paymentIndex);
    return { ...x, when: weeks.map(label).join(', '), nights: nightsWithWeeks(weeks, schedule) };
  });
  const dueThrough = started ? currentWeek : 0;
  const dueTotal = unitTeams.reduce(
    (s, t) => s + Math.max(0, owedThrough(t.id, dueThrough, dues, paymentIndex) - owedThrough(t.id, lateThrough, dues, paymentIndex)),
    0
  );
  return {
    unit,
    teams: unitTeams,
    week,
    dues,
    schedule,
    summary: weekSummary(unitTeams, week, dues, paymentIndex),
    season: seasonSummary(unitTeams, dueThrough, dues, total, paymentIndex),
    behind,
    dueTotal: round2(dueTotal),
  };
}

const SUMMARY_KEYS = ['paid', 'partial', 'bye', 'unpaid', 'collected', 'expected'];
const SEASON_KEYS = ['collected', 'expected', 'seasonValue', 'collectedAll'];

function sumKeys(rows, keys) {
  const out = Object.fromEntries(keys.map((k) => [k, 0]));
  rows.forEach((r) => keys.forEach((k) => { out[k] += r[k]; }));
  keys.forEach((k) => { out[k] = round2(out[k]); });
  return out;
}

/**
 * Every division at its own current week, plus combined totals and one "who's behind" list.
 * `summary` mixes each division's current week; `season` is season-to-date and is what the All view shows.
 */
export function allDivisionsStats(units, teams, paymentIndex, opts = {}) {
  const per = units.map((u, i) => unitStats(u, teams, paymentIndex, i === 0, { today: opts.today, defaultGrace: opts.defaultGrace }));
  const summary = sumKeys(per.map((s) => s.summary), SUMMARY_KEYS);
  const season = sumKeys(per.map((s) => s.season), SEASON_KEYS);
  const behind = per
    .flatMap((s) => s.behind.map((x) => ({ ...x, division: s.unit.name })))
    .sort((a, b) => b.owed - a.owed || a.team.name.localeCompare(b.team.name));
  const dueTotal = round2(per.reduce((s, x) => s + x.dueTotal, 0));
  return { per, summary, season, behind, dueTotal };
}

let draftSeq = 0;

/** Editable division in the wizard / settings, pre-filled from another division (or league defaults). */
export function newDivisionDraft(defaults = {}) {
  draftSeq += 1;
  return {
    key: `draft-${draftSeq}`,
    name: '',
    play_day: defaults.play_day || 'Tuesday',
    dues_amount: defaults.dues_amount ?? '',
    dues_basis: defaults.dues_basis || 'team',
    players_per_match: defaults.players_per_match ?? 4,
    total_weeks: defaults.total_weeks ?? 12,
    ...(defaults.start_date ? { start_date: defaults.start_date } : {}),
    ...(Number(defaults.matches_per_night) > 1 ? { matches_per_night: Number(defaults.matches_per_night) } : {}),
    teamsText: '',
  };
}

export const divisionReady = (d) => Boolean(String(d?.name || '').trim()) && Number(d.dues_amount) > 0 && Number(d.total_weeks) > 0;

/** Draft → database row (no id / league_id / teams). */
export function divisionToSave(d) {
  return {
    name: String(d.name).trim().slice(0, 60),
    play_day: d.play_day || null,
    dues_amount: Number(d.dues_amount) || 0,
    dues_basis: d.dues_basis === 'player' ? 'player' : 'team',
    players_per_match: Number(d.players_per_match) || 1,
    total_weeks: Number(d.total_weeks) || 12,
    ...matchesToSave(d),
    ...scheduleToSave(d),
  };
}
