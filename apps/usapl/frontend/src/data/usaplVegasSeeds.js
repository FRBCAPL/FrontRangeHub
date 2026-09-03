import { parseUsaplFormat } from './usaplFormat.js';
import { USAPL_VEGAS_CUP } from './usaplVegasCup.js';
import { usaplDivisionLeagueNumbers } from './usaplLeagueNumbers.js';
import {
  usaplDivisionIsPast,
  usaplDivisionSessionYear,
  usaplDivisionWinners,
} from './usaplPastDivisions.js';

function inVegasYear(division, year) {
  const sessionYear = usaplDivisionSessionYear(division);
  return !sessionYear || sessionYear === year;
}

export function normalizeUsaplTeamKey(name) {
  return String(name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function formatUsaplWinnerName(name, wins = 1) {
  const team = String(name || '').trim();
  if (!team) return '';
  return wins > 1 ? `${team} (${wins})` : team;
}

export function formatUsaplVegasSeedNote(stats) {
  if (!stats) return '';
  if (stats.eligible === false) return ' · not eligible for Vegas Cup';
  if (stats.seedLabel) return ` · ${stats.seedLabel} Vegas seed`;
  return '';
}

function titleLabel(division, row, index) {
  const league = usaplDivisionLeagueNumbers(division);
  const code = league?.codes?.[index]?.code || league?.pairLabel || division.shortName || division.name;
  return row.format ? `${code} ${row.format}` : String(code || '').trim();
}

function divisionNumber(division, index) {
  const league = usaplDivisionLeagueNumbers(division);
  return String(league?.codes?.[index]?.code || league?.pairLabel || '').trim();
}

function ineligibleReasonMap(rows) {
  const reasons = new Map();
  (rows || []).forEach((row) => {
    const key = normalizeUsaplTeamKey(row.teamName || row.name);
    if (!key) return;
    reasons.set(key, String(row.reason || 'No longer active').trim() || 'No longer active');
  });
  return reasons;
}

function rankEligible(rows) {
  let place = 0;
  let prevWins = null;
  let seed = 0;
  return rows.map((row) => {
    place += 1;
    if (row.wins !== prevWins) {
      seed = place;
      prevWins = row.wins;
    }
    const tied = rows.filter((other) => other.wins === row.wins).length > 1;
    return {
      ...row,
      eligible: true,
      seed,
      seedLabel: tied ? `T-${seed}` : `#${seed}`,
      displayName: formatUsaplWinnerName(row.name, row.wins),
    };
  });
}

export function usaplVegasSeedResult(list, year = USAPL_VEGAS_CUP.year, ineligibleRows = []) {
  const blocked = ineligibleReasonMap(ineligibleRows);
  const counts = new Map();
  (list || []).filter((division) => inVegasYear(division, year)).forEach((division) => {
    usaplDivisionWinners(division).forEach((row, index) => {
      const key = normalizeUsaplTeamKey(row.team);
      if (!key) return;
      const title = titleLabel(division, row, index);
      const number = divisionNumber(division, index);
      const current = counts.get(key);
      if (current) {
        current.wins += 1;
        if (title) current.titles.push(title);
        if (number) current.numbers.push(number);
      } else {
        counts.set(key, {
          key,
          name: String(row.team).trim(),
          wins: 1,
          titles: title ? [title] : [],
          numbers: number ? [number] : [],
        });
      }
    });
  });

  const byWins = (a, b) => (b.wins !== a.wins ? b.wins - a.wins : a.name.localeCompare(b.name));
  const eligible = [];
  const ineligible = [];
  [...counts.values()].sort(byWins).forEach((row) => {
    if (blocked.has(row.key)) {
      ineligible.push({
        ...row,
        eligible: false,
        seed: null,
        seedLabel: 'DQ',
        reason: blocked.get(row.key),
        displayName: formatUsaplWinnerName(row.name, row.wins),
      });
    } else {
      eligible.push(row);
    }
  });

  return {
    board: rankEligible(eligible),
    ineligible,
  };
}

export function usaplVegasSeedBoard(list, year = USAPL_VEGAS_CUP.year, ineligibleRows = []) {
  return usaplVegasSeedResult(list, year, ineligibleRows).board;
}

export function usaplVegasPendingSlots(list, year = USAPL_VEGAS_CUP.year) {
  const slots = [];
  (list || []).filter((division) => usaplDivisionIsPast(division) && inVegasYear(division, year)).forEach((division) => {
    const parsed = parseUsaplFormat(division.format);
    const league = usaplDivisionLeagueNumbers(division);
    const fallback = division.shortName || division.name || 'Division';
    const a = String(division.winnerTeam || '').trim();
    const b = String(division.winnerTeamB || '').trim();
    const formatA = parsed.formatA === 'Other' ? (parsed.formatOtherA || '8-ball') : (parsed.formatA || '8-ball');
    const formatB = parsed.formatB === 'Other' ? (parsed.formatOtherB || '10-ball') : (parsed.formatB || '10-ball');
    if (!a) {
      slots.push({
        key: `${division.id}-a`,
        label: `${league?.codes?.[0]?.code || fallback} · ${parsed.playType === 'double' ? formatA : (formatA || 'winner')}`,
      });
    }
    if (parsed.playType === 'double' && !b) {
      slots.push({
        key: `${division.id}-b`,
        label: `${league?.codes?.[1]?.code || league?.pairLabel || fallback} · ${formatB}`,
      });
    }
  });
  return slots;
}

export function usaplVegasSeedByTeam(board) {
  return new Map((board || []).map((row) => [row.key, row]));
}

function tickerSeedNote(row) {
  if (row?.eligible === false) return 'not eligible';
  if (row?.seedLabel) return `${row.seedLabel} seed`;
  return '';
}

export function usaplWinnerTickerItems(teams = []) {
  return (teams || [])
    .filter((row) => row?.name)
    .map((row) => {
      const numbers = (row.numbers || []).filter(Boolean);
      const seed = tickerSeedNote(row);
      return {
        key: row.key || normalizeUsaplTeamKey(row.name),
        text: [row.name, ...numbers, seed].filter(Boolean).join(' · '),
      };
    });
}
