import { sortUsaplDivisionsByPlayDay, usaplDivisionIsInSession, usaplDivisionSignupOpen } from './usaplDivisions.js';
import { parseUsaplFormat } from './usaplFormat.js';

export function usaplDivisionIsPast(division) {
  return division?.archived === true;
}

/** Fargo reports and winners belong to a finished or currently playing session — not a signup placeholder. */
export function usaplDivisionShowsSessionStats(division) {
  if (!division) return false;
  if (usaplDivisionIsPast(division)) return true;
  const hasNumbers = Boolean(String(division.leagueNumbers || '').trim());
  if (usaplDivisionSignupOpen(division) && !hasNumbers) return false;
  return usaplDivisionIsInSession(division);
}

function formatLabel(choice, other) {
  if (choice === 'Other') return String(other || '').trim();
  return String(choice || '').trim();
}

export function usaplDivisionWinners(division) {
  const a = String(division?.winnerTeam || '').trim();
  const b = String(division?.winnerTeamB || '').trim();
  const parsed = parseUsaplFormat(division?.format);
  if (parsed.playType === 'double') {
    const rows = [];
    if (a) rows.push({ format: formatLabel(parsed.formatA, parsed.formatOtherA) || 'Format 1', team: a });
    if (b) rows.push({ format: formatLabel(parsed.formatB, parsed.formatOtherB) || 'Format 2', team: b });
    return rows;
  }
  if (a) return [{ format: '', team: a }];
  if (b) return [{ format: '', team: b }];
  return [];
}

export function usaplDivisionSessionYear(division) {
  const iso = String(division?.lastWeek || division?.playStarts || '').slice(0, 4);
  const year = Number(iso);
  return Number.isFinite(year) && year >= 1990 ? year : 0;
}

export function groupUsaplPastDivisions(list) {
  const past = sortUsaplDivisionsByPlayDay((list || []).filter(usaplDivisionIsPast));
  const byYear = new Map();
  past.forEach((row) => {
    const year = usaplDivisionSessionYear(row) || 0;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(row);
  });
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, divisions]) => ({
      year,
      label: year ? String(year) : 'Session TBD',
      divisions,
    }));
}

export function formatUsaplSessionRange(division) {
  const start = String(division?.playStarts || '').slice(0, 10);
  const end = String(division?.lastWeek || '').slice(0, 10);
  const pretty = (iso) => {
    if (!iso) return '';
    try {
      return new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  };
  if (start && end) return `${pretty(start)} – ${pretty(end)}`;
  return pretty(end) || pretty(start);
}
