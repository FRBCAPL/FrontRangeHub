const DAY_MS = 24 * 60 * 60 * 1000;

export function parseUsaplYmd(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

export function formatUsaplYmd(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatUsaplWeekday(value) {
  const date = value instanceof Date ? value : parseUsaplYmd(value);
  if (!date) return '';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function usaplEndDateFromWeeks(startYmd, weeks) {
  const start = parseUsaplYmd(startYmd);
  const count = Number.parseInt(String(weeks || ''), 10);
  if (!start || !Number.isInteger(count) || count < 1) return '';
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + (count - 1) * 7);
  return formatUsaplYmd(end);
}

export function usaplWeeksFromDates(startYmd, endYmd) {
  const start = parseUsaplYmd(startYmd);
  const end = parseUsaplYmd(endYmd);
  if (!start || !end) return 0;
  const days = Math.round((end.getTime() - start.getTime()) / DAY_MS);
  if (days < 0) return 0;
  return Math.floor(days / 7) + 1;
}
