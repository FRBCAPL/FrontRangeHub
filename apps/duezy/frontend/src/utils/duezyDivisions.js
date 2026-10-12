/**
 * Divisions for Duezy. A "unit" is what dues are tracked against: a division in a multi-division
 * league, or the league itself (id: null) when it has a single division.
 */
import { round2, teamsBehind, weekSummary, weeklyDues } from './duezyMath.js';

export const DIVISION_SETTING_KEYS = ['play_day', 'dues_amount', 'dues_basis', 'players_per_match', 'total_weeks', 'current_week'];

export const isMultiDivision = (league, divisions = []) => Boolean(league?.multi_division && divisions.length);

export function divisionUnits(league, divisions = []) {
  if (!league) return [];
  if (isMultiDivision(league, divisions)) return divisions;
  const unit = { id: null, name: league.name };
  DIVISION_SETTING_KEYS.forEach((k) => { unit[k] = league[k]; });
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

export function unitStats(unit, teams, paymentIndex, isFirst = false) {
  const unitTeams = teamsInUnit(teams, unit, isFirst);
  const week = unitWeek(unit);
  const dues = weeklyDues(unit);
  return {
    unit,
    teams: unitTeams,
    week,
    dues,
    summary: weekSummary(unitTeams, week, dues, paymentIndex),
    behind: teamsBehind(unitTeams, week, dues, paymentIndex),
  };
}

const SUMMARY_KEYS = ['paid', 'partial', 'bye', 'unpaid', 'collected', 'expected'];

/** Every division at its own current week, plus combined totals and one "who's behind" list. */
export function allDivisionsStats(units, teams, paymentIndex) {
  const per = units.map((u, i) => unitStats(u, teams, paymentIndex, i === 0));
  const summary = Object.fromEntries(SUMMARY_KEYS.map((k) => [k, 0]));
  per.forEach((s) => SUMMARY_KEYS.forEach((k) => { summary[k] += s.summary[k]; }));
  summary.collected = round2(summary.collected);
  summary.expected = round2(summary.expected);
  const behind = per
    .flatMap((s) => s.behind.map((x) => ({ ...x, division: s.unit.name })))
    .sort((a, b) => b.owed - a.owed || a.team.name.localeCompare(b.team.name));
  return { per, summary, behind };
}

let draftSeq = 0;

/** Editable division in the wizard / settings, pre-filled from the league defaults. */
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
  };
}
