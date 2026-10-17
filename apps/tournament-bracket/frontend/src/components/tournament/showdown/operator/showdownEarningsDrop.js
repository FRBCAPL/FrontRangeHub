/**
 * Confirmation details for corrections that lower someone's earnings. The app does not record cash
 * handed out, so the operator is told exactly who would drop and by how much before confirming.
 */
import * as E from '../showdownEngine.js';
import { earningsTotals, earningsDrops } from '../showdownEarnings.js';
import { nameOf, money } from './showdownView.js';

export function earningsDropDetails(state, preview) {
  let next;
  try {
    next = preview();
  } catch {
    return [];
  }
  const drops = earningsDrops(earningsTotals(state), earningsTotals(next));
  if (!drops.length) return [];
  const list = drops.map((d) => `${nameOf(state, d.playerId)} ${money(d.before)} \u2192 ${money(d.after)}`).join(', ');
  return [
    `Earnings shown will go down for: ${list}.`,
    'If any of that money was already handed out, settle the difference with the player in person. The app does not track cash paid.',
  ];
}

export const previewReopenQualifying = (state) => () => E.reopenQualifying(state, 'RESET', {});
export const previewReopenShootout = (state) => () => E.reopenShootout(state, 'RESET', {});
export const previewUndoFrom = (state, matchId) => () => E.undoPlayoffFrom(state, matchId, 'RESET', {});
export const previewWithdraw = (state, playerId) => () => E.withdrawPlayer(state, playerId, {});
