const WEEKDAYS = {
  1: 'Monday',
  2: 'Tuesday',
  3: 'Wednesday',
  4: 'Thursday',
  5: 'Friday',
  6: 'Saturday',
  7: 'Sunday',
};

export const USAPL_LEAGUE_NUMBER_HINT =
  'Front Range numbers: which division that day (1=first), weekday (Wed=3, Sun=7), 8=8-ball / 0=10-ball, year (6=2026), session (1=first). Double play pairs look like 13861/13061.';

function ordinal(n) {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export function parseUsaplLeagueNumber(code) {
  const digits = String(code || '').replace(/\D/g, '');
  if (digits.length !== 5) return null;
  const divisionOfDay = Number(digits[0]);
  const weekdayIndex = Number(digits[1]);
  const gameDigit = Number(digits[2]);
  const yearDigit = Number(digits[3]);
  const session = Number(digits[4]);
  const weekday = WEEKDAYS[weekdayIndex];
  if (!weekday) return null;
  const format = gameDigit === 0 ? '10-ball' : gameDigit === 8 ? '8-ball' : `${gameDigit}-ball`;
  return {
    code: digits,
    divisionOfDay,
    weekday,
    weekdayIndex,
    format,
    gameDigit,
    year: 2020 + yearDigit,
    session,
  };
}

export function parseUsaplLeaguePair(value) {
  const parts = String(value || '')
    .split(/[/,]|and/i)
    .map((part) => part.trim())
    .filter(Boolean);
  const codes = parts.map(parseUsaplLeagueNumber).filter(Boolean);
  if (!codes.length) return null;
  const first = codes[0];
  return {
    codes,
    pairLabel: codes.map((row) => row.code).join(' / '),
    weekday: first.weekday,
    year: first.year,
    session: first.session,
    divisionOfDay: first.divisionOfDay,
    summary: `${ordinal(first.divisionOfDay)} ${first.weekday} · ${first.year} session ${first.session}`,
  };
}

export function usaplDivisionLeagueNumbers(division) {
  return parseUsaplLeaguePair(division?.leagueNumbers || '');
}
