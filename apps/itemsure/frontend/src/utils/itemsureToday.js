// The home page "Today" list: what needs doing, most urgent first, one action each.
import { displayQuantity, wholeToBuy } from './itemsureQuantity.js';

export const MAX_LOW_SHOWN = 5;
const OPEN_COUNT = ['draft', 'in_progress'];

const qty = (text, unit) => `${displayQuantity(text)} ${unit || ''}`.trim();
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const placeOf = (r) => (r.area_name ? `${r.location_name} \u00b7 ${r.area_name}` : r.location_name);

/** What to do about one low item: a move if one covers it, otherwise how many to buy. */
function fixFor(rec, showMoves) {
  const move = showMoves ? (rec.transfers || []).find((t) => !t.hidden) : null;
  if (move) {
    const from = move.same_location ? move.area_name || 'loose stock' : move.location_name;
    return `Move ${qty(move.quantity, rec.unit_symbol)} from ${from}`;
  }
  const buy = showMoves ? rec.external ?? rec.external_at_most ?? rec.need : rec.need;
  return buy !== null && buy !== undefined && displayQuantity(buy) !== '0' ? `Buy ${qty(wholeToBuy(buy), rec.unit_symbol)}` : null;
}

/**
 * Builds the list. Each task: { key, tone ('danger'|'warn'|'info'), title, detail, to, button }.
 * `paths` holds the page links so this stays free of routing. Missing data (null) is skipped.
 */
export function buildTodayTasks({ recs = null, plans = null, sessions = null, reviews = {}, canApprove = false, showMoves = true, paths }) {
  const tasks = [];

  const low = (recs || []).filter((r) => r.status === 'low');
  for (const r of low.slice(0, MAX_LOW_SHOWN)) {
    const fix = fixFor(r, showMoves);
    tasks.push({
      key: `low:${r.target_id}`,
      tone: 'danger',
      title: `${r.item_name} is running low`,
      detail: `${placeOf(r)}: ${qty(r.on_hand ?? '0', r.unit_symbol)} left${fix ? `. ${fix}.` : '.'}`,
      to: paths.item(r.item_id),
      button: 'Open',
    });
  }
  if (low.length > MAX_LOW_SHOWN) {
    const more = low.length - MAX_LOW_SHOWN;
    tasks.push({ key: 'low:more', tone: 'danger', title: `${plural(more, 'more item', 'more items')} running low`, detail: 'See them all on the shopping list.', to: paths.shopping, button: 'Shopping list' });
  }

  const topUp = (recs || []).filter((r) => r.status === 'below_par');
  if (topUp.length) {
    tasks.push({
      key: 'topup',
      tone: 'warn',
      title: `${plural(topUp.length, 'item needs', 'items need')} topping up`,
      detail: 'Below their "Fill up to" number, but not low yet.',
      to: paths.shopping,
      button: 'Shopping list',
    });
  }

  if (showMoves && plans?.length) {
    tasks.push({
      key: 'plans',
      tone: 'info',
      title: `${plural(plans.length, 'planned move', 'planned moves')} to finish`,
      detail: 'Mark them done once the stock has been moved.',
      to: paths.shopping,
      button: 'Finish',
    });
  }

  for (const s of sessions || []) {
    if (OPEN_COUNT.includes(s.status)) {
      tasks.push({ key: `count:${s.id}`, tone: 'info', title: `Count in progress: ${s.name}`, detail: 'Pick up where you left off.', to: paths.count(s.id), button: 'Continue' });
    } else if (canApprove && s.status === 'submitted' && !reviews[s.id]) {
      tasks.push({ key: `review:${s.id}`, tone: 'warn', title: `Count waiting for approval: ${s.name}`, detail: 'Check the differences, then approve or reject.', to: paths.review(s.id), button: 'Review' });
    }
  }

  return tasks;
}
