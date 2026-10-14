/** Division picker grouped by night: one pill per play day, each opening its divisions. */
import { DAYS } from '../data/duezyOptions.js';

export const NO_DAY = 'other';

/** [{ key, label, short, divisions }] in week order (Mon→Sun); divisions without a night go last. */
export function divisionsByDay(divisions) {
  const groups = new Map();
  (divisions || []).forEach((d) => {
    const day = DAYS.includes(d.play_day) ? d.play_day : NO_DAY;
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day).push(d);
  });
  const order = [...DAYS, NO_DAY];
  return [...groups.entries()]
    .sort(([a], [b]) => order.indexOf(a) - order.indexOf(b))
    .map(([key, list]) => ({
      key,
      label: key === NO_DAY ? 'Other nights' : `${key}s`,
      short: key === NO_DAY ? 'Other' : key.slice(0, 3),
      divisions: list,
    }));
}

/** "Tuesday 8-Ball" on the Tuesday pill → "8-Ball". Leaves the name alone if nothing would be left. */
export function nameWithoutDay(name, day) {
  const text = String(name || '').trim();
  if (!DAYS.includes(day)) return text;
  const pattern = new RegExp(`^(?:${day}s?|${day.slice(0, 3)})\\b\\.?[\\s:·,-]*`, 'i');
  const rest = text.replace(pattern, '').trim();
  return rest || text;
}

export const dayBehind = (group, behindCounts = {}) => group.divisions.reduce((n, d) => n + (behindCounts[d.id] || 0), 0);
