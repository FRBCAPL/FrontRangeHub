import { SHOP_TIME_ZONE, shopParts, shopTime } from './consignmentTimeZone.js';

/** Default auction length; sellers pick from AUCTION_DAY_CHOICES (late bids can still extend it). */
export const AUCTION_DAYS = 7;
export const AUCTION_DAY_CHOICES = [7, 14];
/** Colorado hour every auction ends (24h); admins can change it in Settings (consignment_settings.auction_end_hour). */
export const DEFAULT_AUCTION_END_HOUR = 20;

export function normalizeAuctionDays(days) {
  const n = Number(days);
  return AUCTION_DAY_CHOICES.includes(n) ? n : AUCTION_DAYS;
}

export function auctionEndHour(settings) {
  const n = Number(settings?.auction_end_hour);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : DEFAULT_AUCTION_END_HOUR;
}

/** "8 PM", "12 PM", "12 AM". */
export function formatEndHour(hour) {
  const h = Number(hour);
  return `${h % 12 || 12} ${h < 12 ? 'AM' : 'PM'}`;
}

/** Which choice a past auction used: the nearest one, since late-bid extensions and the end-hour snap shift it by hours. */
export function auctionLengthDays(auction) {
  const days = (new Date(auction?.ends_at) - new Date(auction?.starts_at)) / 86400000;
  if (!(days > 0)) return AUCTION_DAYS;
  return AUCTION_DAY_CHOICES.reduce((best, d) => (Math.abs(d - days) < Math.abs(best - days) ? d : best));
}

/** Mirrors consignment_auction_end(): the Colorado date `days` after `start`, at `endHour` Colorado time. */
export function auctionEndFrom(start = new Date(), days = AUCTION_DAYS, endHour = DEFAULT_AUCTION_END_HOUR) {
  const p = shopParts(start);
  return shopTime(p.year, p.month, p.day + Number(days), Number(endHour));
}

/** Value for <input type="datetime-local"> in Colorado time. */
export function toLocalInputValue(date) {
  if (!date) return '';
  const p = shopParts(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: SHOP_TIME_ZONE, timeZoneName: 'short',
  });
}

/** Compact end time for cards: "Oct 18, 7:30 PM MDT" (a weekday alone is ambiguous for 7-day auctions). */
export function formatShortEnd(value) {
  if (!value) return '';
  return new Date(value).toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    timeZone: SHOP_TIME_ZONE, timeZoneName: 'short',
  });
}

/** "3d 4h", "4h 12m", "12:05" (under an hour), or "Ended". */
export function formatCountdown(ms) {
  if (!(ms > 0)) return 'Ended';
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
