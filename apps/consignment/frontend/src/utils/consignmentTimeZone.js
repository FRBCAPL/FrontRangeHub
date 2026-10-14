/** The shop is Legends in Colorado Springs: every date the app shows or reads is Mountain time. */
export const SHOP_TIME_ZONE = 'America/Denver';

const partsFormat = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOP_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** What a Colorado wall clock shows at `date`: { year, month (1-12), day, hour, minute, second }. */
export function shopParts(date = new Date()) {
  const out = {};
  for (const p of partsFormat.formatToParts(new Date(date))) {
    if (p.type !== 'literal') out[p.type] = Number(p.value);
  }
  return out;
}

function offsetMs(utcMs) {
  const p = shopParts(utcMs);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(utcMs / 1000) * 1000;
}

/** The moment a Colorado wall clock reads this date and time. Day/month overflow rolls over like Date.UTC. */
export function shopTime(year, month, day, hour = 0, minute = 0, second = 0) {
  const wall = Date.UTC(year, month - 1, day, hour, minute, second);
  const guess = wall - offsetMs(wall);
  return new Date(wall - offsetMs(guess));
}

/** "YYYY-MM-DD" for the Colorado calendar day containing `date`. */
export function shopDateKey(date = new Date()) {
  const p = shopParts(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Same Colorado time of day, `days` calendar days later (7:30 PM stays 7:30 PM across a clock change). */
export function addShopDays(date, days) {
  const p = shopParts(date);
  return shopTime(p.year, p.month, p.day + Number(days), p.hour, p.minute, p.second);
}
